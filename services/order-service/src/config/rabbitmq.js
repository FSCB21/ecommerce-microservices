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

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

let connection = null;
let channel = null;
let reconnectTimer = null;
let retryDelay = INITIAL_RETRY_DELAY;
let connecting = false;
let shuttingDown = false;
let connectionPromise = null;

class RabbitMQ {
    async connect() {
        if (shuttingDown) {
            throw new Error('RabbitMQ está cerrándose');
        }

        if (channel) {
            return channel;
        }

        if (connectionPromise) {
            return connectionPromise;
        }

        connectionPromise = this.establishConnection();

        try {
            return await connectionPromise;
        } finally {
            connectionPromise = null;
        }
    }

    async establishConnection() {
        if (connecting || shuttingDown) {
            return null;
        }

        connecting = true;

        try {
            connection = await amqp.connect(RABBITMQ_URL);

            connection.on('error', (error) => {
                console.error(
                    'Error en conexión RabbitMQ:',
                    error.message
                );
            });

            connection.on('close', () => {
                console.warn('Conexión RabbitMQ cerrada');

                connection = null;
                channel = null;

                if (!shuttingDown) {
                    this.scheduleReconnect();
                }
            });

            channel = await connection.createConfirmChannel();

            channel.on('error', (error) => {
                console.error(
                    'Error en canal RabbitMQ:',
                    error.message
                );
            });

            channel.on('close', () => {
                console.warn('Canal RabbitMQ cerrado');
                channel = null;
            });

            await channel.assertExchange(EXCHANGE_NAME, 'topic', {
                durable: true
            });

            retryDelay = INITIAL_RETRY_DELAY;

            console.log(
                'Conexión con RabbitMQ establecida correctamente'
            );

            return channel;

        } catch (error) {
            console.error(
                'Error conectando con RabbitMQ:',
                error.message
            );

            channel = null;

            if (connection) {
                try {
                    await connection.close();
                } catch {
                    // La conexión puede estar cerrada.
                }

                connection = null;
            }

            if (!shuttingDown) {
                this.scheduleReconnect();
            }

            throw error;

        } finally {
            connecting = false;
        }
    }

    scheduleReconnect() {
        if (reconnectTimer || shuttingDown) {
            return;
        }

        const delay = retryDelay;

        console.warn(
            `Reintentando conexión con RabbitMQ en ${delay / 1000} segundos...`
        );

        reconnectTimer = setTimeout(async () => {
            reconnectTimer = null;

            try {
                await this.connect();
            } catch {
                retryDelay = Math.min(
                    retryDelay * 2,
                    MAX_RETRY_DELAY
                );
            }
        }, delay);
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
        shuttingDown = true;

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        if (channel) {
            try {
                await channel.close();
            } catch (error) {
                console.error(
                    'Error cerrando canal RabbitMQ:',
                    error.message
                );
            }

            channel = null;
        }

        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(
                    'Error cerrando conexión RabbitMQ:',
                    error.message
                );
            }

            connection = null;
        }

        console.log('Conexión RabbitMQ cerrada correctamente');
    }
}

export default new RabbitMQ();