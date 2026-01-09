import express from 'express';
import { getAdminDashboardStats, getVendorDashboardStats } from './dashboard.controller.js';
import { authMiddleware, requireAdmin, requireVendor } from '../../middlewares/auth.middleware.js';

export const adminRouter = express.Router();
export const vendorRouter = express.Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);
adminRouter.get('/stats', getAdminDashboardStats);

vendorRouter.use(authMiddleware);
vendorRouter.use(requireVendor);
vendorRouter.get('/stats', getVendorDashboardStats);
