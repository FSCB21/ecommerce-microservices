
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    reserveStock,
    releaseStock
} from '../services/product.service.js';

// Crear producto
export const create = async (req, res, next) => {
    try {
        const product = await createProduct(req.body);

        return res.status(201).json({
            message: 'Producto creado correctamente',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// Consultar todos los productos
export const getAll = async (req, res, next) => {
    try {
        const products = await getAllProducts();

        return res.status(200).json({
            total: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// Consultar producto por ID
export const getById = async (req, res, next) => {
    try {
        const product = await getProductById(req.params.id);

        return res.status(200).json({
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// Actualizar producto
export const update = async (req, res, next) => {
    try {
        const product = await updateProduct(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            message: 'Producto actualizado correctamente',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// Eliminar producto
export const remove = async (req, res, next) => {
    try {
        const result = await deleteProduct(req.params.id);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Reservar inventario

export const reserve = async (req, res, next) => {
    try {
        const { quantity, reservationId } = req.body;

        const product = await reserveStock(
            req.params.id,
            quantity,
            reservationId
        );

        return res.status(200).json({
            message: 'Inventario reservado correctamente',
            data: product
        });
    } catch (error) {
        next(error);
    }
};


// Liberar inventario

export const release = async (req, res, next) => {
    try {
        const { reservationId } = req.body;

        const product = await releaseStock(
            req.params.id,
            reservationId
        );

        return res.status(200).json({
            message: 'Inventario liberado correctamente',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

