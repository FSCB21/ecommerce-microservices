
import { jest, describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

import sequelize from '../../src/config/database.js';
import { Notification } from '../../src/models/index.js';
import NotificationService from '../../src/services/NotificationService.js';

describe('NotificationService - Pruebas de integración con PostgreSQL', () => {

    const notificationData = {
        event_id: 'b1000000-0000-4000-8000-000000000001',
        user_id: 'a1000000-0000-4000-8000-000000000001',
        order_id: 'c1000000-0000-4000-8000-000000000001',
        recipient_email: 'integracion@ecommerce.com',
        type: 'ORDER_CONFIRMED',
        message: 'Tu pedido ha sido confirmado correctamente.'
    };

    beforeAll(async () => {
        expect(sequelize.config.database).toBe('notifications_test_db');

        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await Notification.destroy({
            where: {},
            truncate: true,
            cascade: true
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('createNotification()', () => {

        test('Debe registrar una notificación en PostgreSQL', async () => {
            const notification = await NotificationService.createNotification(
                notificationData
            );

            expect(notification).toBeDefined();
            expect(notification.id).toBeDefined();
            expect(notification.event_id).toBe(notificationData.event_id);
            expect(notification.user_id).toBe(notificationData.user_id);
            expect(notification.order_id).toBe(notificationData.order_id);
            expect(notification.recipient_email).toBe(notificationData.recipient_email);
            expect(notification.status).toBe('PENDING');

            const savedNotification = await Notification.findByPk(notification.id);

            expect(savedNotification).not.toBeNull();
            expect(savedNotification.message).toBe(notificationData.message);
        });

        test('No debe registrar dos notificaciones para el mismo evento', async () => {
            const firstNotification =
                await NotificationService.createNotification(notificationData);

            const secondNotification =
                await NotificationService.createNotification(notificationData);

            expect(secondNotification.id).toBe(firstNotification.id);

            const total = await Notification.count();

            expect(total).toBe(1);
        });

    });

    describe('getAllNotifications()', () => {

        test('Debe consultar todas las notificaciones almacenadas', async () => {
            await NotificationService.createNotification(notificationData);

            const notifications =
                await NotificationService.getAllNotifications();

            expect(notifications).toHaveLength(1);
            expect(notifications[0].event_id).toBe(notificationData.event_id);
        });

        test('Debe devolver una lista vacía cuando no existen notificaciones', async () => {
            const notifications =
                await NotificationService.getAllNotifications();

            expect(notifications).toEqual([]);
        });

    });

    describe('getNotificationById()', () => {

        test('Debe consultar una notificación por su identificador', async () => {
            const createdNotification =
                await NotificationService.createNotification(notificationData);

            const notification =
                await NotificationService.getNotificationById(createdNotification.id);

            expect(notification.id).toBe(createdNotification.id);
            expect(notification.event_id).toBe(notificationData.event_id);
        });

        test('Debe generar un error cuando la notificación no existe', async () => {
            await expect(
                NotificationService.getNotificationById(
                    'd1000000-0000-4000-8000-000000000001'
                )
            ).rejects.toThrow('Notificación no encontrada');
        });

    });

    describe('getNotificationsByUserId()', () => {

        test('Debe consultar las notificaciones de un usuario', async () => {
            await NotificationService.createNotification(notificationData);

            const notifications =
                await NotificationService.getNotificationsByUserId(
                    notificationData.user_id
                );

            expect(notifications).toHaveLength(1);
            expect(notifications[0].user_id).toBe(notificationData.user_id);
        });

        test('Debe devolver una lista vacía si el usuario no tiene notificaciones', async () => {
            const notifications =
                await NotificationService.getNotificationsByUserId(
                    'a2000000-0000-4000-8000-000000000002'
                );

            expect(notifications).toEqual([]);
        });

    });

    describe('updateNotificationStatus()', () => {

        test('Debe actualizar el estado de PENDING a SENT y registrar sent_at', async () => {
            const createdNotification =
                await NotificationService.createNotification(notificationData);

            const updatedNotification =
                await NotificationService.updateNotificationStatus(
                    createdNotification.id,
                    'SENT'
                );

            expect(updatedNotification.status).toBe('SENT');
            expect(updatedNotification.sent_at).not.toBeNull();

            const savedNotification =
                await Notification.findByPk(createdNotification.id);

            expect(savedNotification.status).toBe('SENT');
            expect(savedNotification.sent_at).not.toBeNull();
        });

        test('Debe actualizar el estado a FAILED', async () => {
            const createdNotification =
                await NotificationService.createNotification(notificationData);

            const updatedNotification =
                await NotificationService.updateNotificationStatus(
                    createdNotification.id,
                    'FAILED'
                );

            expect(updatedNotification.status).toBe('FAILED');
            expect(updatedNotification.sent_at).toBeNull();
        });

        test('Debe rechazar un estado no permitido', async () => {
            const createdNotification =
                await NotificationService.createNotification(notificationData);

            await expect(
                NotificationService.updateNotificationStatus(
                    createdNotification.id,
                    'URGENT'
                )
            ).rejects.toThrow('Estado de notificación no válido');
        });

    });

    describe('deleteNotification()', () => {

        test('Debe eliminar una notificación de PostgreSQL', async () => {
            const createdNotification =
                await NotificationService.createNotification(notificationData);

            const result =
                await NotificationService.deleteNotification(createdNotification.id);

            expect(result.message).toBe('Notificación eliminada correctamente');

            const deletedNotification =
                await Notification.findByPk(createdNotification.id);

            expect(deletedNotification).toBeNull();
        });

        test('Debe generar un error cuando se intenta eliminar una notificación inexistente', async () => {
            await expect(
                NotificationService.deleteNotification(
                    'd2000000-0000-4000-8000-000000000002'
                )
            ).rejects.toThrow('Notificación no encontrada');
        });

    });

});
