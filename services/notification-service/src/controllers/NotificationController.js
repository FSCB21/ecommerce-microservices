
import NotificationService from '../services/NotificationService.js';

class NotificationController {

    // GET: Obtener todas las notificaciones
    async getAllNotifications(req, res) {
        try {
            const notifications = await NotificationService.getAllNotifications();

            return res.status(200).json({
                success: true,
                total: notifications.length,
                data: notifications
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener las notificaciones',
                error: error.message
            });
        }
    }

    // GET: Obtener una notificación por ID
    async getNotificationById(req, res) {
        try {
            const { id } = req.params;

            const notification = await NotificationService.getNotificationById(id);

            return res.status(200).json({
                success: true,
                data: notification
            });
        } catch (error) {
            const statusCode = error.message === 'Notificación no encontrada' ? 404 : 500;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // GET: Obtener notificaciones por usuario
    async getNotificationsByUserId(req, res) {
        try {
            const { userId } = req.params;

            const notifications = await NotificationService.getNotificationsByUserId(userId);

            return res.status(200).json({
                success: true,
                total: notifications.length,
                data: notifications
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener las notificaciones del usuario',
                error: error.message
            });
        }
    }

    // POST: Crear una notificación
    async createNotification(req, res) {
        try {
            const {
                event_id,
                user_id,
                order_id,
                recipient_email,
                type,
                message
            } = req.body;

            const requiredFields = {
                event_id,
                user_id,
                order_id,
                recipient_email,
                type,
                message
            };

            const missingFields = Object.entries(requiredFields)
                .filter(([key, value]) => value === undefined || value === null || value === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios',
                    fields: missingFields
                });
            }

            const notification = await NotificationService.createNotification(req.body);

            return res.status(201).json({
                success: true,
                message: 'Notificación registrada correctamente',
                data: notification
            });
        } catch (error) {
            if (error.name === 'SequelizeValidationError' ||
                error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'Los datos de la notificación no son válidos',
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error al registrar la notificación',
                error: error.message
            });
        }
    }

    // PATCH: Actualizar el estado de una notificación
    async updateNotificationStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'El campo status es obligatorio'
                });
            }

            const notification = await NotificationService.updateNotificationStatus(id, status);

            return res.status(200).json({
                success: true,
                message: 'Estado de la notificación actualizado correctamente',
                data: notification
            });
        } catch (error) {
            const statusCode = error.message === 'Notificación no encontrada' ? 404 :
                error.message === 'Estado de notificación no válido' ? 400 : 500;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // DELETE: Eliminar una notificación
    async deleteNotification(req, res) {
        try {
            const { id } = req.params;

            const result = await NotificationService.deleteNotification(id);

            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            const statusCode = error.message === 'Notificación no encontrada' ? 404 : 500;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new NotificationController();
