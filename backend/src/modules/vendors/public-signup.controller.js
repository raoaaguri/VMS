import bcrypt from 'bcryptjs';
import pool from '../../config/db.js';
import { BadRequestError } from '../../utils/httpErrors.js';

export const publicSignup = async (req, res, next) => {
  try {
    const {
      vendorName,
      contactPerson,
      contactEmail,
      contactPhone,
      address,
      gstNumber,
      password,
      confirmPassword
    } = req.body;

    if (!vendorName || !contactPerson || !contactEmail || !password || !confirmPassword) {
      throw new BadRequestError('All required fields must be provided');
    }

    if (password !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      throw new BadRequestError('Invalid email format');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUser = await client.query(existingUserQuery, [contactEmail]);
      if (existingUser.rows.length > 0) {
        throw new BadRequestError('Email already registered');
      }

      const vendorInsertQuery = `
        INSERT INTO vendors (
          name, contact_person, contact_email, contact_phone,
          address, gst_number, status, is_active, code
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_APPROVAL', false, NULL)
        RETURNING id
      `;

      const vendorResult = await client.query(vendorInsertQuery, [
        vendorName,
        contactPerson,
        contactEmail,
        contactPhone || null,
        address || null,
        gstNumber || null
      ]);

      const vendorId = vendorResult.rows[0].id;

      const passwordHash = await bcrypt.hash(password, 10);

      const userInsertQuery = `
        INSERT INTO users (name, email, password_hash, role, vendor_id, is_active)
        VALUES ($1, $2, $3, 'VENDOR', $4, false)
        RETURNING id
      `;

      await client.query(userInsertQuery, [
        contactPerson,
        contactEmail,
        passwordHash,
        vendorId
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Vendor signup successful. Your account is pending approval from the admin.',
        success: true
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    next(error);
  }
};
