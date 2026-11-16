
import express from 'express';
import cors from 'cors';

import productRoutes from './routes/product.routes.js';
import { ProductServiceError } from './services/product.service.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de comprobación
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'product-service',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Rutas de productos
app.use('/api/products', productRoutes);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        message: 'Ruta no encontrada'
    });
});

// Manejo centralizado de errores
app.use((error, req, res, next) => {
    console.error(error);

    if (error instanceof ProductServiceError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            message: 'El cuerpo de la solicitud contiene JSON inválido'
        });
    }

    return res.status(500).json({
        message: 'Error interno del servidor'
    });
});

export default app;
