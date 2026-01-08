import * as authService from './auth.service.js';
import { BadRequestError } from '../../utils/httpErrors.js';

export async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await authService.login(email, password);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
