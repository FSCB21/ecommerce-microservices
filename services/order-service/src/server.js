
import app from './app.js';
import sequelize from './config/sequelize.js';

const PORT = 3003;

const startServer = async () => {
    try {
        await sequelize.authenticate();

        console.log('Conexión con PostgreSQL establecida correctamente');

        app.listen(PORT, () => {
            console.log(`Order Service ejecutándose en puerto ${PORT}`);
        });

    } catch (error) {
        console.error('Error iniciando Order Service:', error.message);
        process.exit(1);
    }
};

startServer();
