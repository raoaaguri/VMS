import * as poRepository from './po.repository.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/httpErrors.js';

export async function getAllPos(filters = {}) {
  return await poRepository.findAll(filters);
}

export async function getPoById(id) {
  const po = await poRepository.findById(id);
  if (!po) throw new NotFoundError('Purchase order not found');

  const lineItems = await poRepository.findLineItems(id);

  return {
    ...po,
    line_items: lineItems
  };
}

export async function createPo(poData, lineItemsData) {
  const existingPo = await poRepository.findByPoNumber(poData.po_number);

  if (existingPo) {
    throw new BadRequestError('PO number already exists');
  }

  const po = await poRepository.create({
    ...poData,
    status: 'CREATED'
  });

  const lineItems = lineItemsData.map(item => ({
    ...item,
    po_id: po.id,
    status: 'CREATED'
  }));

  await poRepository.createLineItems(lineItems);

  return await getPoById(po.id);
}

export async function updatePoPriority(id, priority) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError('Purchase order not found');

  if (po.status === 'DELIVERED') {
    throw new BadRequestError('Cannot update priority of delivered PO');
  }

  return await poRepository.update(id, { priority });
}

export async function updatePoStatus(id, status) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError('Purchase order not found');

  return await poRepository.update(id, { status });
}

export async function acceptPo(id, lineItemUpdates) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError('Purchase order not found');

  if (po.status !== 'CREATED') {
    throw new BadRequestError('PO can only be accepted when in CREATED status');
  }

  for (const update of lineItemUpdates) {
    if (!update.expected_delivery_date) {
      throw new BadRequestError('Expected delivery date is required for all line items');
    }

    await poRepository.updateLineItem(update.line_item_id, {
      expected_delivery_date: update.expected_delivery_date,
      status: 'ACCEPTED'
    });
  }

  await poRepository.update(id, { status: 'ACCEPTED' });

  return await getPoById(id);
}

export async function updateLineItemExpectedDate(poId, lineItemId, expectedDeliveryDate) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError('Line item not found');

  if (lineItem.po_id !== poId) {
    throw new BadRequestError('Line item does not belong to this PO');
  }

  if (lineItem.status === 'DELIVERED') {
    throw new BadRequestError('Cannot update expected date for delivered line item');
  }

  return await poRepository.updateLineItem(lineItemId, {
    expected_delivery_date: expectedDeliveryDate
  });
}

export async function updateLineItemStatus(poId, lineItemId, status) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError('Line item not found');

  if (lineItem.po_id !== poId) {
    throw new BadRequestError('Line item does not belong to this PO');
  }

  const statusProgression = ['CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED'];
  const currentIndex = statusProgression.indexOf(lineItem.status);
  const newIndex = statusProgression.indexOf(status);

  if (newIndex < currentIndex) {
    throw new BadRequestError('Cannot move line item to a previous status');
  }

  await poRepository.updateLineItem(lineItemId, { status });

  const totalCount = await poRepository.countTotalLineItems(poId);
  const deliveredCount = await poRepository.countLineItemsByStatus(poId, 'DELIVERED');

  if (deliveredCount === totalCount) {
    await poRepository.update(poId, { status: 'DELIVERED' });
  }

  return await poRepository.findLineItemById(lineItemId);
}

export async function updateLineItemPriority(poId, lineItemId, priority) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError('Line item not found');

  if (lineItem.po_id !== poId) {
    throw new BadRequestError('Line item does not belong to this PO');
  }

  if (lineItem.status === 'DELIVERED') {
    throw new BadRequestError('Cannot update priority for delivered line item');
  }

  return await poRepository.updateLineItem(lineItemId, { line_priority: priority });
}

export async function updatePoClosure(id, closureData, user) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError('Purchase order not found');

  if (closureData.closed_amount && closureData.closed_amount < 0) {
    throw new BadRequestError('Closed amount cannot be negative');
  }

  const oldClosureStatus = po.closure_status;
  const oldClosedAmount = po.closed_amount;

  const updatedPo = await poRepository.update(id, {
    closure_status: closureData.closure_status,
    closed_amount: closureData.closed_amount,
    closed_amount_currency: 'INR'
  });

  if (oldClosureStatus !== closureData.closure_status) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: 'CLOSURE_CHANGE',
      field_name: 'closure_status',
      old_value: oldClosureStatus,
      new_value: closureData.closure_status
    });
  }

  if (oldClosedAmount !== closureData.closed_amount) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: 'CLOSURE_CHANGE',
      field_name: 'closed_amount',
      old_value: String(oldClosedAmount || 0),
      new_value: String(closureData.closed_amount)
    });
  }

  return updatedPo;
}

export async function getPoHistory(poId) {
  const po = await poRepository.findById(poId);

  if (!po) throw new NotFoundError('Purchase order not found');

  return await poRepository.getPoHistory(poId);
}
