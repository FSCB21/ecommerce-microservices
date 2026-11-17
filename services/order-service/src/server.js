
import app from './app.js';
import sequelize from './config/sequelize.js';
import RabbitMQ from './config/rabbitmq.js';

const PORT = 3003;

let server;

const startServer = async () => {
    try {
        // Verificar conexión con PostgreSQL
        await sequelize.authenticate();

        console.log(
            'Conexión con PostgreSQL establecida correctamente'
        );

        // Conectar con RabbitMQ
        await RabbitMQ.connect();

        // Iniciar servidor HTTP
        server = app.listen(PORT, () => {
            console.log(
                `Order Service ejecutándose en puerto ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            'Error iniciando Order Service:',
            error.message
        );

        try {
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

// Cierre controlado del servicio
const shutdown = async (signal) => {
    console.log(
        `\nRecibida señal ${signal}. Cerrando Order Service...`
    );

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        }

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
