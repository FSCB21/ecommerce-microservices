
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import app from './app.js';
import sequelize from './config/database.js';
import RabbitMQ from './config/rabbitmq.js';
import NotificationConsumer from './services/NotificationConsumer.js';
import EmailService from './services/EmailService.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: resolve(currentDir, '../../../.env')
});

const PORT = 3004;

let server;
let shuttingDown = false;

const startServer = async () => {
    try {
        // Verificar conexión con PostgreSQL
        await sequelize.authenticate();

        console.log(
            'Conexión con PostgreSQL establecida correctamente'
        );

        // Verificar conexión SMTP
        try {
            await EmailService.verifyConnection();

            console.log(
                'Conexión SMTP establecida correctamente'
            );

        } catch (error) {
            console.warn(
                'Servidor SMTP no disponible. Se intentará enviar los correos cuando se procesen las notificaciones:',
                error.message
            );
        }

        // Intentar conectar con RabbitMQ
        try {
            await RabbitMQ.connect();

        } catch (error) {
            console.warn(
                'RabbitMQ no está disponible. Se reintentará automáticamente:',
                error.message
            );
        }

        // Iniciar servidor HTTP
        server = app.listen(PORT, () => {
            console.log(
                `Notification Service ejecutándose en el puerto ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            'Error al iniciar Notification Service:',
            error.message
        );

        try {
            await NotificationConsumer.stop();
            await RabbitMQ.close();
            await sequelize.close();

        } catch (closeError) {
            console.error(
                'Error cerrando conexiones:',
                closeError.message
            );
        }

        process.exitCode = 1;
    }
};

// Cierre controlado del servidor
const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log(
        `\nRecibida señal ${signal}. Cerrando Notification Service...`
    );

    try {
        // Detener el consumidor
        await NotificationConsumer.stop();

        // Cerrar servidor HTTP
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        }

        // Cerrar conexiones
        await RabbitMQ.close();
        await sequelize.close();

        console.log('Conexiones cerradas correctamente');
        process.exit(0);

    } catch (error) {
        console.error(
            'Error al cerrar conexiones:',
            error.message
        );

        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();

export { startServer };
