
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockNotification = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
};

jest.unstable_mockModule('../../src/models/index.js', () => ({
    Notification: mockNotification
}));

const NotificationService = (await import('../../src/services/NotificationService.js')).default;

describe('NotificationService - Pruebas unitarias', () => {

    const notificationData = {
        event_id: 'b1000000-0000-4000-8000-000000000001',
        user_id: 'a1000000-0000-4000-8000-000000000001',
        order_id: 'c1000000-0000-4000-8000-000000000001',
        recipient_email: 'prueba@ecommerce.com',
        type: 'ORDER_CONFIRMED',
        message: 'Tu pedido ha sido confirmado correctamente.'
    };

    let notification;

    beforeEach(() => {
        jest.clearAllMocks();

        notification = {
            id: '8ecfd997-1225-472a-994a-cf9f9d48fa87',
            ...notificationData,
            status: 'PENDING',
            created_at: new Date('2026-11-16T17:03:28.400Z'),
            sent_at: null,
            save: jest.fn(),
            destroy: jest.fn()
        };
    });

    describe('getAllNotifications()', () => {

        test('Debe devolver todas las notificaciones', async () => {
            mockNotification.findAll.mockResolvedValue([notification]);

            const result = await NotificationService.getAllNotifications();

            expect(result).toEqual([notification]);
            expect(mockNotification.findAll).toHaveBeenCalledWith({
                order: [['created_at', 'DESC']]
            });
        });

        test('Debe devolver una lista vacía cuando no existen notificaciones', async () => {
            mockNotification.findAll.mockResolvedValue([]);

            const result = await NotificationService.getAllNotifications();

            expect(result).toEqual([]);
        });

        test('Debe propagar errores del modelo', async () => {
            mockNotification.findAll.mockRejectedValue(
                new Error('Error de base de datos')
            );

            await expect(
                NotificationService.getAllNotifications()
            ).rejects.toThrow('Error de base de datos');
        });
    });

    describe('getNotificationById()', () => {

        test('Debe encontrar una notificación por su ID', async () => {
            mockNotification.findByPk.mockResolvedValue(notification);

            const result = await NotificationService.getNotificationById(notification.id);

            expect(result).toBe(notification);
            expect(mockNotification.findByPk).toHaveBeenCalledWith(notification.id);
        });

        test('Debe lanzar error cuando la notificación no existe', async () => {
            mockNotification.findByPk.mockResolvedValue(null);

            await expect(
                NotificationService.getNotificationById('id-inexistente')
            ).rejects.toThrow('Notificación no encontrada');
        });
    });

    describe('getNotificationsByUserId()', () => {

        test('Debe devolver las notificaciones de un usuario', async () => {
            mockNotification.findAll.mockResolvedValue([notification]);

            const result = await NotificationService.getNotificationsByUserId(
                notificationData.user_id
            );

            expect(result).toEqual([notification]);
            expect(mockNotification.findAll).toHaveBeenCalledWith({
                where: { user_id: notificationData.user_id },
                order: [['created_at', 'DESC']]
            });
        });

        test('Debe devolver una lista vacía si el usuario no tiene notificaciones', async () => {
            mockNotification.findAll.mockResolvedValue([]);

            const result = await NotificationService.getNotificationsByUserId(
                notificationData.user_id
            );

            expect(result).toEqual([]);
        });
    });

    describe('createNotification()', () => {

        test('Debe crear una notificación nueva', async () => {
            mockNotification.findOne.mockResolvedValue(null);
            mockNotification.create.mockResolvedValue(notification);

            const result = await NotificationService.createNotification(notificationData);

            expect(result).toBe(notification);
            expect(mockNotification.findOne).toHaveBeenCalledWith({
                where: { event_id: notificationData.event_id }
            });
            expect(mockNotification.create).toHaveBeenCalledWith({
                ...notificationData,
                status: 'PENDING'
            });
        });

        test('No debe crear una notificación si el evento ya existe', async () => {
            const existingNotification = {
                ...notification,
                status: 'SENT'
            };

            mockNotification.findOne.mockResolvedValue(existingNotification);

            const result = await NotificationService.createNotification(notificationData);

            expect(result).toBe(existingNotification);
            expect(mockNotification.create).not.toHaveBeenCalled();
        });

        test('Debe propagar errores al crear una notificación', async () => {
            mockNotification.findOne.mockResolvedValue(null);
            mockNotification.create.mockRejectedValue(
                new Error('Error al crear notificación')
            );

            await expect(
                NotificationService.createNotification(notificationData)
            ).rejects.toThrow('Error al crear notificación');
        });
    });

    describe('updateNotificationStatus()', () => {

        test('Debe actualizar el estado a SENT y registrar sent_at', async () => {
            mockNotification.findByPk.mockResolvedValue(notification);
            notification.save.mockResolvedValue(notification);

            const result = await NotificationService.updateNotificationStatus(
                notification.id,
                'SENT'
            );

            expect(result.status).toBe('SENT');
            expect(result.sent_at).toBeInstanceOf(Date);
            expect(notification.save).toHaveBeenCalledTimes(1);
        });

        test('Debe actualizar el estado a FAILED y limpiar sent_at', async () => {
            notification.sent_at = new Date();

            mockNotification.findByPk.mockResolvedValue(notification);
            notification.save.mockResolvedValue(notification);

            const result = await NotificationService.updateNotificationStatus(
                notification.id,
                'FAILED'
            );

            expect(result.status).toBe('FAILED');
            expect(result.sent_at).toBeNull();
            expect(notification.save).toHaveBeenCalledTimes(1);
        });

        test('Debe permitir actualizar el estado a PENDING', async () => {
            mockNotification.findByPk.mockResolvedValue(notification);
            notification.save.mockResolvedValue(notification);

            const result = await NotificationService.updateNotificationStatus(
                notification.id,
                'PENDING'
            );

            expect(result.status).toBe('PENDING');
            expect(result.sent_at).toBeNull();
        });

        test('Debe rechazar estados no permitidos', async () => {
            await expect(
                NotificationService.updateNotificationStatus(
                    notification.id,
                    'URGENT'
                )
            ).rejects.toThrow('Estado de notificación no válido');

            expect(mockNotification.findByPk).not.toHaveBeenCalled();
        });

        test('Debe lanzar error si la notificación no existe', async () => {
            mockNotification.findByPk.mockResolvedValue(null);

            await expect(
                NotificationService.updateNotificationStatus(
                    'id-inexistente',
                    'SENT'
                )
            ).rejects.toThrow('Notificación no encontrada');
        });
    });

    describe('deleteNotification()', () => {

        test('Debe eliminar una notificación existente', async () => {
            mockNotification.findByPk.mockResolvedValue(notification);
            notification.destroy.mockResolvedValue(undefined);

            const result = await NotificationService.deleteNotification(
                notification.id
            );

            expect(result).toEqual({
                message: 'Notificación eliminada correctamente'
            });

            expect(notification.destroy).toHaveBeenCalledTimes(1);
        });

        test('Debe lanzar error cuando se intenta eliminar una notificación inexistente', async () => {
            mockNotification.findByPk.mockResolvedValue(null);

            await expect(
                NotificationService.deleteNotification('id-inexistente')
            ).rejects.toThrow('Notificación no encontrada');

            expect(notification.destroy).not.toHaveBeenCalled();
        });
    });
});
