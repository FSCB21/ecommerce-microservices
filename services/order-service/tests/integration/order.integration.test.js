
import {
    jest,
    describe,
    test,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
    afterAll
} from '@jest/globals';

// ======================================================
// MOCK DEL MICROSERVICIO DE PRODUCTOS
// ======================================================

jest.unstable_mockModule('../../src/services/ProductService.js', () => ({
    default: {
        getProductById: jest.fn(),
        reserveStock: jest.fn(),
        releaseStock: jest.fn()
    }
}));

// Importar los módulos después de configurar el mock
const { default: OrderService } = await import(
    '../../src/services/OrderService.js'
);

const { default: ProductService } = await import(
    '../../src/services/ProductService.js'
);

const { Order, OrderItem } = await import(
    '../../src/models/index.js'
);

const { default: sequelize } = await import(
    '../../src/config/sequelize.js'
);

// ======================================================
// DATOS DE PRUEBA
// ======================================================

const USER_ID = 'b1000000-0000-4000-8000-000000000001';

const PRODUCT_ID = 'a1000000-0000-4000-8000-000000000009';

const SECOND_PRODUCT_ID = 'a1000000-0000-4000-8000-000000000010';

const productMock = {
    id: PRODUCT_ID,
    name: 'Parlante JBL Go 4',
    price: '179900.00',
    stock: 50
};

const secondProductMock = {
    id: SECOND_PRODUCT_ID,
    name: 'Cable USB-C',
    price: '29900.00',
    stock: 50
};

const createOrderItems = () => [
    {
        product_id: PRODUCT_ID,
        product_name: 'Parlante JBL Go 4',
        unit_price: 179900,
        quantity: 1,
        subtotal: 179900,
        reservationId: 'e4765adc-95d2-414b-bba2-d221992c955d'
    },
    {
        product_id: SECOND_PRODUCT_ID,
        product_name: 'Cable USB-C',
        unit_price: 29900,
        quantity: 2,
        subtotal: 59800,
        reservationId: 'e5765adc-95d2-414b-bba2-d221992c955d'
    }
];

const validOrderPayload = () => ({
    user_id: USER_ID,
    items: [
        {
            product_id: PRODUCT_ID,
            quantity: 1
        },
        {
            product_id: SECOND_PRODUCT_ID,
            quantity: 2
        }
    ]
});

// Identificadores de los pedidos creados durante las pruebas
const createdOrderIds = [];

// ======================================================
// CONFIGURACIÓN Y LIMPIEZA
// ======================================================

