
import { Router } from 'express';

import {
    create,
    getAll,
    getById,
    update,
    remove,
    reserve,
    release
} from '../controllers/product.controller.js';

const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

router.put('/:id/reserve', reserve);
router.put('/:id/release', release);

export default router;
