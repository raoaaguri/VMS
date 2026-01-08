import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import vendorRoutes from './modules/vendors/vendor.routes.js';
import { adminRouter as adminPoRoutes, vendorRouter as vendorPoRoutes } from './modules/pos/po.routes.js';
import erpRoutes from './modules/erp/erp.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { logger } from './utils/logger.js';

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

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin/vendors', vendorRoutes);
app.use('/admin/pos', adminPoRoutes);
app.use('/vendor/pos', vendorPoRoutes);
app.use('/erp', erpRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
