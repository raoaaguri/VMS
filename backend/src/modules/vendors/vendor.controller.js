import * as vendorService from './vendor.service.js';

export async function getVendors(req, res, next) {
  try {
    const vendors = await vendorService.getAllVendors();
    res.json(vendors);
  } catch (error) {
    next(error);
  }
}

export async function getVendorById(req, res, next) {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function createVendor(req, res, next) {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function updateVendor(req, res, next) {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function deleteVendor(req, res, next) {
  try {
    await vendorService.deleteVendor(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createVendorUser(req, res, next) {
  try {
    const user = await vendorService.createVendorUser(req.params.id, req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function approveVendor(req, res, next) {
  try {
    const vendor = await vendorService.approveVendor(req.params.id);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function rejectVendor(req, res, next) {
  try {
    const vendor = await vendorService.rejectVendor(req.params.id);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}
