
import {
    jest,
    describe,
    test,
    expect,
    beforeEach
} from '@jest/globals';

import request from 'supertest';

// ======================================================
// MOCK DE ORDER SERVICE
// ======================================================

jest.unstable_mockModule('../../src/services/OrderService.js', () => ({
    default: {
        createOrder: jest.fn(),
        getAllOrders: jest.fn(),
        getOrderById: jest.fn()
    }
}));

// Importar después de configurar los mocks
const { default: OrderService } = await import(
    '../../src/services/OrderService.js'
);

const { default: app } = await import('../../src/app.js');

// ======================================================
// DATOS DE PRUEBA
// ======================================================

const USER_ID = 'b1000000-0000-4000-8000-000000000001';

const ORDER_ID = '5208b265-08d8-4f3f-a785-86d51d226a1a';

const SECOND_ORDER_ID = 'c639ba30-7e84-4fc2-b09c-c069b42894e1';

const PRODUCT_ID = 'a1000000-0000-4000-8000-000000000009';

const SECOND_PRODUCT_ID = 'a1000000-0000-4000-8000-000000000010';

const createOrderMock = () => ({
    id: ORDER_ID,
    user_id: USER_ID,
    total: '239700.00',
    status: 'PENDING',
    items: [
        {
            product_id: PRODUCT_ID,
            product_name: 'Parlante JBL Go 4',
            unit_price: '179900.00',
            quantity: 1,
            subtotal: '179900.00'
        },
        {
            product_id: SECOND_PRODUCT_ID,
            product_name: 'Cable USB-C',
            unit_price: '29900.00',
            quantity: 2,
            subtotal: '59800.00'
        }
    ]
});

const createSecondOrderMock = () => ({
    id: SECOND_ORDER_ID,
    user_id: USER_ID,
    total: '59900.00',
    status: 'PENDING',
    items: [
        {
            product_id: SECOND_PRODUCT_ID,
            product_name: 'Cable USB-C',
            unit_price: '29900.00',
            quantity: 2,
            subtotal: '59800.00'
        }
    ]
});

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

// ======================================================
// SUITE PRINCIPAL
// ======================================================

