
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

const mockNotificationService = {
    getAllNotifications: jest.fn(),
    getNotificationById: jest.fn(),
    getNotificationsByUserId: jest.fn(),
    createNotification: jest.fn(),
    updateNotificationStatus: jest.fn(),
    deleteNotification: jest.fn()
};

jest.unstable_mockModule('../../src/services/NotificationService.js', () => ({
    default: mockNotificationService
}));

const app = (await import('../../src/app.js')).default;

describe('Notification Service - Pruebas de API', () => {

    const notificationId = '8ecfd997-1225-472a-994a-cf9f9d48fa87';

    const notificationData = {
        event_id: 'b1000000-0000-4000-8000-000000000001',
        user_id: 'a1000000-0000-4000-8000-000000000001',
        order_id: 'c1000000-0000-4000-8000-000000000001',
        recipient_email: 'prueba@ecommerce.com',
        type: 'ORDER_CONFIRMED',
        message: 'Tu pedido ha sido confirmado correctamente.'
    };

    const notification = {
        id: notificationId,
        ...notificationData,
        status: 'PENDING',
        created_at: '2026-11-16T17:03:28.400Z',
        sent_at: null
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /health', () => {

        test('Debe comprobar que el microservicio está activo', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    service: 'notification-service',
                    status: 'UP'
                })
            );

            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('GET /api/notifications', () => {

        test('Debe devolver todas las notificaciones', async () => {
            mockNotificationService.getAllNotifications.mockResolvedValue([
                notification
            ]);

            const response = await request(app)
                .get('/api/notifications');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.total).toBe(1);
            expect(response.body.data).toEqual([notification]);
        });

        test('Debe devolver una lista vacía cuando no existen notificaciones', async () => {
            mockNotificationService.getAllNotifications.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/notifications');

            expect(response.status).toBe(200);
            expect(response.body.total).toBe(0);
            expect(response.body.data).toEqual([]);
        });

        test('Debe manejar errores al consultar notificaciones', async () => {
            mockNotificationService.getAllNotifications.mockRejectedValue(
                new Error('Error de base de datos')
            );

            const response = await request(app)
                .get('/api/notifications');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Error al obtener las notificaciones'
            );
        });
    });

    describe('GET /api/notifications/:id', () => {

        test('Debe devolver una notificación por su ID', async () => {
            mockNotificationService.getNotificationById.mockResolvedValue(
                notification
            );

            const response = await request(app)
                .get(`/api/notifications/${notificationId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(notification);
        });

        test('Debe devolver 404 cuando la notificación no existe', async () => {
            mockNotificationService.getNotificationById.mockRejectedValue(
                new Error('Notificación no encontrada')
            );

            const response = await request(app)
                .get('/api/notifications/id-inexistente');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Notificación no encontrada'
            );
        });
    });

    describe('GET /api/notifications/user/:userId', () => {

        test('Debe devolver las notificaciones de un usuario', async () => {
            mockNotificationService.getNotificationsByUserId.mockResolvedValue([
                notification
            ]);

            const response = await request(app)
                .get(`/api/notifications/user/${notificationData.user_id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.total).toBe(1);
            expect(response.body.data).toEqual([notification]);

            expect(
                mockNotificationService.getNotificationsByUserId
            ).toHaveBeenCalledWith(notificationData.user_id);
        });

        test('Debe devolver una lista vacía si el usuario no tiene notificaciones', async () => {
            mockNotificationService.getNotificationsByUserId.mockResolvedValue([]);

            const response = await request(app)
                .get(`/api/notifications/user/${notificationData.user_id}`);

            expect(response.status).toBe(200);
            expect(response.body.total).toBe(0);
            expect(response.body.data).toEqual([]);
        });

        test('Debe manejar errores al consultar por usuario', async () => {
            mockNotificationService.getNotificationsByUserId.mockRejectedValue(
                new Error('Error de base de datos')
            );

            const response = await request(app)
                .get(`/api/notifications/user/${notificationData.user_id}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/notifications', () => {

        test('Debe registrar una nueva notificación', async () => {
            mockNotificationService.createNotification.mockResolvedValue(
                notification
            );

            const response = await request(app)
                .post('/api/notifications')
                .send(notificationData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                'Notificación registrada correctamente'
            );
            expect(response.body.data).toEqual(notification);

            expect(
                mockNotificationService.createNotification
            ).toHaveBeenCalledWith(notificationData);
        });

        test('Debe rechazar solicitudes sin campos obligatorios', async () => {
            const incompleteData = {
                user_id: notificationData.user_id,
                order_id: notificationData.order_id
            };

            const response = await request(app)
                .post('/api/notifications')
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Faltan campos obligatorios'
            );
            expect(response.body.fields).toEqual(
                expect.arrayContaining([
                    'event_id',
                    'recipient_email',
                    'type',
                    'message'
                ])
            );

            expect(
                mockNotificationService.createNotification
            ).not.toHaveBeenCalled();
        });

        test('Debe rechazar un correo electrónico inválido', async () => {
            mockNotificationService.createNotification.mockRejectedValue({
                name: 'SequelizeValidationError',
                message: 'Validation error'
            });

            const response = await request(app)
                .post('/api/notifications')
                .send({
                    ...notificationData,
                    recipient_email: 'correo-invalido'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Los datos de la notificación no son válidos'
            );
        });

        test('Debe manejar errores internos al crear una notificación', async () => {
            mockNotificationService.createNotification.mockRejectedValue(
                new Error('Error interno')
            );

            const response = await request(app)
                .post('/api/notifications')
                .send(notificationData);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Error al registrar la notificación'
            );
        });
    });

    describe('PATCH /api/notifications/:id/status', () => {

        test('Debe actualizar el estado de una notificación', async () => {
            const updatedNotification = {
                ...notification,
                status: 'SENT',
                sent_at: '2026-11-16T17:05:02.051Z'
            };

            mockNotificationService.updateNotificationStatus.mockResolvedValue(
                updatedNotification
            );

            const response = await request(app)
                .patch(`/api/notifications/${notificationId}/status`)
                .send({ status: 'SENT' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('SENT');
            expect(response.body.data.sent_at).toBeDefined();
        });

        test('Debe rechazar una actualización sin estado', async () => {
            const response = await request(app)
                .patch(`/api/notifications/${notificationId}/status`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'El campo status es obligatorio'
            );

            expect(
                mockNotificationService.updateNotificationStatus
            ).not.toHaveBeenCalled();
        });

        test('Debe rechazar estados no permitidos', async () => {
            mockNotificationService.updateNotificationStatus.mockRejectedValue(
                new Error('Estado de notificación no válido')
            );

            const response = await request(app)
                .patch(`/api/notifications/${notificationId}/status`)
                .send({ status: 'URGENT' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Estado de notificación no válido'
            );
        });

        test('Debe devolver 404 cuando la notificación no existe', async () => {
            mockNotificationService.updateNotificationStatus.mockRejectedValue(
                new Error('Notificación no encontrada')
            );

            const response = await request(app)
                .patch('/api/notifications/id-inexistente/status')
                .send({ status: 'SENT' });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/notifications/:id', () => {

        test('Debe eliminar una notificación correctamente', async () => {
            mockNotificationService.deleteNotification.mockResolvedValue({
                message: 'Notificación eliminada correctamente'
            });

            const response = await request(app)
                .delete(`/api/notifications/${notificationId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                'Notificación eliminada correctamente'
            );
        });

        test('Debe devolver 404 cuando se intenta eliminar una notificación inexistente', async () => {
            mockNotificationService.deleteNotification.mockRejectedValue(
                new Error('Notificación no encontrada')
            );

            const response = await request(app)
                .delete('/api/notifications/id-inexistente');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Rutas inexistentes', () => {

        test('Debe devolver 404 para endpoints no registrados', async () => {
            const response = await request(app)
                .get('/api/endpoint-inexistente');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                'Endpoint no encontrado'
            );
        });
    });
});
