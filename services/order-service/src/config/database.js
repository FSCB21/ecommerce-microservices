
import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, '../../../../.env');

dotenv.config({ path: envPath });

// Conexión exclusiva con orders_db
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'orders_db'
});

pool.on('error', (error) => {
    console.error('Error inesperado en PostgreSQL:', error);
});

export default pool;
