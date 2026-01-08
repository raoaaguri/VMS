import bcrypt from 'bcryptjs';
import * as userRepository from './user.repository.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../utils/httpErrors.js';

export async function getUserById(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function getAllUsers() {
  return await userRepository.findAll();
}

export async function createUser(userData) {
  const existingUser = await userRepository.findByEmail(userData.email);

  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  if (userData.role === 'VENDOR' && !userData.vendor_id) {
    throw new BadRequestError('vendor_id is required for VENDOR role');
  }

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const newUser = {
    name: userData.name,
    email: userData.email,
    password_hash: passwordHash,
    role: userData.role,
    vendor_id: userData.vendor_id || null
  };

  return await userRepository.create(newUser);
}

export async function updateUser(id, userData) {
  const existingUser = await userRepository.findById(id);

  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  if (userData.email && userData.email !== existingUser.email) {
    const emailExists = await userRepository.findByEmail(userData.email);
    if (emailExists) {
      throw new ConflictError('Email already exists');
    }
  }

  const updateData = {
    name: userData.name,
    email: userData.email,
    role: userData.role,
    vendor_id: userData.vendor_id
  };

  if (userData.password) {
    updateData.password_hash = await bcrypt.hash(userData.password, 10);
  }

  return await userRepository.update(id, updateData);
}

export async function deleteUser(id) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  await userRepository.deleteById(id);
}
