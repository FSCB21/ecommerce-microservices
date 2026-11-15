
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

module.exports = {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/tests/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/']
};
