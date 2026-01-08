import express from 'express';
import * as userController from './user.controller.js';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
