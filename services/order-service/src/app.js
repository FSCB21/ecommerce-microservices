
import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/order.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de verificación
app.get('/health', (req, res) => {
    return res.status(200).json({
        success: true,
        service: 'order-service',
        message: 'Order Service funcionando correctamente'
    });
});

// Rutas de pedidos
app.use('/api/orders', orderRoutes);

// Manejo de rutas inexistentes
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

export default app;
