
import axios from 'axios';

const retryDelays = [200, 500, 1000];

const wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

const productClient = axios.create({
    baseURL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

productClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        if (!config) {
            return Promise.reject(error);
        }

        // No reintentar errores HTTP de respuesta.
        if (error.response) {
            return Promise.reject(error);
        }

        config.retryCount = config.retryCount || 0;

        if (config.retryCount < retryDelays.length) {
            const delay = retryDelays[config.retryCount];

            config.retryCount += 1;

            console.warn(
                `[ProductClient] Reintento ${config.retryCount}/3 ` +
                `en ${delay} ms. Motivo: ${error.code || error.message}`
            );

            await wait(delay);

            return productClient(config);
        }

        const serviceError = new Error(
            error.code === 'ECONNABORTED'
                ? 'El servicio de productos no respondió dentro del tiempo esperado'
                : 'El servicio de productos no está disponible después de 3 reintentos'
        );

        serviceError.statusCode = 503;
        serviceError.code = error.code || 'PRODUCT_SERVICE_UNAVAILABLE';

        console.error('[ProductClient] Servicio de productos no disponible:', error.message);

        return Promise.reject(serviceError);
    }
);

export default productClient;
