
import { Notification } from '../models/index.js';
import EmailService from './EmailService.js';

class NotificationService {

    // Obtener todas las notificaciones
    async getAllNotifications() {
        return await Notification.findAll({
            order: [['created_at', 'DESC']]
        });
    }

    // Obtener una notificación por su ID
    async getNotificationById(id) {
        const notification = await Notification.findByPk(id);

        if (!notification) {
            throw new Error('Notificación no encontrada');
        }

        return notification;
    }

    // Obtener notificaciones de un usuario
    async getNotificationsByUserId(userId) {
        return await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
    }

    // Registrar una notificación y enviar el correo
    async createNotification(data) {
        const {
            event_id,
            user_id,
            order_id,
            recipient_email,
            type,
            message
        } = data;

        const existingNotification = await Notification.findOne({
            where: { event_id }
        });

        if (existingNotification) {
            return existingNotification;
        }

        const notification = await Notification.create({
            event_id,
            user_id,
            order_id,
            recipient_email,
            type,
            message,
            status: 'PENDING'
        });

        try {
            await EmailService.sendNotification(notification);

            notification.status = 'SENT';
            notification.sent_at = new Date();

            await notification.save();

            console.log(
                `Notificación enviada para el pedido ${order_id}`
            );

        } catch (error) {
            notification.status = 'FAILED';
            notification.sent_at = null;

            await notification.save();

            console.error(
                `Error enviando notificación ${notification.id}:`,
                error.message
            );
        }

        return notification;
    }

    // Actualizar el estado de una notificación
    async updateNotificationStatus(id, status) {
        const allowedStatuses = ['PENDING', 'SENT', 'FAILED'];

        if (!allowedStatuses.includes(status)) {
            throw new Error('Estado de notificación no válido');
        }

        const notification = await this.getNotificationById(id);

        notification.status = status;

        if (status === 'SENT') {
            notification.sent_at = new Date();
        } else {
            notification.sent_at = null;
        }

        await notification.save();

        return notification;
    }

    // Eliminar una notificación
    async deleteNotification(id) {
        const notification = await this.getNotificationById(id);

        await notification.destroy();

        return {
            message: 'Notificación eliminada correctamente'
        };
    }
}

export default new NotificationService();
