
import {
    jest,
    describe,
    test,
    expect,
    beforeEach
} from '@jest/globals';

import jwt from 'jsonwebtoken';

import bcrypt from 'bcryptjs';

// Simular PostgreSQL
jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: {
        query: jest.fn()
    }
}));

// Importar después de configurar el mock
const { default: pool } = await import('../../src/config/database.js');

const {
    registerUser,
    loginUser,
    UserServiceError
} = await import('../../src/services/user.service.js');

describe('Pruebas unitarias - Registro de usuarios', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Debe registrar un usuario correctamente', async () => {

        pool.query.mockResolvedValue({
            rows: [{
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Juan Perez',
                email: 'juan@example.com',
                created_at: new Date()
            }]
        });

        const user = await registerUser({
            name: 'Juan Perez',
            email: 'juan@example.com',
            password: 'Password123'
        });

        expect(user.email).toBe('juan@example.com');

        const queryParams = pool.query.mock.calls[0][1];
        const passwordHash = queryParams[2];

        expect(queryParams[0]).toBe('Juan Perez');
        expect(queryParams[1]).toBe('juan@example.com');

        expect(
            await bcrypt.compare('Password123', passwordHash)
        ).toBe(true);
    });

    test('Debe normalizar el nombre y el correo', async () => {

        pool.query.mockResolvedValue({
            rows: [{
                id: '123',
                name: 'Juan Perez',
                email: 'juan@example.com'
            }]
        });

        await registerUser({
            name: ' Juan Perez ',
            email: ' JUAN@EXAMPLE.COM ',
            password: 'Password123'
        });

        const queryParams = pool.query.mock.calls[0][1];

        expect(queryParams[0]).toBe('Juan Perez');
        expect(queryParams[1]).toBe('juan@example.com');
    });

    test('Debe rechazar campos obligatorios vacíos', async () => {

        await expect(
            registerUser({
                name: '',
                email: '',
                password: ''
            })
        ).rejects.toMatchObject({
            message: 'Nombre, correo y contraseña son obligatorios',
            statusCode: 400
        });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('Debe rechazar un correo inválido', async () => {

        await expect(
            registerUser({
                name: 'Juan Perez',
                email: 'correo-invalido',
                password: 'Password123'
            })
        ).rejects.toBeInstanceOf(UserServiceError);

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('Debe rechazar contraseñas menores a 8 caracteres', async () => {

        await expect(
            registerUser({
                name: 'Juan Perez',
                email: 'juan@example.com',
                password: '1234567'
            })
        ).rejects.toMatchObject({
            statusCode: 400
        });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('Debe rechazar correos duplicados', async () => {

        pool.query.mockRejectedValue({
            code: '23505'
        });

        await expect(
            registerUser({
                name: 'Juan Perez',
                email: 'juan@example.com',
                password: 'Password123'
            })
        ).rejects.toMatchObject({
            message: 'El correo electrónico ya está registrado',
            statusCode: 409
        });
    });

    test('Debe propagar errores inesperados de PostgreSQL', async () => {

        pool.query.mockRejectedValue(
            new Error('Error de conexión')
        );

        await expect(
            registerUser({
                name: 'Juan Perez',
                email: 'juan@example.com',
                password: 'Password123'
            })
        ).rejects.toThrow('Error de conexión');
    });

});




// Pruebas unitarias - Inicio de sesión
describe('Pruebas unitarias - Inicio de sesión', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'clave_secreta_para_pruebas';
    });

    test('Debe iniciar sesión correctamente y generar un token JWT', async () => {

        const passwordHash = await bcrypt.hash('Password123', 10);

        pool.query.mockResolvedValue({
            rows: [{
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Juan Perez',
                email: 'juan@example.com',
                password_hash: passwordHash
            }]
        });

        const result = await loginUser({
            email: 'juan@example.com',
            password: 'Password123'
        });

        expect(result).toHaveProperty('token');
        expect(result.user).toEqual({
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Juan Perez',
            email: 'juan@example.com'
        });

        // Verificar que el token sea válido y contenga el ID del usuario
        const decoded = jwt.verify(
            result.token,
            process.env.JWT_SECRET
        );

        expect(decoded.sub).toBe('123e4567-e89b-12d3-a456-426614174000');

        // Verificar que la consulta utilice el correo normalizado
        expect(pool.query.mock.calls[0][1]).toEqual(['juan@example.com']);

        // El hash nunca debe exponerse en la respuesta
        expect(result.user).not.toHaveProperty('password_hash');
    });

    test('Debe normalizar el correo antes de buscar al usuario', async () => {

        const passwordHash = await bcrypt.hash('Password123', 10);

        pool.query.mockResolvedValue({
            rows: [{
                id: '123',
                name: 'Juan Perez',
                email: 'juan@example.com',
                password_hash: passwordHash
            }]
        });

        await loginUser({
            email: ' JUAN@EXAMPLE.COM ',
            password: 'Password123'
        });

        expect(pool.query.mock.calls[0][1]).toEqual([
            'juan@example.com'
        ]);
    });

    test('Debe rechazar el inicio de sesión si el usuario no existe', async () => {

        pool.query.mockResolvedValue({
            rows: []
        });

        await expect(
            loginUser({
                email: 'inexistente@example.com',
                password: 'Password123'
            })
        ).rejects.toMatchObject({
            message: 'Correo o contraseña incorrectos',
            statusCode: 401
        });
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

        await expect(
            loginUser({
                email: 'juan@example.com',
                password: 'PasswordIncorrecta'
            })
        ).rejects.toMatchObject({
            message: 'Correo o contraseña incorrectos',
            statusCode: 401
        });
    });

    test('Debe rechazar campos obligatorios vacíos', async () => {

        await expect(
            loginUser({
                email: '',
                password: ''
            })
        ).rejects.toMatchObject({
            message: 'Correo y contraseña son obligatorios',
            statusCode: 400
        });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('Debe rechazar datos con tipos incorrectos', async () => {

        await expect(
            loginUser({
                email: 12345,
                password: 'Password123'
            })
        ).rejects.toMatchObject({
            message: 'Los datos enviados tienen un formato inválido',
            statusCode: 400
        });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('Debe generar un error si JWT_SECRET no está configurada', async () => {

        const passwordHash = await bcrypt.hash('Password123', 10);

        pool.query.mockResolvedValue({
            rows: [{
                id: '123',
                name: 'Juan Perez',
                email: 'juan@example.com',
                password_hash: passwordHash
            }]
        });

        delete process.env.JWT_SECRET;

        await expect(
            loginUser({
                email: 'juan@example.com',
                password: 'Password123'
            })
        ).rejects.toThrow('JWT_SECRET no está configurada');
    });

});