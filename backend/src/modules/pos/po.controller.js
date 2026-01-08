import * as poService from './po.service.js';

export async function getPosAdmin(req, res, next) {
  try {
    const filters = {};

    if (req.query.vendor_id) filters.vendor_id = req.query.vendor_id;
    if (req.query.status) filters.status = req.query.status;

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

    const pos = await poService.getAllPos(filters);
    res.json(pos);
  } catch (error) {
    next(error);
  }
}

export async function getPoById(req, res, next) {
  try {
    const po = await poService.getPoById(req.params.id);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function updatePoPriority(req, res, next) {
  try {
    const { priority } = req.body;
    const po = await poService.updatePoPriority(req.params.id, priority);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function updatePoStatus(req, res, next) {
  try {
    const { status } = req.body;
    const po = await poService.updatePoStatus(req.params.id, status);
    res.json(po);
  } catch (error) {
    next(error);
  }
}

export async function acceptPo(req, res, next) {
  try {
    const { line_items } = req.body;
    const po = await poService.acceptPo(req.params.id, line_items);
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
      expected_delivery_date
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
      status
    );
    res.json(lineItem);
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
      priority
    );
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
}
