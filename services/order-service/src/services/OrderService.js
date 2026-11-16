
import { Order, OrderItem } from '../models/index.js';
import ProductService from './ProductService.js';
import { randomUUID } from 'node:crypto';
import sequelize from '../config/sequelize.js';

class OrderService {

    // Obtener todos los pedidos
    async getAllOrders() {
        return await Order.findAll({
            include: [{
                model: OrderItem,
                as: 'items'
            }],
            order: [['created_at', 'DESC']]
        });
    }

    // Obtener un pedido por su ID
    async getOrderById(orderId) {
        const order = await Order.findByPk(orderId, {
            include: [{
                model: OrderItem,
                as: 'items'
            }]
        });

        if (!order) {
            const error = new Error('Pedido no encontrado');
            error.statusCode = 404;
            throw error;
        }

        return order;
    }


    
    // Crear un pedido
    async createOrder(userId, items) {

        if (!userId) {
            const error = new Error('El usuario es obligatorio');
            error.statusCode = 400;
            throw error;
        }

        if (!Array.isArray(items) || items.length === 0) {
            const error = new Error(
                'El pedido debe contener al menos un producto'
            );
            error.statusCode = 400;
            throw error;
        }

        for (const item of items) {
            if (
                !item.product_id ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                const error = new Error(
                    'Los productos o cantidades del pedido no son válidos'
                );
                error.statusCode = 400;
                throw error;
            }
        }

        // 1. Consultar productos y obtener precios reales
        const validatedItems = await this.validateOrderItems(items);

        // 2. Reservar inventario
        const reservedItems = await this.reserveOrderItems(validatedItems);

        try {
            // 3. Guardar pedido y detalles
            return await this.saveOrder(userId, reservedItems);

        } catch (error) {

            // 4. Compensar si falla la persistencia
            for (const item of [...reservedItems].reverse()) {
                try {
                    await ProductService.releaseStock(
                        item.product_id,
                        item.reservationId
                    );
                } catch (releaseError) {
                    console.error(
                        `Error liberando reserva ${item.reservationId}:`,
                        releaseError.message
                    );
                }
            }

            throw error;
        }
    }



    // Consultar y validar los productos de un pedido
    
    // Consultar y validar los productos de un pedido
    async validateOrderItems(items) {
        const validatedItems = [];

        for (const item of items) {
            const product = await ProductService.getProductById(
                item.product_id
            );

            if (!product) {
                const error = new Error(
                    `Producto ${item.product_id} no encontrado`
                );
                error.statusCode = 404;
                throw error;
            }

            const priceInCents = Math.round(
                Number(product.price) * 100
            );

            if (
                !Number.isSafeInteger(priceInCents) ||
                priceInCents < 0
            ) {
                throw new Error(
                    'El precio del producto no es válido'
                );
            }

            const subtotalInCents = priceInCents * item.quantity;

            if (!Number.isSafeInteger(subtotalInCents)) {
                throw new Error(
                    'El subtotal del producto no es válido'
                );
            }

            validatedItems.push({
                product_id: product.id,
                product_name: product.name,
                unit_price: priceInCents / 100,
                quantity: item.quantity,
                subtotal: subtotalInCents / 100,
                reservationId: randomUUID()
            });
        }

        return validatedItems;
    }




    // Reservar inventario de todos los productos
    async reserveOrderItems(items) {
        const reservedItems = [];

        try {
            for (const item of items) {
                await ProductService.reserveStock(
                    item.product_id,
                    item.quantity,
                    item.reservationId
                );

                reservedItems.push(item);
            }

            return reservedItems;

        } catch (error) {
            // Liberar las reservas realizadas antes del fallo
            for (const item of reservedItems.reverse()) {
                try {
                    await ProductService.releaseStock(
                        item.product_id,
                        item.reservationId
                    );
                } catch (releaseError) {
                    console.error(
                        `No se pudo liberar la reserva ${item.reservationId}:`,
                        releaseError.message
                    );
                }
            }

            throw error;
        }
    }



   
    // Guardar pedido y detalles en una transacción
    async saveOrder(userId, items) {
        const transaction = await sequelize.transaction();

        let savedOrder;

        try {
            const totalInCents = items.reduce(
                (sum, item) => sum + Math.round(item.subtotal * 100),
                0
            );

            if (!Number.isSafeInteger(totalInCents)) {
                throw new Error('El total del pedido no es válido');
            }

            const total = totalInCents / 100;

            const order = await Order.create({
                user_id: userId,
                total,
                status: 'PENDING'
            }, { transaction });

            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                product_name: item.product_name,
                unit_price: item.unit_price,
                quantity: item.quantity,
                subtotal: item.subtotal
            }));

            await OrderItem.bulkCreate(orderItems, { transaction });

            savedOrder = await Order.findByPk(order.id, {
                include: [{
                    model: OrderItem,
                    as: 'items'
                }],
                transaction
            });

            await transaction.commit();

        } catch (error) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw error;
        }

        return savedOrder;
    }



}

export default new OrderService();
