
import { Router } from 'express';

import {
    registerUser,
    loginUser,
    getCurrentUser,
    getUserByIdCont,
    updateUserController
} from '../controllers/user.controller.js';

import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// Ruta protegida
router.get('/me', authenticateToken, getCurrentUser);

router.get('/:id', getUserByIdCont);
router.put('/:id', updateUserController);

export default router;
