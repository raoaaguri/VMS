import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import vendorRoutes from './modules/vendors/vendor.routes.js';
import publicSignupRoutes from './modules/vendors/public-signup.routes.js';
import { adminRouter as adminPoRoutes, vendorRouter as vendorPoRoutes } from './modules/pos/po.routes.js';
import { adminRouter as adminLineItemRoutes, vendorRouter as vendorLineItemRoutes } from './modules/line-items/line-items.routes.js';
import { adminRouter as adminDashboardRoutes, vendorRouter as vendorDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import erpRoutes from './modules/erp/erp.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { logger } from './utils/logger.js';
import { authMiddleware, requireAdmin, requireVendor } from './middlewares/auth.middleware.js';
import { getAllHistory } from './modules/pos/po.controller.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/public', publicSignupRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin/vendors', vendorRoutes);
app.use('/admin/pos', adminPoRoutes);
app.use('/admin/line-items', adminLineItemRoutes);
app.use('/admin/dashboard', adminDashboardRoutes);
app.use('/vendor/pos', vendorPoRoutes);
app.use('/vendor/line-items', vendorLineItemRoutes);
app.use('/vendor/dashboard', vendorDashboardRoutes);
app.use('/erp', erpRoutes);

app.get('/admin/history', authMiddleware, requireAdmin, getAllHistory);
app.get('/vendor/history', authMiddleware, requireVendor, getAllHistory);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
