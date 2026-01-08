import * as vendorService from '../vendors/vendor.service.js';
import * as poService from '../pos/po.service.js';
import { BadRequestError } from '../../utils/httpErrors.js';

export async function createOrUpdateVendor(req, res, next) {
  try {
    const { id, ...vendorData } = req.body;

    let vendor;

    if (id) {
      vendor = await vendorService.updateVendor(id, vendorData);
    } else {
      vendor = await vendorService.createVendor(vendorData);
    }

    res.status(200).json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function createPo(req, res, next) {
  try {
    const { po, line_items } = req.body;

    if (!po || !line_items || !Array.isArray(line_items) || line_items.length === 0) {
      throw new BadRequestError('PO data and line items are required');
    }

    const createdPo = await poService.createPo(po, line_items);

    res.status(201).json(createdPo);
  } catch (error) {
    next(error);
  }
}
