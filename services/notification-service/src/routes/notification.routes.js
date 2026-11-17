import { Router } from 'express';
import NotificationController from '../controllers/NotificationController.js';

const router = Router();

// Obtener todas las notificaciones
router.get('/', (req, res) =>
    NotificationController.getAllNotifications(req, res)
);

// Obtener notificaciones por usuario
router.get('/user/:userId', (req, res) =>
    NotificationController.getNotificationsByUserId(req, res)
);

// Obtener una notificación por ID
router.get('/:id', (req, res) =>
    NotificationController.getNotificationById(req, res)
);

// Registrar una notificación
router.post('/', (req, res) =>
    NotificationController.createNotification(req, res)
);

// Actualizar el estado de una notificación
router.patch('/:id/status', (req, res) =>
    NotificationController.updateNotificationStatus(req, res)
);

// Eliminar una notificación
router.delete('/:id', (req, res) =>
    NotificationController.deleteNotification(req, res)
);

export default router;