
import axios from 'axios';

const productClient = axios.create({
    baseURL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default productClient;
