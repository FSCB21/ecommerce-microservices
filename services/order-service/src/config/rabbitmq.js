
import amqp from 'amqplib';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, '../../../../.env');

dotenv.config({ path: envPath });

const RABBITMQ_URL = process.env.RABBITMQ_URL ||
    `amqp://${encodeURIComponent(process.env.RABBITMQ_USER)}:${encodeURIComponent(process.env.RABBITMQ_PASSWORD)}@localhost:${process.env.RABBITMQ_PORT || 5672}`;

const EXCHANGE_NAME = 'ecommerce_events';

let connection = null;
let channel = null;

class RabbitMQ {
    async connect() {
        try {
            if (channel) {
                return channel;
            }

            connection = await amqp.connect(RABBITMQ_URL);

            connection.on('error', (error) => {
                console.error('Error en conexión RabbitMQ:', error.message);
            });

            connection.on('close', () => {
                console.warn('Conexión RabbitMQ cerrada');
                connection = null;
                channel = null;
            });

            // Crear un canal con confirmación del broker.
            channel = await connection.createConfirmChannel();

            await channel.assertExchange(EXCHANGE_NAME, 'topic', {
                durable: true
            });

            console.log('Conexión con RabbitMQ establecida correctamente');

            return channel;

        } catch (error) {
            connection = null;
            channel = null;

            console.error('Error conectando con RabbitMQ:', error.message);
            throw error;
        }
    }

    getChannel() {
        if (!channel) {
            throw new Error(
                'RabbitMQ no está conectado. Ejecuta connect() primero.'
            );
        }

        return channel;
    }

    async close() {
        if (channel) {
            await channel.close();
            channel = null;
        }

        if (connection) {
            await connection.close();
            connection = null;
        }
    }
}

export default new RabbitMQ();
