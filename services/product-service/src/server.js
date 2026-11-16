
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import app from './app.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, '../../../.env');

dotenv.config({ path: envPath });

const PORT = process.env.PRODUCT_SERVICE_PORT || 3002;

const server = app.listen(PORT, () => {
    console.log(`Product Service ejecutándose en el puerto ${PORT}`);
});

// Cierre controlado del servidor
const shutdown = () => {
    console.log('Cerrando Product Service...');

    server.close(() => {
        console.log('Servidor cerrado correctamente');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
