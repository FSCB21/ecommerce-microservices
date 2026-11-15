
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database'
        );

        res.status(200).json({
            status: 'OK',
            service: 'user-service',
            database: result.rows[0].database,
            message: 'Servicio y base de datos funcionando correctamente'
        });
    } catch (error) {
        console.error('Error verificando la base de datos:', error);

        res.status(503).json({
            status: 'ERROR',
            service: 'user-service',
            message: 'No fue posible conectar con la base de datos'
        });
    }
});

export default router;
