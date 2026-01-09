import express from 'express';
import { publicSignup } from './public-signup.controller.js';

const router = express.Router();

router.post('/vendor-signup', publicSignup);

export default router;
