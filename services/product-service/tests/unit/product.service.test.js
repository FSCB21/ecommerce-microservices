
import {
    jest,
    describe,
    test,
    expect,
    beforeEach
} from '@jest/globals';

// Simular PostgreSQL
jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: {
        query: jest.fn(),
        connect: jest.fn()
    }
}));

// Importar después de configurar el mock
const { default: pool } = await import('../../src/config/database.js');

const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    reserveStock,
    releaseStock
} = await import('../../src/services/product.service.js');

const productId = 'a1000000-0000-4000-8000-000000000001';

const productMock = {
    id: productId,
    name: 'Laptop Lenovo',
    description: 'Laptop de prueba',
    price: '2899900.00',
    stock: 15,
    created_at: new Date(),
    updated_at: new Date()
};

describe('Product Service - Pruebas unitarias', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Crear producto
    describe('createProduct', () => {

        test('Debe crear un producto correctamente', async () => {
            pool.query.mockResolvedValue({
                rows: [productMock]
            });

            const product = await createProduct({
                name: 'Laptop Lenovo',
                description: 'Laptop de prueba',
                price: 2899900,
                stock: 15
            });

            expect(product.name).toBe('Laptop Lenovo');
            expect(product.stock).toBe(15);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        test('Debe rechazar un producto sin nombre', async () => {
            await expect(
                createProduct({
                    name: '',
                    price: 100000,
                    stock: 5
                })
            ).rejects.toMatchObject({
                statusCode: 400
            });

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar un precio negativo', async () => {
            await expect(
                createProduct({
                    name: 'Producto prueba',
                    price: -100,
                    stock: 5
                })
            ).rejects.toMatchObject({
                statusCode: 400
            });
        });

        test('Debe rechazar un inventario negativo', async () => {
            await expect(
                createProduct({
                    name: 'Producto prueba',
                    price: 100000,
                    stock: -5
                })
            ).rejects.toMatchObject({
                statusCode: 400
            });
        });
    });

    // Consultar productos
    describe('getAllProducts', () => {

        test('Debe retornar todos los productos', async () => {
            pool.query.mockResolvedValue({
                rows: [productMock]
            });

            const products = await getAllProducts();

            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('Laptop Lenovo');
        });
    });

    // Consultar producto por ID
    describe('getProductById', () => {

        test('Debe retornar un producto existente', async () => {
            pool.query.mockResolvedValue({
                rows: [productMock]
            });

            const product = await getProductById(productId);

            expect(product.id).toBe(productId);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        test('Debe rechazar un UUID inválido', async () => {
            await expect(
                getProductById('identificador-invalido')
            ).rejects.toMatchObject({
                statusCode: 400
            });
        });

        test('Debe retornar 404 si el producto no existe', async () => {
            pool.query.mockResolvedValue({
                rows: []
            });

            await expect(
                getProductById(productId)
            ).rejects.toMatchObject({
                statusCode: 404
            });
        });
    });

    // Actualizar producto
    describe('updateProduct', () => {

        test('Debe actualizar los datos del producto', async () => {
            const updatedProduct = {
                ...productMock,
                name: 'Laptop Lenovo actualizada',
                price: '2999900.00'
            };

            pool.query.mockResolvedValue({
                rows: [updatedProduct]
            });

            const product = await updateProduct(productId, {
                name: 'Laptop Lenovo actualizada',
                description: 'Descripción actualizada',
                price: 2999900
            });

            expect(product.name).toBe('Laptop Lenovo actualizada');
            expect(pool.query).toHaveBeenCalledTimes(1);
        });
    });

    // Eliminar producto
    describe('deleteProduct', () => {

        test('Debe eliminar un producto existente', async () => {
            pool.query.mockResolvedValue({
                rows: [{ id: productId }]
            });

            const result = await deleteProduct(productId);

            expect(result.id).toBe(productId);
            expect(result.message).toBe(
                'Producto eliminado correctamente'
            );
        });

        test('Debe retornar 404 si intenta eliminar un producto inexistente', async () => {
            pool.query.mockResolvedValue({
                rows: []
            });

            await expect(
                deleteProduct(productId)
            ).rejects.toMatchObject({
                statusCode: 404
            });
        });
    });



    const reservationId = 'b2000000-0000-4000-8000-000000000001';

    const createMockClient = () => ({
        query: jest.fn(),
        release: jest.fn()
    });

    describe('Product Service - Reservas de inventario', () => {

        let client;

        beforeEach(() => {
            jest.clearAllMocks();
            client = createMockClient();
            pool.connect.mockResolvedValue(client);
        });

        describe('reserveStock', () => {

            test('Debe reservar inventario y registrar la reserva', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({ rows: [] }) // Reserva existente
                    .mockResolvedValueOnce({
                        rows: [{ ...productMock, stock: 12 }]
                    }) // Descontar stock
                    .mockResolvedValueOnce({ rows: [] }) // INSERT reserva
                    .mockResolvedValueOnce({ rows: [] }); // COMMIT

                const product = await reserveStock(
                    productId,
                    3,
                    reservationId
                );

                expect(product.stock).toBe(12);
                expect(client.query).toHaveBeenCalledTimes(5);
                expect(client.release).toHaveBeenCalled();
            });

            test('No debe descontar nuevamente una reserva existente', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({
                        rows: [{
                            reservation_id: reservationId,
                            product_id: productId,
                            quantity: 3,
                            status: 'RESERVED'
                        }]
                    }) // Reserva existente
                    .mockResolvedValueOnce({
                        rows: [{ ...productMock, stock: 12 }]
                    }) // Consultar producto
                    .mockResolvedValueOnce({ rows: [] }); // COMMIT

                const product = await reserveStock(
                    productId,
                    3,
                    reservationId
                );

                expect(product.stock).toBe(12);

                // No debe ejecutar UPDATE ni INSERT
                expect(client.query).toHaveBeenCalledTimes(4);
            });

            test('Debe rechazar reutilizar una reserva con otra cantidad', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({
                        rows: [{
                            reservation_id: reservationId,
                            product_id: productId,
                            quantity: 3,
                            status: 'RESERVED'
                        }]
                    });

                await expect(
                    reserveStock(productId, 5, reservationId)
                ).rejects.toMatchObject({
                    statusCode: 409
                });

                expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            });

            test('Debe rechazar un identificador de reserva inválido', async () => {
                await expect(
                    reserveStock(productId, 3, 'reserva-invalida')
                ).rejects.toMatchObject({
                    statusCode: 400
                });

                expect(pool.connect).not.toHaveBeenCalled();
            });
        });

        describe('releaseStock', () => {

            test('Debe liberar inventario y actualizar la reserva', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({
                        rows: [{
                            reservation_id: reservationId,
                            product_id: productId,
                            quantity: 3,
                            status: 'RESERVED'
                        }]
                    }) // Buscar reserva
                    .mockResolvedValueOnce({
                        rows: [{ ...productMock, stock: 15 }]
                    }) // Devolver inventario
                    .mockResolvedValueOnce({ rows: [] }) // Actualizar reserva
                    .mockResolvedValueOnce({ rows: [] }); // COMMIT

                const product = await releaseStock(
                    productId,
                    reservationId
                );

                expect(product.stock).toBe(15);
                expect(client.query).toHaveBeenCalledTimes(5);
            });

            test('No debe liberar dos veces una misma reserva', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({
                        rows: [{
                            reservation_id: reservationId,
                            product_id: productId,
                            quantity: 3,
                            status: 'RELEASED'
                        }]
                    }) // Reserva ya liberada
                    .mockResolvedValueOnce({
                        rows: [{ ...productMock, stock: 15 }]
                    }) // Consultar producto
                    .mockResolvedValueOnce({ rows: [] }); // COMMIT

                const product = await releaseStock(
                    productId,
                    reservationId
                );

                expect(product.stock).toBe(15);

                // No debe volver a incrementar el stock
                expect(client.query).toHaveBeenCalledTimes(4);
            });

            test('Debe rechazar liberar una reserva inexistente', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({ rows: [] }); // Sin reserva

                await expect(
                    releaseStock(productId, reservationId)
                ).rejects.toMatchObject({
                    statusCode: 404
                });

                expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            });

            test('Debe rechazar liberar una reserva de otro producto', async () => {
                client.query
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({
                        rows: [{
                            reservation_id: reservationId,
                            product_id: 'a1000000-0000-4000-8000-000000000002',
                            quantity: 3,
                            status: 'RESERVED'
                        }]
                    });

                await expect(
                    releaseStock(productId, reservationId)
                ).rejects.toMatchObject({
                    statusCode: 409
                });

                expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            });
        });
    });


});
