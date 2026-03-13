import express from "express";
import * as poController from "./po.controller.js";
import {
  authMiddleware,
  requireAdmin,
  requireVendor,
} from "../../middlewares/auth.middleware.js";
import { checkDitosGrnToken } from "../../middlewares/ditosGrn.middleware.js";

const adminRouter = express.Router();
const vendorRouter = express.Router();
const publicRouter = express.Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);

adminRouter.get("/", poController.getPosAdmin);
adminRouter.post("/import", poController.importPosFromCsv);
adminRouter.get("/:id", poController.getPoById);
adminRouter.get("/:id/history", poController.getPoHistory);
adminRouter.put("/:id/priority", poController.updatePoPriority);
adminRouter.put("/:id/status", poController.updatePoStatus);
adminRouter.put("/:id/closure", poController.updatePoClosure);
adminRouter.put("/priority-batch", poController.updatePoPriorityBatch);
adminRouter.put(
  "/:poId/line-items/:lineItemId/priority",
  poController.updateLineItemPriority,
);
adminRouter.post(
  "/:poId/line-items/import",
  poController.importPoLineItemsFromCsv,
);

// Public route for creating POs (no auth required)
publicRouter.post("/", poController.createPo);

// Public GRN API - No authentication required
publicRouter.post("/pos/update-quantity", poController.updatePoQuantity);

vendorRouter.use(authMiddleware);
vendorRouter.use(requireVendor);

vendorRouter.get("/", poController.getPosVendor);
vendorRouter.get("/:id", poController.getPoById);
vendorRouter.get("/:id/history", poController.getPoHistory);
vendorRouter.post("/:id/accept", poController.acceptPo);
vendorRouter.put(
  "/:poId/line-items/:lineItemId/expected-delivery-date",
  poController.updateLineItemExpectedDate,
);
vendorRouter.put(
  "/expected-delivery-date",
  poController.updatePoExpectedDateBatch,
);
vendorRouter.put(
  "/:poId/line-items/:lineItemId/status",
  poController.updateLineItemStatus,
);

export { adminRouter, vendorRouter, publicRouter };
