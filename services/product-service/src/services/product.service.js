
import pool from '../config/database.js';
import Product from '../models/product.model.js';

export class ProductServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'ProductServiceError';
        this.statusCode = statusCode;
    }
}

// Validar formato UUID
const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateUUID = (id) => {
    if (!uuidRegex.test(id)) {
        throw new ProductServiceError(
            'El identificador del producto no tiene un formato UUID válido',
            400
        );
    }
};

// Validar datos del producto
const validateProductData = ({ name, description, price }) => {
    if (typeof name !== 'string' || !name.trim()) {
        throw new ProductServiceError(
            'El nombre del producto es obligatorio',
            400
        );
    }

    if (name.trim().length > 150) {
        throw new ProductServiceError(
            'El nombre no puede superar los 150 caracteres',
            400
        );
    }

    if (
        description !== undefined &&
        description !== null &&
        typeof description !== 'string'
    ) {
        throw new ProductServiceError(
            'La descripción debe ser un texto válido',
            400
        );
    }

    if (
        price === undefined ||
        price === null ||
        price === '' ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
    ) {
        throw new ProductServiceError(
            'El precio debe ser un número mayor o igual a cero',
            400
        );
    }

    // Validar máximo 10 dígitos enteros y 2 decimales
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(price))) {
        throw new ProductServiceError(
            'El precio debe tener máximo 10 dígitos enteros y 2 decimales',
            400
        );
    }
};

// Crear producto
export const createProduct = async ({
    name,
    description = null,
    price,
    stock = 0
}) => {
    validateProductData({ name, description, price });

    if (!Number.isInteger(stock) || stock < 0) {
        throw new ProductServiceError(
            'El inventario debe ser un entero mayor o igual a cero',
            400
        );
    }

    const query = `
        INSERT INTO products (name, description, price, stock)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

    const values = [
        name.trim(),
        description?.trim() || null,
        price,
        stock
    ];

    const result = await pool.query(query, values);

    return Product.fromDatabase(result.rows[0]);
};

// Consultar todos los productos
export const getAllProducts = async () => {
    const result = await pool.query(`
        SELECT * FROM products
        ORDER BY name ASC
    `);

    return result.rows.map(Product.fromDatabase);
};

// Consultar producto por ID
export const getProductById = async (id) => {
    validateUUID(id);

    const result = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        throw new ProductServiceError(
            'Producto no encontrado',
            404
        );
    }

    return Product.fromDatabase(result.rows[0]);
};

// Actualizar información del producto
export const updateProduct = async (
    id,
    { name, description = null, price }
) => {
    validateUUID(id);
    validateProductData({ name, description, price });

    const query = `
        UPDATE products
        SET
            name = $1,
            description = $2,
            price = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
    `;

    const values = [
        name.trim(),
        description?.trim() || null,
        price,
        id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new ProductServiceError(
            'Producto no encontrado',
            404
        );
    }

    return Product.fromDatabase(result.rows[0]);
};

// Eliminar producto
export const deleteProduct = async (id) => {
    validateUUID(id);

    const result = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING id',
        [id]
    );

    if (result.rows.length === 0) {
        throw new ProductServiceError(
            'Producto no encontrado',
            404
        );
    }

    return {
        id: result.rows[0].id,
        message: 'Producto eliminado correctamente'
    };
};

// Reservar inventario de forma atómica

export const reserveStock = async (id, quantity, reservationId) => {
    validateUUID(id);

    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new ProductServiceError(
            'La cantidad a reservar debe ser un entero mayor que cero',
            400
        );
    }

    if (
        typeof reservationId !== 'string' ||
        !uuidRegex.test(reservationId)
    ) {
        throw new ProductServiceError(
            'Se requiere un identificador de reserva UUID válido',
            400
        );
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        // Comprobar si la reserva ya existe
        const existingReservation = await client.query(
            `SELECT *
             FROM product_reservations
             WHERE reservation_id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (existingReservation.rows.length > 0) {
            const reservation = existingReservation.rows[0];

            if (
                reservation.product_id !== id ||
                reservation.quantity !== quantity
            ) {
                throw new ProductServiceError(
                    'El identificador de reserva ya fue utilizado con otros datos',
                    409
                );
            }

            if (reservation.status === 'RELEASED') {
                throw new ProductServiceError(
                    'Esta reserva ya fue liberada y no puede reutilizarse',
                    409
                );
            }

            const productResult = await client.query(
                'SELECT * FROM products WHERE id = $1',
                [id]
            );

            if (productResult.rows.length === 0) {
                throw new ProductServiceError(
                    'Producto no encontrado',
                    404
                );
            }

            await client.query('COMMIT');
            transactionStarted = false;

            // Repetir una reserva no vuelve a descontar inventario
            return Product.fromDatabase(productResult.rows[0]);
        }

        // Descontar inventario únicamente si existe stock suficiente
        const productResult = await client.query(
            `UPDATE products
             SET stock = stock - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND stock >= $1
             RETURNING *`,
            [quantity, id]
        );

        if (productResult.rows.length === 0) {
            const product = await client.query(
                'SELECT id FROM products WHERE id = $1',
                [id]
            );

            if (product.rows.length === 0) {
                throw new ProductServiceError(
                    'Producto no encontrado',
                    404
                );
            }

            throw new ProductServiceError(
                'Inventario insuficiente para realizar la reserva',
                409
            );
        }

        // Registrar la reserva
        await client.query(
            `INSERT INTO product_reservations
                (reservation_id, product_id, quantity, status)
             VALUES ($1, $2, $3, 'RESERVED')`,
            [reservationId, id, quantity]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return Product.fromDatabase(productResult.rows[0]);

    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }

        if (error.code === '23505') {
            throw new ProductServiceError(
                'El identificador de reserva ya está registrado',
                409
            );
        }

        throw error;

    } finally {
        client.release();
    }
};


// Liberar inventario

export const releaseStock = async (id, reservationId) => {
    validateUUID(id);

    if (
        typeof reservationId !== 'string' ||
        !uuidRegex.test(reservationId)
    ) {
        throw new ProductServiceError(
            'Se requiere un identificador de reserva UUID válido',
            400
        );
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        // Buscar y bloquear la reserva
        const reservationResult = await client.query(
            `SELECT *
             FROM product_reservations
             WHERE reservation_id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (reservationResult.rows.length === 0) {
            throw new ProductServiceError(
                'Reserva no encontrada',
                404
            );
        }

        const reservation = reservationResult.rows[0];

        if (reservation.product_id !== id) {
            throw new ProductServiceError(
                'La reserva no pertenece a este producto',
                409
            );
        }

        // Si ya fue liberada, no modificar nuevamente el inventario
        if (reservation.status === 'RELEASED') {
            const productResult = await client.query(
                'SELECT * FROM products WHERE id = $1',
                [id]
            );

            if (productResult.rows.length === 0) {
                throw new ProductServiceError(
                    'Producto no encontrado',
                    404
                );
            }

            await client.query('COMMIT');
            transactionStarted = false;

            return Product.fromDatabase(productResult.rows[0]);
        }

        // Devolver las unidades al inventario
        const productResult = await client.query(
            `UPDATE products
             SET stock = stock + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [reservation.quantity, id]
        );

        if (productResult.rows.length === 0) {
            throw new ProductServiceError(
                'Producto no encontrado',
                404
            );
        }

        // Cambiar el estado de la reserva
        await client.query(
            `UPDATE product_reservations
             SET status = 'RELEASED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE reservation_id = $1`,
            [reservationId]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return Product.fromDatabase(productResult.rows[0]);

    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }

        throw error;

    } finally {
        client.release();
    }
};

