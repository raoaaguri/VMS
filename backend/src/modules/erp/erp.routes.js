import express from 'express';
import * as erpController from './erp.controller.js';
import { requireErpApiKey } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireErpApiKey);

router.post('/vendors', erpController.createOrUpdateVendor);
router.post('/pos', erpController.createPo);

export default router;
