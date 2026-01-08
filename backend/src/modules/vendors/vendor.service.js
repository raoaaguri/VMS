import * as vendorRepository from './vendor.repository.js';
import * as userService from '../users/user.service.js';
import { ConflictError, NotFoundError } from '../../utils/httpErrors.js';

export async function getAllVendors() {
  return await vendorRepository.findAll();
}

export async function getVendorById(id) {
  const vendor = await vendorRepository.findById(id);
  if (!vendor) throw new NotFoundError('Vendor not found');
  return vendor;
}

export async function createVendor(vendorData) {
  const existingVendor = await vendorRepository.findByCode(vendorData.code);

  if (existingVendor) {
    throw new ConflictError('Vendor code already exists');
  }

  return await vendorRepository.create(vendorData);
}

export async function updateVendor(id, vendorData) {
  const existingVendor = await vendorRepository.findById(id);

  if (!existingVendor) {
    throw new NotFoundError('Vendor not found');
  }

  if (vendorData.code && vendorData.code !== existingVendor.code) {
    const codeExists = await vendorRepository.findByCode(vendorData.code);
    if (codeExists) {
      throw new ConflictError('Vendor code already exists');
    }
  }

  return await vendorRepository.update(id, vendorData);
}

export async function deleteVendor(id) {
  const vendor = await vendorRepository.findById(id);

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  await vendorRepository.deleteById(id);
}

export async function createVendorUser(vendorId, userData) {
  const vendor = await vendorRepository.findById(vendorId);

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  const userDataWithVendor = {
    ...userData,
    role: 'VENDOR',
    vendor_id: vendorId
  };

  return await userService.createUser(userDataWithVendor);
}
