import RabbitMQ from './rabbitmq.js';

const EXCHANGE_NAME = 'ecommerce_events';

const QUEUES = {
    ORDER_NOTIFICATIONS: 'order_notifications_queue'
};

class QueueConfig {

    async setup() {
        const channel = RabbitMQ.getChannel();

        // Crear cola persistente
        await channel.assertQueue(
            QUEUES.ORDER_NOTIFICATIONS,
            {
                durable: true
            }
        );

        // Escuchar eventos de pedidos confirmados
        await channel.bindQueue(
            QUEUES.ORDER_NOTIFICATIONS,
            EXCHANGE_NAME,
            'order.confirmed'
        );

        console.log('Colas y enlaces configurados correctamente');

        return QUEUES;
    }
}

export { QUEUES };

export default new QueueConfig();
