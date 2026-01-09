import express from 'express';
import * as poController from './po.controller.js';
import { authMiddleware, requireAdmin, requireVendor } from '../../middlewares/auth.middleware.js';

const adminRouter = express.Router();
const vendorRouter = express.Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);

adminRouter.get('/', poController.getPosAdmin);
adminRouter.get('/:id', poController.getPoById);
adminRouter.get('/:id/history', poController.getPoHistory);
adminRouter.put('/:id/priority', poController.updatePoPriority);
adminRouter.put('/:id/status', poController.updatePoStatus);
adminRouter.put('/:id/closure', poController.updatePoClosure);
adminRouter.put('/:poId/line-items/:lineItemId/priority', poController.updateLineItemPriority);

vendorRouter.use(authMiddleware);
vendorRouter.use(requireVendor);

vendorRouter.get('/', poController.getPosVendor);
vendorRouter.get('/:id', poController.getPoById);
vendorRouter.get('/:id/history', poController.getPoHistory);
vendorRouter.post('/:id/accept', poController.acceptPo);
vendorRouter.put('/:poId/line-items/:lineItemId/expected-delivery-date', poController.updateLineItemExpectedDate);
vendorRouter.put('/:poId/line-items/:lineItemId/status', poController.updateLineItemStatus);

export { adminRouter, vendorRouter };
