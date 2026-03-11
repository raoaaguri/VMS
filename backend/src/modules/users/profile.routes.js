import express from 'express';
import bcrypt from 'bcryptjs';
import * as userService from './user.service.js';
import * as userRepository from './user.repository.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { BadRequestError } from '../../utils/httpErrors.js';

const router = express.Router();

router.use(authMiddleware);

router.put('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current and new passwords are required');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestError('Incorrect current password');
    }

    // Update password using the service (handles hashing)
    await userService.updateUser(userId, { password: newPassword });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
