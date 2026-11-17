import OrderService from '../services/OrderService.js';

class OrderController {

    // Crear un pedido
    async createOrder(req, res) {
        try {
            const userId = req.body.user_id;
            const { items } = req.body;

            const order = await OrderService.createOrder(userId, items);

            return res.status(201).json({
                success: true,
                message: 'Pedido creado correctamente',
                data: order
            });

        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al crear el pedido'
            });
        }
    }

    // Confirmar un pedido
    async confirmOrder(req, res) {
        try {
            const { id } = req.params;

            const order = await OrderService.confirmOrder(id);

            return res.status(200).json({
                success: true,
                message: 'Pedido confirmado correctamente',
                data: order
            });

        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al confirmar el pedido'
            });
        }
    }

    // Consultar todos los pedidos
    async getAllOrders(req, res) {
        try {
            const orders = await OrderService.getAllOrders();

            return res.status(200).json({
                success: true,
                data: orders
            });

        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al consultar los pedidos'
            });
        }
    }

    // Consultar un pedido por su identificador
    async getOrderById(req, res) {
        try {
            const { id } = req.params;

            const order = await OrderService.getOrderById(id);

            return res.status(200).json({
                success: true,
                data: order
            });

        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al consultar el pedido'
            });
        }
    }
}

export default new OrderController();