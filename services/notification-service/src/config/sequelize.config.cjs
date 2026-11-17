
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
    path: path.resolve(__dirname, '../../../../.env')
});

const commonConfig = {
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    dialect: 'postgres',
    logging: false
};

module.exports = {
    development: {
        ...commonConfig,
        database: 'notifications_db'
    },
    test: {
        ...commonConfig,
        database: 'notifications_test_db'
    }
};
