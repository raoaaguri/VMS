import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { getDbClient } from '../../config/db.js';
import { UnauthorizedError } from '../../utils/httpErrors.js';

export async function login(email, password) {
  const db = getDbClient();

  const { data: users, error } = await db
    .from('users')
    .select('id, name, email, password_hash, role, vendor_id, is_active')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  if (!users) throw new UnauthorizedError('Invalid email or password');

  const isPasswordValid = await bcrypt.compare(password, users.password_hash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!users.is_active) {
    throw new UnauthorizedError('Your account is not active. Please contact the administrator.');
  }

  if (users.role === 'VENDOR' && users.vendor_id) {
    const { data: vendor, error: vendorError } = await db
      .from('vendors')
      .select('status')
      .eq('id', users.vendor_id)
      .maybeSingle();

    if (vendorError) throw vendorError;

    if (!vendor || vendor.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your vendor account is pending approval or has been rejected.');
    }
  }

  const token = jwt.sign(
    {
      id: users.id,
      email: users.email,
      role: users.role,
      vendor_id: users.vendor_id
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const user = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    vendor_id: users.vendor_id
  };

  return { user, token };
}
