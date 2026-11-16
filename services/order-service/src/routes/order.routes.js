
import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';

const router = Router();

// Crear un pedido
router.post('/', OrderController.createOrder);

// Consultar todos los pedidos
router.get('/', OrderController.getAllOrders);

// Consultar un pedido por ID
router.get('/:id', OrderController.getOrderById);

export default router;
