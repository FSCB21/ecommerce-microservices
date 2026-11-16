import {
    jest,
    describe,
    test,
    expect,
    beforeEach
} from '@jest/globals';

// Simular ProductService
jest.unstable_mockModule('../../src/services/ProductService.js', () => ({
    default: {
        getProductById: jest.fn(),
        reserveStock: jest.fn(),
        releaseStock: jest.fn()
    }
}));

// Simular los modelos
jest.unstable_mockModule('../../src/models/index.js', () => ({
    Order: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn()
    },
    OrderItem: {
        bulkCreate: jest.fn()
    }
}));

// Simular Sequelize
jest.unstable_mockModule('../../src/config/sequelize.js', () => ({
    default: {
        transaction: jest.fn()
    }
}));

// Importar dependencias después de configurar los mocks
const { default: OrderService } = await import('../../src/services/OrderService.js');

const { default: ProductService } = await import('../../src/services/ProductService.js');

const { Order, OrderItem } = await import('../../src/models/index.js');

const { default: sequelize } = await import('../../src/config/sequelize.js');

describe('OrderService - Pruebas unitarias', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

        describe('createOrder() - Validaciones', () => {

        test('Debe rechazar un pedido sin usuario', async () => {
            await expect(
                OrderService.createOrder(null, [
                    {
                        product_id: 'product-1',
                        quantity: 2
                    }
                ])
            ).rejects.toMatchObject({
                message: 'El usuario es obligatorio',
                statusCode: 400
            });
        });

        test('Debe rechazar un pedido sin productos', async () => {
            await expect(
                OrderService.createOrder('user-1', [])
            ).rejects.toMatchObject({
                message: 'El pedido debe contener al menos un producto',
                statusCode: 400
            });
        });

        test('Debe rechazar un pedido con productos que no tienen cantidad válida', async () => {
            await expect(
                OrderService.createOrder('user-1', [
                    {
                        product_id: 'product-1',
                        quantity: 0
                    }
                ])
            ).rejects.toMatchObject({
                message: 'Los productos o cantidades del pedido no son válidos',
                statusCode: 400
            });
        });

    });

    describe('validateOrderItems()', () => {

        test('Debe validar varios productos y calcular sus subtotales', async () => {

            ProductService.getProductById
                .mockResolvedValueOnce({
                    id: 'product-1',
                    name: 'Cable USB-C',
                    price: 29900
                })
                .mockResolvedValueOnce({
                    id: 'product-2',
                    name: 'Parlante JBL Go 4',
                    price: 179900
                });

            const result = await OrderService.validateOrderItems([
                {
                    product_id: 'product-1',
                    quantity: 2
                },
                {
                    product_id: 'product-2',
                    quantity: 1
                }
            ]);

            expect(result).toHaveLength(2);

            expect(result[0].subtotal).toBe(59800);
            expect(result[1].subtotal).toBe(179900);

            expect(result[0].reservationId).toBeDefined();
            expect(result[1].reservationId).toBeDefined();

            expect(result[0].reservationId)
                .not.toBe(result[1].reservationId);

            expect(ProductService.getProductById)
                .toHaveBeenCalledTimes(2);
        });

        test('Debe rechazar un producto inexistente', async () => {

            ProductService.getProductById.mockResolvedValue(null);

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: 'producto-inexistente',
                        quantity: 1
                    }
                ])
            ).rejects.toMatchObject({
                message: 'Producto producto-inexistente no encontrado',
                statusCode: 404
            });

        });

        test('Debe rechazar un producto con un precio inválido', async () => {

            ProductService.getProductById.mockResolvedValue({
                id: 'product-1',
                name: 'Cable USB-C',
                price: 'precio-invalido'
            });

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: 'product-1',
                        quantity: 2
                    }
                ])
            ).rejects.toThrow();
        });

        test('Debe rechazar un producto cuyo subtotal supera el límite seguro', async () => {

            ProductService.getProductById.mockResolvedValue({
                id: 'product-1',
                name: 'Producto de prueba',
                price: 90071992547409.91
            });

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: 'product-1',
                        quantity: 2
                    }
                ])
            ).rejects.toThrow(
                'El subtotal del producto no es válido'
            );

        });

        test('Debe rechazar un precio cuya conversión a centavos supera el límite seguro', async () => {

            ProductService.getProductById.mockResolvedValue({
                id: 'product-1',
                name: 'Producto de prueba',
                price: Number.MAX_SAFE_INTEGER
            });

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: 'product-1',
                        quantity: 1
                    }
                ])
            ).rejects.toThrow(
                'El precio del producto no es válido'
            );

        });

    });


    describe('reserveOrderItems()', () => {

        test('Debe reservar correctamente todos los productos', async () => {

            ProductService.reserveStock.mockResolvedValue({
                message: 'Inventario reservado correctamente'
            });

            const items = [
                {
                    product_id: 'product-1',
                    quantity: 2,
                    reservationId: 'reservation-1'
                },
                {
                    product_id: 'product-2',
                    quantity: 1,
                    reservationId: 'reservation-2'
                }
            ];

            const result = await OrderService.reserveOrderItems(items);

            expect(result).toHaveLength(2);

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);

            expect(ProductService.reserveStock).toHaveBeenNthCalledWith(
                1,
                'product-1',
                2,
                'reservation-1'
            );

            expect(ProductService.reserveStock).toHaveBeenNthCalledWith(
                2,
                'product-2',
                1,
                'reservation-2'
            );

            expect(ProductService.releaseStock).not.toHaveBeenCalled();
        });

        test('Debe liberar las reservas anteriores si falla una reserva', async () => {
    
            ProductService.reserveStock
                .mockResolvedValueOnce({
                    message: 'Inventario reservado correctamente'
                })
                .mockRejectedValueOnce(
                    Object.assign(new Error('Stock insuficiente'), {
                        statusCode: 409
                    })
                );
    
            ProductService.releaseStock.mockResolvedValue({
                message: 'Inventario liberado correctamente'
            });
    
            const items = [
                {
                    product_id: 'product-1',
                    quantity: 2,
                    reservationId: 'reservation-1'
                },
                {
                    product_id: 'product-2',
                    quantity: 1,
                    reservationId: 'reservation-2'
                }
            ];
    
            await expect(
                OrderService.reserveOrderItems(items)
            ).rejects.toThrow('Stock insuficiente');
    
            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);
    
            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);
    
            expect(ProductService.releaseStock).toHaveBeenCalledWith(
                'product-1',
                'reservation-1'
            );
        });

        test('Debe propagar el error de reserva aunque falle la liberación compensatoria', async () => {

            const items = [
                {
                    product_id: 'product-1',
                    quantity: 2,
                    reservationId: 'reservation-1'
                },
                {
                    product_id: 'product-2',
                    quantity: 1,
                    reservationId: 'reservation-2'
                }
            ];

            ProductService.reserveStock
                .mockResolvedValueOnce({
                    message: 'Inventario reservado'
                })
                .mockRejectedValueOnce(
                    new Error('Error reservando inventario')
                );

            ProductService.releaseStock.mockRejectedValue(
                new Error('Error liberando inventario')
            );

            await expect(
                OrderService.reserveOrderItems(items)
            ).rejects.toThrow('Error reservando inventario');

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(ProductService.releaseStock).toHaveBeenCalledWith(
                'product-1',
                'reservation-1'
            );

        });

    });

    describe('saveOrder()', () => {

        test('Debe guardar el pedido y sus productos en una transacción', async () => {

            const transaction = {
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            Order.create.mockResolvedValue({
                id: 'order-1'
            });

            OrderItem.bulkCreate.mockResolvedValue([]);

            Order.findByPk.mockResolvedValue({
                id: 'order-1',
                total: '239700.00',
                status: 'PENDING',
                items: [
                    { product_id: 'product-1', quantity: 2 },
                    { product_id: 'product-2', quantity: 1 }
                ]
            });

            const items = [
                {
                    product_id: 'product-1',
                    product_name: 'Cable USB-C',
                    unit_price: 29900,
                    quantity: 2,
                    subtotal: 59800
                },
                {
                    product_id: 'product-2',
                    product_name: 'Parlante JBL Go 4',
                    unit_price: 179900,
                    quantity: 1,
                    subtotal: 179900
                }
            ];

            const result = await OrderService.saveOrder('user-1', items);

            expect(Order.create).toHaveBeenCalledWith({
                user_id: 'user-1',
                total: 239700,
                status: 'PENDING'
            }, { transaction });

            expect(OrderItem.bulkCreate).toHaveBeenCalledTimes(1);

            expect(transaction.commit).toHaveBeenCalledTimes(1);

            expect(transaction.rollback).not.toHaveBeenCalled();

            expect(result.total).toBe('239700.00');

            expect(result.items).toHaveLength(2);
        });

        test('Debe revertir la transacción si falla el guardado de los detalles', async () => {

            const transaction = {
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            Order.create.mockResolvedValue({
                id: 'order-2'
            });

            OrderItem.bulkCreate.mockRejectedValue(
                new Error('Error guardando los detalles')
            );

            const items = [
                {
                    product_id: 'product-1',
                    product_name: 'Cable USB-C',
                    unit_price: 29900,
                    quantity: 2,
                    subtotal: 59800
                }
            ];

            await expect(
                OrderService.saveOrder('user-1', items)
            ).rejects.toThrow('Error guardando los detalles');

            expect(transaction.rollback).toHaveBeenCalledTimes(1);

            expect(transaction.commit).not.toHaveBeenCalled();

            expect(Order.findByPk).not.toHaveBeenCalled();
        });


        test('Debe rechazar un pedido cuyo total supera el límite de cálculo seguro', async () => {

            const transaction = {
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            const items = [
                {
                    product_id: 'product-1',
                    product_name: 'Producto de prueba',
                    unit_price: 90071992547409.91,
                    quantity: 100,
                    subtotal: 9007199254740991
                }
            ];

            await expect(
                OrderService.saveOrder('user-1', items)
            ).rejects.toThrow();

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);

            expect(transaction.rollback).toHaveBeenCalledTimes(1);

            expect(Order.create).not.toHaveBeenCalled();

            expect(transaction.commit).not.toHaveBeenCalled();

        });

        test('No debe revertir una transacción que ya está finalizada', async () => {

            const transaction = {
                commit: jest.fn(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            Order.create.mockResolvedValue({
                id: 'order-1',
                user_id: 'user-1',
                total: '59800.00',
                status: 'PENDING'
            });

            OrderItem.bulkCreate.mockResolvedValue([]);

            Order.findByPk.mockResolvedValue({
                id: 'order-1',
                items: []
            });

            transaction.commit.mockImplementation(async () => {
                transaction.finished = 'commit';

                throw new Error('Error confirmando la transacción');
            });

            await expect(
                OrderService.saveOrder('user-1', [
                    {
                        product_id: 'product-1',
                        product_name: 'Cable USB-C',
                        unit_price: 29900,
                        quantity: 2,
                        subtotal: 59800
                    }
                ])
            ).rejects.toThrow('Error confirmando la transacción');

            expect(transaction.commit).toHaveBeenCalledTimes(1);

            expect(transaction.rollback).not.toHaveBeenCalled();

        });
        
    });

    describe('createOrder() - Compensación', () => {

        test('Debe liberar el inventario si falla el guardado del pedido', async () => {

            ProductService.getProductById
                .mockResolvedValue({
                    id: 'product-1',
                    name: 'Cable USB-C',
                    price: 29900
                });

            ProductService.reserveStock.mockResolvedValue({
                message: 'Inventario reservado correctamente'
            });

            ProductService.releaseStock.mockResolvedValue({
                message: 'Inventario liberado correctamente'
            });

            const transaction = {
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            Order.create.mockRejectedValue(
                new Error('Error guardando el pedido')
            );

            await expect(
                OrderService.createOrder('user-1', [
                    {
                        product_id: 'product-1',
                        quantity: 2
                    }
                ])
            ).rejects.toThrow('Error guardando el pedido');

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(1);

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(ProductService.releaseStock).toHaveBeenCalledWith(
                'product-1',
                expect.any(String)
            );

            expect(transaction.rollback).toHaveBeenCalledTimes(1);
        });

        test('Debe registrar el error si falla la liberación del inventario durante la compensación', async () => {

            ProductService.getProductById.mockResolvedValue({
                id: 'product-1',
                name: 'Cable USB-C',
                price: 29900
            });

            ProductService.reserveStock.mockResolvedValue({
                message: 'Inventario reservado correctamente'
            });

            ProductService.releaseStock.mockRejectedValue(
                new Error('Error liberando inventario')
            );

            const transaction = {
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                finished: undefined
            };

            sequelize.transaction.mockResolvedValue(transaction);

            Order.create.mockRejectedValue(
                new Error('Error guardando el pedido')
            );

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            await expect(
                OrderService.createOrder('user-1', [
                    {
                        product_id: 'product-1',
                        quantity: 2
                    }
                ])
            ).rejects.toThrow('Error guardando el pedido');

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(1);

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/^Error liberando reserva .+:/),
                'Error liberando inventario'
            );

            expect(transaction.rollback).toHaveBeenCalledTimes(1);

            consoleErrorSpy.mockRestore();
        });

    });

    describe('Consultas de pedidos', () => {

        test('Debe devolver todos los pedidos con sus productos', async () => {

            const mockOrders = [
                { id: 'order-1', status: 'PENDING' },
                { id: 'order-2', status: 'CONFIRMED' }
            ];

            Order.findAll.mockResolvedValue(mockOrders);

            const result = await OrderService.getAllOrders();

            expect(result).toHaveLength(2);

            expect(Order.findAll).toHaveBeenCalledWith({
                include: [{
                    model: OrderItem,
                    as: 'items'
                }],
                order: [['created_at', 'DESC']]
            });
        });

        test('Debe devolver un pedido por su identificador', async () => {

            const mockOrder = {
                id: 'order-1',
                status: 'PENDING'
            };

            Order.findByPk.mockResolvedValue(mockOrder);

            const result = await OrderService.getOrderById('order-1');

            expect(result).toEqual(mockOrder);

            expect(Order.findByPk).toHaveBeenCalledWith('order-1', {
                include: [{
                    model: OrderItem,
                    as: 'items'
                }]
            });
        });

        test('Debe generar un error 404 si el pedido no existe', async () => {

            Order.findByPk.mockResolvedValue(null);

            await expect(
                OrderService.getOrderById('order-inexistente')
            ).rejects.toMatchObject({
                message: 'Pedido no encontrado',
                statusCode: 404
            });
        });

    });

});