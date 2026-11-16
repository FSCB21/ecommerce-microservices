
import { randomUUID } from 'node:crypto';
import RabbitMQ from '../config/rabbitmq.js';

const EXCHANGE_NAME = 'ecommerce_events';

class EventPublisher {
    async publish(routingKey, payload) {
        if (!routingKey || typeof routingKey !== 'string') {
            throw new Error('La clave de enrutamiento es obligatoria');
        }

        if (!payload || typeof payload !== 'object') {
            throw new Error('El contenido del evento no es válido');
        }

        const channel = RabbitMQ.getChannel();

        const event = {
            eventId: randomUUID(),
            eventType: routingKey,
            occurredAt: new Date().toISOString(),
            data: payload
        };

        const message = Buffer.from(JSON.stringify(event));

        try {
            const published = channel.publish(
                EXCHANGE_NAME,
                routingKey,
                message,
                {
                    persistent: true,
                    contentType: 'application/json',
                    messageId: event.eventId,
                    timestamp: Date.now()
                }
            );

            if (!published) {
                console.warn(
                    `RabbitMQ aplicó contrapresión al publicar ${routingKey}`
                );
            }

            // Esperar la confirmación del broker.
            await channel.waitForConfirms();

            console.log(
                `RabbitMQ confirmó el evento ${event.eventId}`
            );

            return event;

        } catch (error) {
            console.error(
                `Error publicando evento ${routingKey}:`,
                error.message
            );

            throw error;
        }
    }
}

export default new EventPublisher();
