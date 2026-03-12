// Add this to po.service.js to debug priority issues

// Add at the beginning of updatePoPriorityBatch function
export async function updatePoPriorityBatch(poId, lineItemId, priority, user) {
  console.log('🔍 DEBUG: updatePoPriorityBatch called', {
    poId,
    lineItemId,
    priority,
    userRole: user?.role
  });

  // If lineItemId is provided, just call the existing single update logic
  if (lineItemId) {
    console.log('🔍 DEBUG: Calling single line item update');
    return await updateLineItemPriority(poId, lineItemId, priority, user);
  }

  // If lineItemId is null, update PO priority AND ALL line items
  console.log('🔍 DEBUG: Calling batch update for all line items');
  const po = await poRepository.findById(poId);
  if (!po) throw new NotFoundError("Purchase order not found");

  const oldPriority = po.priority;
  if (oldPriority !== priority && user) {
    await poRepository.createPoHistory({
      po_id: poId,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "PRIORITY_CHANGE",
      field_name: "priority",
      old_value: oldPriority,
      new_value: priority,
    });
  }

  // Update PO priority
  await poRepository.update(poId, { priority });

  // Notify external portal asynchronously (PO-level priority change)
  console.log('🔍 DEBUG: Calling notifyPriorityUpdate for PO level');
  notifyPriorityUpdate(po.po_number, null, priority);

  // Update all line items priority
  console.log('🔍 DEBUG: Updating all line items priority');
  const lineItems = await poRepository.findLineItems(poId);
  console.log('🔍 DEBUG: Found line items:', lineItems.length);
  
  const updatePromises = lineItems.map((item) => {
    console.log('🔍 DEBUG: Processing line item:', item.id, 'status:', item.status);
    // Skip already delivered items to avoid errors
    if (item.status === "DELIVERED") {
      console.log('🔍 DEBUG: Skipping delivered item:', item.id);
      return Promise.resolve();
    }
    // Use skipNotify=true to avoid multiple single notifications during batch
    return updateLineItemPriority(poId, item.id, priority, user, true);
  });

  console.log('🔍 DEBUG: Waiting for', updatePromises.length, 'priority updates to complete');
  await Promise.all(updatePromises);
  console.log('🔍 DEBUG: All priority updates completed');

  // Notify external portal for batch update
  console.log('🔍 DEBUG: Calling notifyPriorityUpdate for batch (should be skipped due to skipNotify)');
  notifyPriorityUpdate(po.po_number, null, priority);

  return {
    success: true,
    message: "Priority updated for all line items",
  };
}
