import express from 'express';
import * as vendorController from './vendor.controller.js';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', vendorController.getVendors);
router.get('/:id', vendorController.getVendorById);
router.post('/', vendorController.createVendor);
router.put('/:id', vendorController.updateVendor);
router.delete('/:id', vendorController.deleteVendor);
router.post('/:id/user', vendorController.createVendorUser);

export default router;