describe('Order Service - Pruebas de integración', () => {

    beforeAll(async () => {

        // Verificar conexión con la base de pruebas
        await sequelize.authenticate();

        console.log(
            'Conexión establecida con la base de datos de integración'
        );

    });

    beforeEach(() => {

        jest.clearAllMocks();

        // Configurar respuestas predeterminadas de productos
        ProductService.getProductById.mockImplementation(
            async (productId) => {

                if (productId === PRODUCT_ID) {
                    return productMock;
                }

                if (productId === SECOND_PRODUCT_ID) {
                    return secondProductMock;
                }

                return null;
            }
        );

        ProductService.reserveStock.mockResolvedValue({
            success: true,
            message: 'Inventario reservado correctamente'
        });

        ProductService.releaseStock.mockResolvedValue({
            success: true,
            message: 'Inventario liberado correctamente'
        });

    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {

        // Eliminar únicamente los pedidos creados por estas pruebas
        if (createdOrderIds.length > 0) {

            await Order.destroy({
                where: {
                    id: createdOrderIds
                }
            });

        }

        await sequelize.close();

        console.log(
            'Conexión de pruebas cerrada y datos temporales limpiados'
        );

    });

    // ==================================================
    // 1. CONEXIÓN CON POSTGRESQL
    // ==================================================

    describe('Conexión con PostgreSQL', () => {

        test('Debe establecer conexión con la base de datos de pruebas', async () => {

            await expect(
                sequelize.authenticate()
            ).resolves.toBeUndefined();

        });

        test('Debe permitir consultar la tabla de pedidos', async () => {

            const total = await Order.count();

            expect(total).toEqual(expect.any(Number));
            expect(total).toBeGreaterThanOrEqual(0);

        });

        test('Debe permitir consultar la tabla de detalles', async () => {

            const total = await OrderItem.count();

            expect(total).toEqual(expect.any(Number));
            expect(total).toBeGreaterThanOrEqual(0);

        });

    });

    // ==================================================
    // 2. PERSISTENCIA DE PEDIDOS
    // ==================================================

    describe('Persistencia de pedidos', () => {

        test('Debe guardar un pedido correctamente en PostgreSQL', async () => {

            const order = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(order.id);

            expect(order).toBeDefined();
            expect(order.id).toBeDefined();
            expect(order.user_id).toBe(USER_ID);
            expect(Number(order.total)).toBe(239700);
            expect(order.status).toBe('PENDING');

        });

        test('Debe guardar los detalles asociados al pedido', async () => {

            const order = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(order.id);

            expect(order.items).toHaveLength(2);

            expect(order.items[0].product_id).toBe(PRODUCT_ID);
            expect(order.items[0].product_name).toBe(
                'Parlante JBL Go 4'
            );

            expect(order.items[1].product_id).toBe(
                SECOND_PRODUCT_ID
            );

            expect(order.items[1].quantity).toBe(2);

        });

        test('Debe calcular correctamente el total del pedido', async () => {

            const items = createOrderItems();

            const order = await OrderService.saveOrder(
                USER_ID,
                items
            );

            createdOrderIds.push(order.id);

            expect(Number(order.total)).toBe(239700);

        });

        test('Debe almacenar el estado inicial PENDING', async () => {

            const order = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(order.id);

            expect(order.status).toBe('PENDING');

        });

        test('Debe conservar los precios históricos de los productos', async () => {

            const items = createOrderItems();

            const order = await OrderService.saveOrder(
                USER_ID,
                items
            );

            createdOrderIds.push(order.id);

            expect(Number(order.items[0].unit_price)).toBe(179900);
            expect(Number(order.items[1].unit_price)).toBe(29900);

            expect(Number(order.items[0].subtotal)).toBe(179900);
            expect(Number(order.items[1].subtotal)).toBe(59800);

        });

        test('Debe generar identificadores únicos para los pedidos', async () => {

            const firstOrder = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            const secondOrder = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(firstOrder.id, secondOrder.id);

            expect(firstOrder.id).not.toBe(secondOrder.id);

        });

    });

    // ==================================================
    // 3. CONSULTA DE PEDIDOS
    // ==================================================

    describe('Consulta de pedidos', () => {

        test('Debe consultar un pedido guardado por su identificador', async () => {

            const createdOrder = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(createdOrder.id);

            const order = await OrderService.getOrderById(
                createdOrder.id
            );

            expect(order).toBeDefined();
            expect(order.id).toBe(createdOrder.id);
            expect(order.user_id).toBe(USER_ID);

        });

        test('Debe recuperar los detalles asociados al pedido consultado', async () => {

            const createdOrder = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(createdOrder.id);

            const order = await OrderService.getOrderById(
                createdOrder.id
            );

            expect(order.items).toHaveLength(2);

        });

        test('Debe consultar todos los pedidos almacenados', async () => {

            const createdOrder = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(createdOrder.id);

            const orders = await OrderService.getAllOrders();

            expect(Array.isArray(orders)).toBe(true);

            expect(
                orders.some(order => order.id === createdOrder.id)
            ).toBe(true);

        });

        test('Debe devolver error 404 cuando el pedido no existe', async () => {

            await expect(
                OrderService.getOrderById(
                    '00000000-0000-4000-8000-000000000099'
                )
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Pedido no encontrado'
            });

        });

    });

    // ==================================================
    // 4. VALIDACIÓN E INTEGRACIÓN CON PRODUCT SERVICE
    // ==================================================

    describe('Validación de productos', () => {

        test('Debe consultar los productos mediante ProductService', async () => {

            const items = [
                {
                    product_id: PRODUCT_ID,
                    quantity: 1
                }
            ];

            const validatedItems = await OrderService.validateOrderItems(
                items
            );

            expect(ProductService.getProductById).toHaveBeenCalledWith(
                PRODUCT_ID
            );

            expect(validatedItems).toHaveLength(1);

        });

        test('Debe obtener el nombre y precio real del producto', async () => {

            const validatedItems = await OrderService.validateOrderItems([
                {
                    product_id: PRODUCT_ID,
                    quantity: 2
                }
            ]);

            expect(validatedItems[0].product_name).toBe(
                'Parlante JBL Go 4'
            );

            expect(validatedItems[0].unit_price).toBe(179900);

            expect(validatedItems[0].subtotal).toBe(359800);

        });

        test('Debe generar un identificador de reserva para cada producto', async () => {

            const validatedItems = await OrderService.validateOrderItems([
                {
                    product_id: PRODUCT_ID,
                    quantity: 1
                }
            ]);

            expect(validatedItems[0].reservationId).toBeDefined();

            expect(validatedItems[0].reservationId).toEqual(
                expect.any(String)
            );

        });

        test('Debe rechazar un producto inexistente', async () => {

            ProductService.getProductById.mockResolvedValue(null);

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: PRODUCT_ID,
                        quantity: 1
                    }
                ])
            ).rejects.toMatchObject({
                statusCode: 404
            });

        });

        test('Debe rechazar precios negativos', async () => {

            ProductService.getProductById.mockResolvedValue({
                ...productMock,
                price: '-100'
            });

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: PRODUCT_ID,
                        quantity: 1
                    }
                ])
            ).rejects.toThrow(
                'El precio del producto no es válido'
            );

        });

        test('Debe rechazar precios que no sean numéricos', async () => {

            ProductService.getProductById.mockResolvedValue({
                ...productMock,
                price: 'precio-invalido'
            });

            await expect(
                OrderService.validateOrderItems([
                    {
                        product_id: PRODUCT_ID,
                        quantity: 1
                    }
                ])
            ).rejects.toThrow(
                'El precio del producto no es válido'
            );

        });

    });

    // ==================================================
    // 5. RESERVA DE INVENTARIO
    // ==================================================

    describe('Reserva de inventario', () => {

        test('Debe reservar inventario de todos los productos', async () => {

            const items = createOrderItems();

            const reservedItems = await OrderService.reserveOrderItems(
                items
            );

            expect(reservedItems).toHaveLength(2);

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);

        });

        test('Debe enviar el identificador de reserva correspondiente', async () => {

            const items = createOrderItems();

            await OrderService.reserveOrderItems(items);

            expect(
                ProductService.reserveStock
            ).toHaveBeenNthCalledWith(
                1,
                PRODUCT_ID,
                1,
                items[0].reservationId
            );

            expect(
                ProductService.reserveStock
            ).toHaveBeenNthCalledWith(
                2,
                SECOND_PRODUCT_ID,
                2,
                items[1].reservationId
            );

        });

        test('Debe conservar los productos reservados correctamente', async () => {

            const items = createOrderItems();

            const reservedItems = await OrderService.reserveOrderItems(
                items
            );

            expect(reservedItems).toEqual(items);

        });

    });

    // ==================================================
    // 6. COMPENSACIÓN DE RESERVAS
    // ==================================================

    describe('Compensación de reservas', () => {

        test('Debe liberar las reservas anteriores si falla una reserva posterior', async () => {

            const items = createOrderItems();

            ProductService.reserveStock
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(
                    new Error('Inventario insuficiente')
                );

            await expect(
                OrderService.reserveOrderItems(items)
            ).rejects.toThrow('Inventario insuficiente');

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(
                ProductService.releaseStock
            ).toHaveBeenCalledWith(
                PRODUCT_ID,
                items[0].reservationId
            );

        });

        test('Debe liberar las reservas en orden inverso', async () => {

            const items = [
                ...createOrderItems(),
                {
                    product_id: 'a1000000-0000-4000-8000-000000000011',
                    product_name: 'Mouse inalámbrico',
                    unit_price: 50000,
                    quantity: 1,
                    subtotal: 50000,
                    reservationId: 'e6765adc-95d2-414b-bba2-d221992c955d'
                }
            ];

            ProductService.reserveStock
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(
                    new Error('Inventario insuficiente')
                );

            await expect(
                OrderService.reserveOrderItems(items)
            ).rejects.toThrow('Inventario insuficiente');

            expect(ProductService.releaseStock).toHaveBeenNthCalledWith(
                1,
                SECOND_PRODUCT_ID,
                items[1].reservationId
            );

            expect(ProductService.releaseStock).toHaveBeenNthCalledWith(
                2,
                PRODUCT_ID,
                items[0].reservationId
            );

        });

        test('Debe continuar la compensación si falla una liberación', async () => {

            const items = createOrderItems();

            ProductService.reserveStock
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(
                    new Error('Inventario insuficiente')
                );

            ProductService.releaseStock.mockRejectedValue(
                new Error('No fue posible liberar la reserva')
            );

            const consoleError = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            await expect(
                OrderService.reserveOrderItems(items)
            ).rejects.toThrow('Inventario insuficiente');

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(consoleError).toHaveBeenCalled();

            consoleError.mockRestore();

        });

    });

    // ==================================================
    // 7. FLUJO COMPLETO DE CREACIÓN DE PEDIDOS
    // ==================================================

    describe('Flujo de creación de pedidos', () => {

        test('Debe validar productos, reservar inventario y guardar el pedido', async () => {

            const payload = validOrderPayload();

            const order = await OrderService.createOrder(
                payload.user_id,
                payload.items
            );

            createdOrderIds.push(order.id);

            expect(order).toBeDefined();

            expect(order.status).toBe('PENDING');

            expect(Number(order.total)).toBe(239700);

            expect(order.items).toHaveLength(2);

            expect(ProductService.getProductById).toHaveBeenCalledTimes(2);

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(2);

        });

        test('Debe persistir los detalles después de reservar el inventario', async () => {

            const payload = validOrderPayload();

            const order = await OrderService.createOrder(
                payload.user_id,
                payload.items
            );

            createdOrderIds.push(order.id);

            const savedOrder = await OrderService.getOrderById(
                order.id
            );

            expect(savedOrder.items).toHaveLength(2);

            expect(Number(savedOrder.total)).toBe(239700);

        });

        test('Debe rechazar la creación cuando no hay usuario', async () => {

            await expect(
                OrderService.createOrder(
                    null,
                    validOrderPayload().items
                )
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'El usuario es obligatorio'
            });

            expect(ProductService.getProductById).not.toHaveBeenCalled();

        });

        test('Debe rechazar pedidos sin productos', async () => {

            await expect(
                OrderService.createOrder(USER_ID, [])
            ).rejects.toMatchObject({
                statusCode: 400
            });

            expect(ProductService.getProductById).not.toHaveBeenCalled();

        });

        test('Debe rechazar cantidades inválidas', async () => {

            await expect(
                OrderService.createOrder(USER_ID, [
                    {
                        product_id: PRODUCT_ID,
                        quantity: 0
                    }
                ])
            ).rejects.toMatchObject({
                statusCode: 400
            });

            expect(ProductService.getProductById).not.toHaveBeenCalled();

        });

        test('Debe compensar las reservas si falla el almacenamiento del pedido', async () => {

            const saveOrderSpy = jest
                .spyOn(OrderService, 'saveOrder')
                .mockRejectedValue(
                    new Error('Error simulado de persistencia')
                );

            await expect(
                OrderService.createOrder(
                    USER_ID,
                    [
                        {
                            product_id: PRODUCT_ID,
                            quantity: 1
                        }
                    ]
                )
            ).rejects.toThrow('Error simulado de persistencia');

            expect(ProductService.reserveStock).toHaveBeenCalledTimes(1);

            expect(ProductService.releaseStock).toHaveBeenCalledTimes(1);

            expect(saveOrderSpy).toHaveBeenCalledTimes(1);

        });

    });

    // ==================================================
    // 8. TRANSACCIONES Y ROLLBACK
    // ==================================================

    describe('Transacciones de PostgreSQL', () => {

        test('Debe confirmar la transacción cuando el pedido se guarda correctamente', async () => {

            const order = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(order.id);

            const savedOrder = await Order.findByPk(order.id);

            expect(savedOrder).not.toBeNull();

        });

        test('Debe revertir la transacción si falla la inserción de detalles', async () => {

            const initialOrderCount = await Order.count();

            const invalidItems = [
                {
                    product_id: PRODUCT_ID,
                    product_name: null,
                    unit_price: 179900,
                    quantity: 1,
                    subtotal: 179900
                }
            ];

            await expect(
                OrderService.saveOrder(USER_ID, invalidItems)
            ).rejects.toThrow();

            const finalOrderCount = await Order.count();

            expect(finalOrderCount).toBe(initialOrderCount);

        });

        test('No debe dejar detalles huérfanos después de un rollback', async () => {

            const initialItemCount = await OrderItem.count();

            const invalidItems = [
                {
                    product_id: PRODUCT_ID,
                    product_name: null,
                    unit_price: 179900,
                    quantity: 1,
                    subtotal: 179900
                }
            ];

            await expect(
                OrderService.saveOrder(USER_ID, invalidItems)
            ).rejects.toThrow();

            const finalItemCount = await OrderItem.count();

            expect(finalItemCount).toBe(initialItemCount);

        });

        test('Debe mantener la relación entre pedido y detalles', async () => {

            const order = await OrderService.saveOrder(
                USER_ID,
                createOrderItems()
            );

            createdOrderIds.push(order.id);

            const savedItems = await OrderItem.findAll({
                where: {
                    order_id: order.id
                }
            });

            expect(savedItems).toHaveLength(2);

            savedItems.forEach(item => {
                expect(item.order_id).toBe(order.id);
            });

        });

    });

});