describe('Order Service - Pruebas API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==================================================
    // 1. HEALTH CHECK
    // ==================================================

    describe('GET /health', () => {

        test('Debe comprobar que el servicio está funcionando', async () => {

            const response = await request(app)
                .get('/health');

            expect(response.status).toBe(200);

            expect(response.body).toEqual({
                success: true,
                service: 'order-service',
                message: 'Order Service funcionando correctamente'
            });

        });

        test('Debe responder con contenido JSON', async () => {

            const response = await request(app)
                .get('/health');

            expect(response.headers['content-type']).toMatch(/json/);

        });

    });

    // ==================================================
    // 2. CREACIÓN DE PEDIDOS
    // ==================================================

    describe('POST /api/orders', () => {

        test('Debe crear un pedido correctamente', async () => {

            const orderMock = createOrderMock();

            OrderService.createOrder.mockResolvedValue(orderMock);

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                'Pedido creado correctamente'
            );

            expect(response.body.data).toEqual(orderMock);

            expect(OrderService.createOrder).toHaveBeenCalledTimes(1);

            expect(OrderService.createOrder).toHaveBeenCalledWith(
                USER_ID,
                validOrderPayload().items
            );

        });

        test('Debe crear un pedido con un solo producto', async () => {

            const orderMock = createOrderMock();

            OrderService.createOrder.mockResolvedValue(orderMock);

            const payload = {
                user_id: USER_ID,
                items: [
                    {
                        product_id: PRODUCT_ID,
                        quantity: 1
                    }
                ]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(payload);

            expect(response.status).toBe(201);

            expect(OrderService.createOrder).toHaveBeenCalledWith(
                USER_ID,
                payload.items
            );

        });

        test('Debe devolver la estructura esperada del pedido creado', async () => {

            const orderMock = createOrderMock();

            OrderService.createOrder.mockResolvedValue(orderMock);

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('data');

            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('user_id');
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('status');
            expect(response.body.data).toHaveProperty('items');

        });

        test('Debe manejar un error de validación del pedido', async () => {

            OrderService.createOrder.mockRejectedValue(
                Object.assign(new Error('El pedido debe contener al menos un producto'), {
                    statusCode: 400
                })
            );

            const response = await request(app)
                .post('/api/orders')
                .send({
                    user_id: USER_ID,
                    items: []
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'El pedido debe contener al menos un producto'
            );

        });

        test('Debe manejar un usuario inexistente', async () => {

            OrderService.createOrder.mockRejectedValue(
                Object.assign(new Error('Usuario no válido'), {
                    statusCode: 404
                })
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Usuario no válido');

        });

        test('Debe manejar un producto inexistente', async () => {

            OrderService.createOrder.mockRejectedValue(
                Object.assign(new Error('Producto no encontrado'), {
                    statusCode: 404
                })
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Producto no encontrado'
            );

        });

        test('Debe manejar inventario insuficiente', async () => {

            OrderService.createOrder.mockRejectedValue(
                Object.assign(new Error('No hay suficiente inventario'), {
                    statusCode: 400
                })
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'No hay suficiente inventario'
            );

        });

        test('Debe manejar conflictos en la reserva de inventario', async () => {

            OrderService.createOrder.mockRejectedValue(
                Object.assign(new Error('El inventario ya fue reservado'), {
                    statusCode: 409
                })
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);

        });

        test('Debe manejar errores de conexión con otros microservicios', async () => {

            OrderService.createOrder.mockRejectedValue(
                new Error('Error de conexión con el servicio de productos')
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error de conexión con el servicio de productos'
            );

        });

        test('Debe manejar errores internos durante la creación', async () => {

            OrderService.createOrder.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error interno del servidor'
            );

        });

        test('Debe manejar errores sin mensaje definido', async () => {

            OrderService.createOrder.mockRejectedValue({});

            const response = await request(app)
                .post('/api/orders')
                .send(validOrderPayload());

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error al crear el pedido'
            );

        });

    });

    // ==================================================
    // 3. CONSULTAR TODOS LOS PEDIDOS
    // ==================================================

    describe('GET /api/orders', () => {

        test('Debe consultar todos los pedidos', async () => {

            const ordersMock = [
                createOrderMock(),
                createSecondOrderMock()
            ];

            OrderService.getAllOrders.mockResolvedValue(ordersMock);

            const response = await request(app)
                .get('/api/orders');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toEqual(ordersMock);

            expect(OrderService.getAllOrders).toHaveBeenCalledTimes(1);

        });

        test('Debe devolver una lista vacía cuando no existen pedidos', async () => {

            OrderService.getAllOrders.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/orders');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);

        });

        test('Debe devolver los pedidos con sus respectivos detalles', async () => {

            const ordersMock = [createOrderMock()];

            OrderService.getAllOrders.mockResolvedValue(ordersMock);

            const response = await request(app)
                .get('/api/orders');

            expect(response.status).toBe(200);

            expect(response.body.data[0]).toHaveProperty('items');

            expect(response.body.data[0].items).toHaveLength(2);

            expect(response.body.data[0].items[0]).toHaveProperty(
                'product_id'
            );

            expect(response.body.data[0].items[0]).toHaveProperty(
                'quantity'
            );

        });

        test('Debe manejar errores de conexión con la base de datos', async () => {

            OrderService.getAllOrders.mockRejectedValue(
                new Error('Error de conexión con la base de datos')
            );

            const response = await request(app)
                .get('/api/orders');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error de conexión con la base de datos'
            );

        });

        test('Debe manejar errores sin mensaje definido', async () => {

            OrderService.getAllOrders.mockRejectedValue({});

            const response = await request(app)
                .get('/api/orders');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error al consultar los pedidos'
            );

        });

    });

    // ==================================================
    // 4. CONSULTAR PEDIDO POR IDENTIFICADOR
    // ==================================================

    describe('GET /api/orders/:id', () => {

        test('Debe consultar un pedido por su identificador', async () => {

            const orderMock = createOrderMock();

            OrderService.getOrderById.mockResolvedValue(orderMock);

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toEqual(orderMock);

            expect(OrderService.getOrderById).toHaveBeenCalledWith(
                ORDER_ID
            );

        });

        test('Debe devolver los detalles del pedido consultado', async () => {

            const orderMock = createOrderMock();

            OrderService.getOrderById.mockResolvedValue(orderMock);

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(200);

            expect(response.body.data.items).toHaveLength(2);

            expect(response.body.data.items[0].product_name).toBe(
                'Parlante JBL Go 4'
            );

        });

        test('Debe responder 404 cuando el pedido no existe', async () => {

            OrderService.getOrderById.mockRejectedValue(
                Object.assign(new Error('Pedido no encontrado'), {
                    statusCode: 404
                })
            );

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Pedido no encontrado'
            );

        });

        test('Debe manejar errores internos al consultar un pedido', async () => {

            OrderService.getOrderById.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error interno del servidor'
            );

        });

        test('Debe manejar errores de conexión con la base de datos', async () => {

            OrderService.getOrderById.mockRejectedValue(
                new Error('No fue posible consultar el pedido')
            );

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

        });

        test('Debe manejar errores sin mensaje definido', async () => {

            OrderService.getOrderById.mockRejectedValue({});

            const response = await request(app)
                .get(`/api/orders/${ORDER_ID}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                'Error al consultar el pedido'
            );

        });

    });

    // ==================================================
    // 5. RUTAS INEXISTENTES
    // ==================================================

    describe('Rutas inexistentes', () => {

        test('Debe responder 404 para una ruta inexistente', async () => {

            const response = await request(app)
                .get('/api/ruta-inexistente');

            expect(response.status).toBe(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Ruta no encontrada'
            });

        });

        test('Debe responder 404 para un endpoint POST inexistente', async () => {

            const response = await request(app)
                .post('/api/pedidos');

            expect(response.status).toBe(404);

            expect(response.body.success).toBe(false);

        });

        test('Debe responder 404 para una ruta fuera del módulo de pedidos', async () => {

            const response = await request(app)
                .get('/productos');

            expect(response.status).toBe(404);

        });

    });

    // ==================================================
    // 6. MÉTODOS HTTP NO SOPORTADOS
    // ==================================================

    describe('Métodos HTTP no soportados', () => {

        test('Debe responder 404 cuando se utiliza PUT en la colección de pedidos', async () => {

            const response = await request(app)
                .put('/api/orders');

            expect(response.status).toBe(404);

        });

        test('Debe responder 404 cuando se utiliza DELETE en la colección de pedidos', async () => {

            const response = await request(app)
                .delete('/api/orders');

            expect(response.status).toBe(404);

        });

    });

});
