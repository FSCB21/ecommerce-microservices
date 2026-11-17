
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, '../../../../.env');

dotenv.config({ path: envPath });

const databaseName = process.env.NODE_ENV === 'test'
    ? 'notifications_test_db'
    : (process.env.POSTGRES_DB || 'notifications_db');

const sequelize = new Sequelize(
    databaseName,
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

export default sequelize;
