
import productClient from './ProductClient.js';

class ProductService {

    // Consultar un producto por su ID
    async getProductById(productId) {
        const response = await productClient.get(
            `/products/${productId}`
        );

        return response.data.data;
    }

    // Reservar inventario
    async reserveStock(productId, quantity, reservationId) {
        const response = await productClient.put(
            `/products/${productId}/reserve`,
            {
                quantity,
                reservationId
            }
        );

        return response.data;
    }

    // Liberar inventario reservado
    async releaseStock(productId, reservationId) {
        const response = await productClient.put(
            `/products/${productId}/release`,
            {
                reservationId
            }
        );

        return response.data;
    }
}

export default new ProductService();
