
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import app from '../../src/app.js';
import pool from '../../src/config/database.js';

describe('Integración - User Service', () => {
    let testEmail;
    let testPassword = 'Password123';
    let registeredUser;

    beforeAll(async () => {
        const result = await pool.query(
            'SELECT current_database() AS database_name'
        );

        expect(result.rows[0].database_name).toBe('users_test_db');
    });

    afterAll(async () => {
        if (testEmail) {
            await pool.query(
                'DELETE FROM users WHERE email = $1',
                [testEmail]
            );
        }

        await pool.end();
    });

    test('Debe registrar un usuario y almacenarlo en PostgreSQL', async () => {
        testEmail = `integration-${randomUUID()}@example.com`;

        const response = await request(app)
            .post('/api/users/register')
            .send({
                name: 'Usuario de Integracion',
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user).not.toHaveProperty('password_hash');

        registeredUser = response.body.user;

        const result = await pool.query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [testEmail]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].name).toBe('Usuario de Integracion');
        expect(result.rows[0].email).toBe(testEmail);
        expect(result.rows[0].password_hash).not.toBe(testPassword);
    });

    test('Debe iniciar sesión y generar un JWT válido', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.id).toBe(registeredUser.id);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user).not.toHaveProperty('password_hash');

        const decoded = jwt.verify(
            response.body.token,
            process.env.JWT_SECRET
        );

        expect(decoded.sub).toBe(registeredUser.id);
    });

    test('No debe iniciar sesión con una contraseña incorrecta', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: testEmail,
                password: 'PasswordIncorrecta'
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            'Correo o contraseña incorrectos'
        );
        expect(response.body).not.toHaveProperty('token');
    });

    test('No debe iniciar sesión con un correo inexistente', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: `inexistente-${randomUUID()}@example.com`,
                password: testPassword
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            'Correo o contraseña incorrectos'
        );
        expect(response.body).not.toHaveProperty('token');
    });



    test('Debe consultar el perfil del usuario con un JWT válido', async () => {
        const loginResponse = await request(app)
            .post('/api/users/login')
            .send({
                email: testEmail,
                password: testPassword
            });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body).toHaveProperty('token');

        const token = loginResponse.body.token;

        const profileResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${token}`);

        expect(profileResponse.statusCode).toBe(200);
        expect(profileResponse.body.user.id).toBe(registeredUser.id);
        expect(profileResponse.body.user.email).toBe(testEmail);
        expect(profileResponse.body.user).not.toHaveProperty('password_hash');
    });

    test('No debe consultar el perfil sin un JWT', async () => {
        const response = await request(app)
            .get('/api/users/me');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            'Se requiere un token de autenticación'
        );
    });



    test('Debe consultar un usuario existente por su ID', async () => {
        const response = await request(app)
            .get(`/api/users/${registeredUser.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.user.id).toBe(registeredUser.id);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user).not.toHaveProperty('password_hash');
    });

    test('Debe devolver 404 al consultar un usuario inexistente', async () => {
        const nonExistentId = randomUUID();

        const response = await request(app)
            .get(`/api/users/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Usuario no encontrado');
    });


    test('Debe actualizar un usuario existente en PostgreSQL', async () => {
        const response = await request(app)
            .put(`/api/users/${registeredUser.id}`)
            .send({
                name: 'Usuario Actualizado',
                email: `actualizado-${randomUUID()}@example.com`
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe(
            'Usuario actualizado correctamente'
        );
        expect(response.body.user.name).toBe('Usuario Actualizado');
        expect(response.body.user.email).toMatch(/^actualizado-/);
        expect(response.body.user).not.toHaveProperty('password_hash');

        // Comprobar directamente que PostgreSQL guardó los cambios.
        const result = await pool.query(
            'SELECT name, email FROM users WHERE id = $1',
            [registeredUser.id]
        );

        expect(result.rows[0].name).toBe('Usuario Actualizado');
        expect(result.rows[0].email).toBe(response.body.user.email);

        // Actualizar los datos utilizados por las pruebas posteriores.
        registeredUser.name = response.body.user.name;
        testEmail = response.body.user.email;
    });

    test('Debe devolver 404 al actualizar un usuario inexistente', async () => {
        const nonExistentId = randomUUID();

        const response = await request(app)
            .put(`/api/users/${nonExistentId}`)
            .send({
                name: 'Usuario Inexistente',
                email: 'inexistente@example.com'
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Usuario no encontrado');
    });


});
