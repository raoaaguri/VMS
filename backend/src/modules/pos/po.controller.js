import * as poService from './po.service.js';
import { BadRequestError, ForbiddenError } from '../../utils/httpErrors.js';

export async function getPosAdmin(req, res, next) {
  try {
    const filters = {};

    if (req.query.vendor_id) filters.vendor_id = req.query.vendor_id;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.type) filters.type = req.query.type;

    const pos = await poService.getAllPos(filters);
    res.json(pos);
  } catch (error) {
    next(error);
  }
}

export async function getPosVendor(req, res, next) {
  try {
    const filters = { vendor_id: req.user.vendor_id };

    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.type) filters.type = req.query.type;

    const pos = await poService.getAllPos(filters);
    res.json(pos);
  } catch (error) {
    next(error);
  }
}

export async function getPoById(req, res, next) {
  try {
    const po = await poService.getPoById(req.params.id);
    
    // Check vendor authorization if this is a vendor request
    if (req.user && req.user.role === 'VENDOR') {
      if (!po.vendor_id) {
        return next(new BadRequestError('This purchase order is not associated with a vendor'));
      }
      if (String(po.vendor_id).trim() !== String(req.user.vendor_id).trim()) {
        return next(new ForbiddenError('You do not have permission to view this purchase order'));
      }
    }
    
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function updatePoPriority(req, res, next) {
  try {
    const { priority } = req.body;
    const po = await poService.updatePoPriority(req.params.id, priority, req.user);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function updatePoStatus(req, res, next) {
  try {
    const { status } = req.body;
    const po = await poService.updatePoStatus(req.params.id, status, req.user);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function acceptPo(req, res, next) {
  try {
    const { line_items } = req.body;
    const po = await poService.acceptPo(req.params.id, line_items, req.user);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function updateLineItemExpectedDate(req, res, next) {
  try {
    const { expected_delivery_date } = req.body;
    const lineItem = await poService.updateLineItemExpectedDate(
      req.params.poId,
      req.params.lineItemId,
      expected_delivery_date,
      req.user
    );
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
}

export async function updateLineItemStatus(req, res, next) {
  try {
    const { status } = req.body;
    const lineItem = await poService.updateLineItemStatus(
      req.params.poId,
      req.params.lineItemId,
      status,
      req.user
    );
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
}

export async function updatePoClosure(req, res, next) {
  try {
    const { closure_status, closed_amount } = req.body;
    const po = await poService.updatePoClosure(req.params.id, {
      closure_status,
      closed_amount
    }, req.user);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function getPoHistory(req, res, next) {
  try {
    const history = await poService.getPoHistory(req.params.id);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

export async function getAllHistory(req, res, next) {
  try {
    const filters = {};
    if (req.user.role === 'VENDOR') {
      filters.vendor_id = req.user.vendor_id;
    }
    const history = await poService.getAllHistory(filters);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

export async function updateLineItemPriority(req, res, next) {
  try {
    const { priority } = req.body;
    const lineItem = await poService.updateLineItemPriority(
      req.params.poId,
      req.params.lineItemId,
      priority,
      req.user
    );
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
}
