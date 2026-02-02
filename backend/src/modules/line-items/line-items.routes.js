import express from "express";
import {
  getAdminLineItems,
  getVendorLineItems,
} from "./line-items.controller.js";
import {
  authMiddleware,
  requireAdmin,
  requireVendor,
} from "../../middlewares/auth.middleware.js";

export const adminRouter = express.Router();
export const vendorRouter = express.Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);
adminRouter.get("/", getAdminLineItems);

vendorRouter.use(authMiddleware);
vendorRouter.use(requireVendor);
vendorRouter.get("/", getVendorLineItems);
