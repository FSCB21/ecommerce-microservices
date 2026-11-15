
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simular la conexión a PostgreSQL
jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: {
        query: jest.fn()
    }
}));

// Importar después de configurar el mock
const { default: pool } = await import('../../src/config/database.js');
const { default: app } = await import('../../src/app.js');

describe('Pruebas API - User Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =====================================
    // REGISTRO
    // =====================================

    describe('POST /api/users/register', () => {

        test('Debe registrar un usuario correctamente', async () => {

            pool.query.mockResolvedValue({
                rows: [{
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    created_at: new Date()
                }]
            });

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe(
                'Usuario registrado correctamente'
            );
            expect(response.body.user.email).toBe('juan@example.com');
            expect(response.body.user.password_hash).toBeUndefined();

            const passwordHash = pool.query.mock.calls[0][1][2];

            expect(
                await bcrypt.compare('Password123', passwordHash)
            ).toBe(true);
        });

        test('Debe rechazar campos obligatorios vacíos', async () => {

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: '',
                    email: '',
                    password: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Nombre, correo y contraseña son obligatorios'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar un correo inválido', async () => {

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: 'Juan Perez',
                    email: 'correo-invalido',
                    password: 'Password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'El correo electrónico no tiene un formato válido'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar contraseñas menores a 8 caracteres', async () => {

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password: '1234567'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'La contraseña debe tener al menos 8 caracteres'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar correos que ya están registrados', async () => {

            pool.query.mockRejectedValue({
                code: '23505'
            });

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'El correo electrónico ya está registrado'
            );
        });

        test('Debe manejar errores inesperados de PostgreSQL', async () => {

            pool.query.mockRejectedValue(
                new Error('Error de conexión')
            );

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe(
                'Error interno al registrar el usuario'
            );
        });
    });

    // =====================================
    // INICIO DE SESIÓN
    // =====================================

    describe('POST /api/users/login', () => {

        test('Debe iniciar sesión y devolver un JWT', async () => {

            const passwordHash = await bcrypt.hash('Password123', 10);

            pool.query.mockResolvedValue({
                rows: [{
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password_hash: passwordHash
                }]
            });

            const response = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'juan@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe(
                'Inicio de sesión exitoso'
            );
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('juan@example.com');
            expect(response.body.user).not.toHaveProperty('password_hash');

            const decoded = jwt.verify(
                response.body.token,
                process.env.JWT_SECRET
            );

            expect(decoded.sub).toBe(
                '123e4567-e89b-12d3-a456-426614174000'
            );
        });

        test('Debe rechazar una contraseña incorrecta', async () => {

            const passwordHash = await bcrypt.hash('Password123', 10);

            pool.query.mockResolvedValue({
                rows: [{
                    id: '123',
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    password_hash: passwordHash
                }]
            });

            const response = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'juan@example.com',
                    password: 'PasswordIncorrecta'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe(
                'Correo o contraseña incorrectos'
            );
            expect(response.body).not.toHaveProperty('token');
        });

        test('Debe rechazar un correo inexistente', async () => {

            pool.query.mockResolvedValue({
                rows: []
            });

            const response = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'inexistente@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe(
                'Correo o contraseña incorrectos'
            );
        });
    });



    describe('GET /api/users/:id', () => {

        test('Debe consultar un usuario existente', async () => {

            const userId = '4ca7bbda-02f6-4a91-8c32-123456789abc';

            pool.query.mockResolvedValue({
                rows: [{
                    id: userId,
                    name: 'Carlos Ramirez',
                    email: 'carlos@example.com',
                    created_at: new Date()
                }]
            });

            const response = await request(app)
                .get(`/api/users/${userId}`);

            expect(response.status).toBe(200);
            expect(response.body.user.id).toBe(userId);
            expect(response.body.user.name).toBe('Carlos Ramirez');
            expect(response.body.user.email).toBe('carlos@example.com');
            expect(response.body.user).not.toHaveProperty('password_hash');

            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        test('Debe devolver 404 si el usuario no existe', async () => {

            const userId = '4ca7bbda-02f6-4a91-8c32-123456789abc';

            pool.query.mockResolvedValue({
                rows: []
            });

            const response = await request(app)
                .get(`/api/users/${userId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Usuario no encontrado');
        });

        test('Debe devolver 400 si el UUID es inválido', async () => {

            const response = await request(app)
                .get('/api/users/4ca7bbda-02f6');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'El identificador del usuario no tiene un formato UUID válido'
            );

            // La consulta nunca debe llegar a PostgreSQL.
            expect(pool.query).not.toHaveBeenCalled();
        });
    });



    // =====================================
    // AUTENTICACIÓN Y RUTA PROTEGIDA
    // =====================================

    describe('GET /api/users/me', () => {

        test('Debe rechazar peticiones sin token', async () => {

            const response = await request(app)
                .get('/api/users/me');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe(
                'Se requiere un token de autenticación'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar un token inválido', async () => {

            const response = await request(app)
                .get('/api/users/me')
                .set('Authorization', 'Bearer token-invalido');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe(
                'Token inválido o expirado'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe devolver el perfil con un token válido', async () => {

            const userId = '123e4567-e89b-12d3-a456-426614174000';

            const token = jwt.sign(
                { sub: userId },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            pool.query.mockResolvedValue({
                rows: [{
                    id: userId,
                    name: 'Juan Perez',
                    email: 'juan@example.com',
                    created_at: new Date()
                }]
            });

            const response = await request(app)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.user.id).toBe(userId);
            expect(response.body.user.email).toBe('juan@example.com');
            expect(response.body.user).not.toHaveProperty('password_hash');
        });

        test('Debe responder 404 si el usuario del token no existe', async () => {

            const token = jwt.sign(
                { sub: '123e4567-e89b-12d3-a456-426614174000' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            pool.query.mockResolvedValue({
                rows: []
            });

            const response = await request(app)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe(
                'Usuario no encontrado'
            );
        });
    });


    describe('PUT /api/users/:id', () => {

        const userId = '4ca7bbda-02f6-4a91-8c32-123456789abc';

        test('Debe actualizar un usuario correctamente', async () => {

            pool.query.mockResolvedValue({
                rows: [{
                    id: userId,
                    name: 'Carlos Ramirez Actualizado',
                    email: 'carlos.actualizado@example.com',
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            });

            const response = await request(app)
                .put(`/api/users/${userId}`)
                .send({
                    name: 'Carlos Ramirez Actualizado',
                    email: 'carlos.actualizado@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe(
                'Usuario actualizado correctamente'
            );
            expect(response.body.user.name).toBe(
                'Carlos Ramirez Actualizado'
            );
            expect(response.body.user.email).toBe(
                'carlos.actualizado@example.com'
            );
            expect(response.body.user).not.toHaveProperty('password_hash');
        });

        test('Debe rechazar un UUID inválido', async () => {

            const response = await request(app)
                .put('/api/users/4ca7bbda-02f6')
                .send({
                    name: 'Carlos Ramirez',
                    email: 'carlos@example.com'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'El identificador del usuario no tiene un formato UUID válido'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe rechazar campos obligatorios vacíos', async () => {

            const response = await request(app)
                .put(`/api/users/${userId}`)
                .send({
                    name: '',
                    email: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Nombre y correo electrónico son obligatorios'
            );

            expect(pool.query).not.toHaveBeenCalled();
        });

        test('Debe devolver 404 si el usuario no existe', async () => {

            pool.query.mockResolvedValue({
                rows: []
            });

            const response = await request(app)
                .put(`/api/users/${userId}`)
                .send({
                    name: 'Carlos Ramirez',
                    email: 'carlos@example.com'
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Usuario no encontrado');
        });

        test('Debe devolver 409 si el correo ya está registrado', async () => {

            pool.query.mockRejectedValue({
                code: '23505'
            });

            const response = await request(app)
                .put(`/api/users/${userId}`)
                .send({
                    name: 'Carlos Ramirez',
                    email: 'existente@example.com'
                });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe(
                'El correo electrónico ya está registrado'
            );
        });
    });

});
