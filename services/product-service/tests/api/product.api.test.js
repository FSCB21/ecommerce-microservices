
import {
    jest,
    describe,
    test,
    expect,
    beforeAll,
    afterAll
} from '@jest/globals';

import request from 'supertest';
import { randomUUID } from 'node:crypto';

import app from '../../src/app.js';
import pool from '../../src/config/database.js';

describe('Product API - Pruebas HTTP', () => {

    let productId;
    let reservationId;

    beforeAll(async () => {
        // Crear producto de prueba
        const result = await pool.query(
            `INSERT INTO products
                (name, description, price, stock)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                `Producto API ${randomUUID()}`,
                'Producto para pruebas HTTP',
                150000,
                10
            ]
        );

        productId = result.rows[0].id;
        reservationId = randomUUID();
    });

    afterAll(async () => {
        try {
            await pool.query(
                `DELETE FROM product_reservations
                 WHERE product_id = $1`,
                [productId]
            );

            await pool.query(
                'DELETE FROM products WHERE id = $1',
                [productId]
            );
        } finally {
            await pool.end();
        }
    });

    describe('GET /health', () => {

        test('Debe comprobar que el servicio está disponible', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.status).toBe(200);
            expect(response.body.service).toBe('product-service');
            expect(response.body.status).toBe('OK');
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('GET /api/products', () => {

        test('Debe retornar la lista de productos', async () => {
            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.total).toBeGreaterThan(0);
        });
    });

    describe('GET /api/products/:id', () => {

        test('Debe retornar un producto existente', async () => {
            const response = await request(app)
                .get(`/api/products/${productId}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(productId);
            expect(response.body.data.stock).toBe(10);
        });

        test('Debe retornar 400 para un UUID inválido', async () => {
            const response = await request(app)
                .get('/api/products/id-invalido');

            expect(response.status).toBe(400);
        });

        test('Debe retornar 404 para un producto inexistente', async () => {
            const response = await request(app)
                .get(`/api/products/${randomUUID()}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/products', () => {

        test('Debe crear un producto correctamente', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({
                    name: `Producto creado API ${randomUUID()}`,
                    description: 'Producto de prueba',
                    price: 250000,
                    stock: 15
                });

            expect(response.status).toBe(201);
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.name).toContain('Producto creado API');

            // Eliminar el producto creado
            await pool.query(
                'DELETE FROM products WHERE id = $1',
                [response.body.data.id]
            );
        });
    });

    describe('PUT /api/products/:id', () => {

        test('Debe actualizar los datos de un producto', async () => {
            const response = await request(app)
                .put(`/api/products/${productId}`)
                .send({
                    name: 'Producto actualizado API',
                    description: 'Descripción actualizada',
                    price: 175000
                });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe('Producto actualizado API');
            expect(Number(response.body.data.price)).toBe(175000);
            expect(response.body.data.stock).toBe(10);
        });
    });

    describe('PUT /api/products/:id/reserve', () => {

        test('Debe reservar inventario correctamente', async () => {
            const response = await request(app)
                .put(`/api/products/${productId}/reserve`)
                .send({
                    quantity: 3,
                    reservationId
                });

            expect(response.status).toBe(200);
            expect(response.body.data.stock).toBe(7);
        });

        test('Debe rechazar una reserva superior al inventario', async () => {
            const response = await request(app)
                .put(`/api/products/${productId}/reserve`)
                .send({
                    quantity: 20,
                    reservationId: randomUUID()
                });

            expect(response.status).toBe(409);
            expect(response.body.message).toBeDefined();
        });
    });

    describe('PUT /api/products/:id/release', () => {

        test('Debe liberar una reserva correctamente', async () => {
            const response = await request(app)
                .put(`/api/products/${productId}/release`)
                .send({
                    reservationId
                });

            expect(response.status).toBe(200);
            expect(response.body.data.stock).toBe(10);
        });
    });

    describe('DELETE /api/products/:id', () => {

        test('Debe eliminar un producto correctamente', async () => {
            const created = await request(app)
                .post('/api/products')
                .send({
                    name: `Producto para eliminar ${randomUUID()}`,
                    price: 50000,
                    stock: 5
                });

            expect(created.status).toBe(201);

            const response = await request(app)
                .delete(`/api/products/${created.body.data.id}`);

            expect(response.status).toBe(200);
        });

        test('Debe retornar 404 al eliminar un producto inexistente', async () => {
            const response = await request(app)
                .delete(`/api/products/${randomUUID()}`);

            expect(response.status).toBe(404);
        });
    });

    describe('Rutas inexistentes', () => {

        test('Debe retornar 404 para una ruta no definida', async () => {
            const response = await request(app)
                .get('/api/ruta-inexistente');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Ruta no encontrada');
        });
    });

});
