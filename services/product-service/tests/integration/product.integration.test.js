
import {
    jest,
    describe,
    test,
    expect,
    beforeAll,
    afterAll
} from '@jest/globals';

import { randomUUID } from 'node:crypto';

import pool from '../../src/config/database.js';

import {
    createProduct,
    reserveStock,
    releaseStock
} from '../../src/services/product.service.js';

describe('Product Service - Pruebas de integración', () => {

    let product;
    const reservationId = randomUUID();
    const secondReservationId = randomUUID();

    beforeAll(async () => {
        // Crear un producto real en products_test_db
        product = await createProduct({
            name: `Producto de integración ${randomUUID()}`,
            description: 'Producto utilizado para pruebas',
            price: 1000,
            stock: 5
        });
    });

    afterAll(async () => {
        try {
            // Limpiar las reservas creadas durante las pruebas
            await pool.query(
                `DELETE FROM product_reservations
                WHERE product_id = $1`,
                [product.id]
            );

            // Eliminar el producto de prueba
            await pool.query(
                'DELETE FROM products WHERE id = $1',
                [product.id]
            );
        } finally {
            // Cerrar el pool de conexiones de PostgreSQL
            await pool.end();
        }
    });

    test('Debe crear el producto correctamente en PostgreSQL', async () => {
        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [product.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].name).toBe(product.name);
        expect(result.rows[0].stock).toBe(5);
    });

    test('Debe reservar inventario y persistir la reserva', async () => {
        const result = await reserveStock(
            product.id,
            3,
            reservationId
        );

        expect(result.stock).toBe(2);

        const reservation = await pool.query(
            `SELECT * FROM product_reservations
             WHERE reservation_id = $1`,
            [reservationId]
        );

        expect(reservation.rows).toHaveLength(1);
        expect(reservation.rows[0].quantity).toBe(3);
        expect(reservation.rows[0].status).toBe('RESERVED');
    });

    test('No debe descontar nuevamente una reserva repetida', async () => {
        const result = await reserveStock(
            product.id,
            3,
            reservationId
        );

        expect(result.stock).toBe(2);
    });

    test('Debe liberar inventario y actualizar el estado', async () => {
        const result = await releaseStock(
            product.id,
            reservationId
        );

        expect(result.stock).toBe(5);

        const reservation = await pool.query(
            `SELECT status FROM product_reservations
             WHERE reservation_id = $1`,
            [reservationId]
        );

        expect(reservation.rows[0].status).toBe('RELEASED');
    });

    test('No debe incrementar inventario al liberar dos veces', async () => {
        const result = await releaseStock(
            product.id,
            reservationId
        );

        expect(result.stock).toBe(5);
    });

    test('Debe rechazar reservas superiores al inventario disponible', async () => {
        await expect(
            reserveStock(
                product.id,
                6,
                secondReservationId
            )
        ).rejects.toMatchObject({
            statusCode: 409
        });

        const result = await pool.query(
            'SELECT stock FROM products WHERE id = $1',
            [product.id]
        );

        expect(result.rows[0].stock).toBe(5);
    });
});
