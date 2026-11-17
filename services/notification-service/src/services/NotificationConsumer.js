
import RabbitMQ from '../config/rabbitmq.js';
import QueueConfig, { QUEUES } from '../config/queues.js';
import NotificationService from './NotificationService.js';

class NotificationConsumer {

    consumerTag = null;
    starting = false;
    stopping = false;

    constructor() {
        // Escuchar cada conexión nueva con RabbitMQ
        RabbitMQ.on('connected', () => {
            if (this.stopping) {
                return;
            }

            this.consumerTag = null;

            this.start().catch((error) => {
                console.error(
                    'Error iniciando consumidor de notificaciones:',
                    error.message
                );
            });
        });
    }

    async start() {
        if (this.starting || this.consumerTag || this.stopping) {
            return;
        }

        this.starting = true;

        try {
            const channel = RabbitMQ.getChannel();

            // Configurar cola y enlaces
            await QueueConfig.setup();

            // Procesar un mensaje a la vez
            await channel.prefetch(1);

            const result = await channel.consume(
                QUEUES.ORDER_NOTIFICATIONS,
                async (message) => {
                    if (!message) {
                        console.warn(
                            'Consumidor RabbitMQ cancelado'
                        );

                        this.consumerTag = null;
                        return;
                    }

                    try {
                        const event = JSON.parse(
                            message.content.toString()
                        );

                        // Validar tipo de evento
                        if (event.eventType !== 'order.confirmed') {
                            console.warn(
                                'Evento ignorado:',
                                event.eventType
                            );

                            channel.ack(message);
                            return;
                        }

                        const { eventId, data } = event;

                        // Validar información del evento
                        if (
                            !eventId ||
                            !data ||
                            !data.userId ||
                            !data.orderId ||
                            !data.recipientEmail ||
                            !data.type ||
                            !data.message
                        ) {
                            console.error(
                                'Evento recibido con información incompleta'
                            );

                            channel.nack(message, false, false);
                            return;
                        }

                        // Registrar notificación y enviar correo
                        const notification =
                            await NotificationService.createNotification({
                                event_id: eventId,
                                user_id: data.userId,
                                order_id: data.orderId,
                                recipient_email: data.recipientEmail,
                                type: data.type,
                                message: data.message
                            });

                        // Confirmar el evento después de procesarlo
                        channel.ack(message);

                        console.log(
                            `Notificación procesada para el pedido ${data.orderId}. Estado: ${notification.status}`
                        );

                    } catch (error) {
                        console.error(
                            'Error procesando evento RabbitMQ:',
                            error.message
                        );

                        try {
                            channel.nack(message, false, true);

                        } catch (ackError) {
                            console.error(
                                'No se pudo devolver el mensaje a RabbitMQ:',
                                ackError.message
                            );
                        }
                    }
                },
                {
                    noAck: false
                }
            );

            this.consumerTag = result.consumerTag;

            console.log(
                `Consumidor escuchando la cola ${QUEUES.ORDER_NOTIFICATIONS}`
            );

        } finally {
            this.starting = false;
        }
    }

    async stop() {
        this.stopping = true;

        if (!this.consumerTag) {
            return;
        }

        try {
            const channel = RabbitMQ.getChannel();

            await channel.cancel(this.consumerTag);

            console.log(
                'Consumidor de notificaciones detenido'
            );

        } catch (error) {
            console.warn(
                'No se pudo cancelar el consumidor:',
                error.message
            );

        } finally {
            this.consumerTag = null;
        }
    }
}

export default new NotificationConsumer();
