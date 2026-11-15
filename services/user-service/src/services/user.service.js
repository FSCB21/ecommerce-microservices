
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'UserServiceError';
        this.statusCode = statusCode;
    }
}

export const registerUser = async ({ name, email, password }) => {

    // Validar campos obligatorios
    if (!name || !email || !password) {
        throw new UserServiceError(
            'Nombre, correo y contraseña son obligatorios',
            400
        );
    }

    // Validar tipos de datos
    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        throw new UserServiceError(
            'Los datos enviados tienen un formato inválido',
            400
        );
    }

    // Normalizar datos
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
        throw new UserServiceError(
            'El nombre no puede estar vacío',
            400
        );
    }

    // Validar correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
        throw new UserServiceError(
            'El correo electrónico no tiene un formato válido',
            400
        );
    }

    // Validar contraseña
    if (password.length < 8) {
        throw new UserServiceError(
            'La contraseña debe tener al menos 8 caracteres',
            400
        );
    }

    // Generar hash
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [normalizedName, normalizedEmail, passwordHash]
        );

        return result.rows[0];

    } catch (error) {
        if (error.code === '23505') {
            throw new UserServiceError(
                'El correo electrónico ya está registrado',
                409
            );
        }

        throw error;
    }
};



export const loginUser = async ({ email, password }) => {

    // Validar campos obligatorios
    if (!email || !password) {
        throw new UserServiceError(
            'Correo y contraseña son obligatorios',
            400
        );
    }

    // Validar tipos
    if (
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        throw new UserServiceError(
            'Los datos enviados tienen un formato inválido',
            400
        );
    }

    // Normalizar correo
    const normalizedEmail = email.trim().toLowerCase();

    // Buscar usuario
    const result = await pool.query(
        `SELECT id, name, email, password_hash
         FROM users
         WHERE email = $1`,
        [normalizedEmail]
    );

    const user = result.rows[0];

    // Validar existencia y contraseña
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new UserServiceError(
            'Correo o contraseña incorrectos',
            401
        );
    }

    // Verificar configuración JWT
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET no está configurada');
    }

    // Generar token
    const token = jwt.sign(
        { sub: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };
};


export const getUserById = async (id) => {

     // Validar formato UUID antes de consultar PostgreSQL
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof id !== 'string' || !uuidRegex.test(id)) {
        throw new UserServiceError(
            'El identificador del usuario no tiene un formato UUID válido',
            400
        );
    }


    const result = await pool.query(
        `SELECT id, name, email, created_at
         FROM users
         WHERE id = $1`,
        [id]
    );

    const user = result.rows[0];

    if (!user) {
        throw new UserServiceError('Usuario no encontrado', 404);
    }

    return user;
};


export const updateUser = async (id, { name, email }) => {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof id !== 'string' || !uuidRegex.test(id)) {
        throw new UserServiceError(
            'El identificador del usuario no tiene un formato UUID válido',
            400
        );
    }

    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        !name.trim() ||
        !email.trim()
    ) {
        throw new UserServiceError(
            'Nombre y correo electrónico son obligatorios',
            400
        );
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length > 100) {
        throw new UserServiceError(
            'El nombre no puede superar los 100 caracteres',
            400
        );
    }

    if (normalizedEmail.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new UserServiceError(
            'El correo electrónico no tiene un formato válido',
            400
        );
    }

    try {
        const result = await pool.query(
            `UPDATE users
             SET name = $1,
                 email = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, name, email, created_at, updated_at`,
            [normalizedName, normalizedEmail, id]
        );

        if (result.rows.length === 0) {
            throw new UserServiceError('Usuario no encontrado', 404);
        }

        return result.rows[0];

    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }

        if (error.code === '23505') {
            throw new UserServiceError(
                'El correo electrónico ya está registrado',
                409
            );
        }

        throw error;
    }
};
