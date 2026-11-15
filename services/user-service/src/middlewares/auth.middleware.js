
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Verificar que exista el encabezado Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Se requiere un token de autenticación'
        });
    }

    const token = authHeader.split(' ')[1];

    // Verificar la configuración del servidor
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET no está configurada');

        return res.status(500).json({
            message: 'Error de configuración del servidor'
        });
    }

    try {
        // Verificar firma y expiración del token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (typeof decoded.sub !== 'string') {
            return res.status(401).json({
                message: 'Token inválido o expirado'
            });
        }

        // Adjuntar el usuario autenticado a la petición
        req.user = {
            id: decoded.sub
        };

        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Token inválido o expirado'
        });
    }
};
