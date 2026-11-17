
import express from 'express';
import cors from 'cors';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

// Configuración de middlewares
app.use(cors());
app.use(express.json());

// Ruta de salud del microservicio
app.get('/health', (req, res) => {
    return res.status(200).json({
        success: true,
        service: 'notification-service',
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes);

// Ruta para endpoints inexistentes
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

// Manejo general de errores
app.use((error, req, res, next) => {
    console.error('Error interno:', error);

    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

export default app;
