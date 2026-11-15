
import {
    registerUser as createUser,
    loginUser as authenticateUser,
    UserServiceError,
    getUserById,
    updateUser
} from '../services/user.service.js';

export const registerUser = async (req, res) => {
    try {
        const user = await createUser(req.body);

        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            user
        });

    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error('Error registrando usuario:', error);

        return res.status(500).json({
            message: 'Error interno al registrar el usuario'
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const result = await authenticateUser(req.body);

        return res.status(200).json({
            message: 'Inicio de sesión exitoso',
            ...result
        });

    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error('Error iniciando sesión:', error);

        return res.status(500).json({
            message: 'Error interno al iniciar sesión'
        });
    }
};


export const getCurrentUser = async (req, res) => {
    try {
        const user = await getUserById(req.user.id);

        return res.status(200).json({
            user
        });

    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error('Error consultando usuario autenticado:', error);

        return res.status(500).json({
            message: 'Error interno al consultar el usuario'
        });
    }
};


export const getUserByIdCont = async (req, res) => {
    try {
        const user = await getUserById(req.params.id);

        return res.status(200).json({
            user
        });
    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error('Error consultando usuario:', error);

        return res.status(500).json({
            message: 'Error interno al consultar el usuario'
        });
    }
};


export const updateUserController = async (req, res) => {
    try {
        const user = await updateUser(req.params.id, req.body);

        return res.status(200).json({
            message: 'Usuario actualizado correctamente',
            user
        });

    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error('Error actualizando usuario:', error);

        return res.status(500).json({
            message: 'Error interno al actualizar el usuario'
        });
    }
};
