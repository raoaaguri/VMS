import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import vendorRoutes from "./modules/vendors/vendor.routes.js";
import publicSignupRoutes from "./modules/vendors/public-signup.routes.js";
import {
  adminRouter as adminPoRoutes,
  vendorRouter as vendorPoRoutes,
} from "./modules/pos/po.routes.js";
import {
  adminRouter as adminLineItemRoutes,
  vendorRouter as vendorLineItemRoutes,
} from "./modules/line-items/line-items.routes.js";
import {
  adminRouter as adminDashboardRoutes,
  vendorRouter as vendorDashboardRoutes,
} from "./modules/dashboard/dashboard.routes.js";
import erpRoutes from "./modules/erp/erp.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";
import { logger } from "./utils/logger.js";
import {
  authMiddleware,
  requireAdmin,
  requireVendor,
} from "./middlewares/auth.middleware.js";
import { getAllHistory } from "./modules/pos/po.controller.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/public", publicSignupRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin/vendors", vendorRoutes);
app.use("/api/v1/admin/pos", adminPoRoutes);
app.use("/api/v1/admin/line-items", adminLineItemRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/vendor/pos", vendorPoRoutes);
app.use("/api/v1/vendor/line-items", vendorLineItemRoutes);
app.use("/api/v1/vendor/dashboard", vendorDashboardRoutes);
app.use("/api/v1/erp", erpRoutes);

app.get("/api/v1/admin/history", authMiddleware, requireAdmin, getAllHistory);
app.get("/api/v1/vendor/history", authMiddleware, requireVendor, getAllHistory);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
