import bcrypt from 'bcryptjs';
import { getDbClient } from './config/db.js';
import { logger } from './utils/logger.js';

async function seed() {
  const db = getDbClient();

  try {
    logger.info('Starting database seed...');

    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const { data: adminUser, error: adminError } = await db
      .from('users')
      .insert({
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        role: 'ADMIN'
      })
      .select()
      .maybeSingle();

    if (adminError && adminError.code !== '23505') {
      throw adminError;
    }

    logger.info('Admin user created: admin@example.com / admin123');

    const { data: vendor1, error: vendor1Error } = await db
      .from('vendors')
      .insert({
        name: 'Acme Corporation',
        code: 'ACME001',
        contact_person: 'John Doe',
        contact_email: 'john@acme.com',
        contact_phone: '+1-555-0001',
        address: '123 Business St, New York, NY 10001',
        gst_number: 'GST123456789',
        is_active: true
      })
      .select()
      .maybeSingle();

    if (vendor1Error && vendor1Error.code !== '23505') {
      throw vendor1Error;
    }

    if (vendor1) {
      const vendorPasswordHash = await bcrypt.hash('vendor123', 10);
      const { error: vendorUserError } = await db
        .from('users')
        .insert({
          name: 'John Doe',
          email: 'vendor@acme.com',
          password_hash: vendorPasswordHash,
          role: 'VENDOR',
          vendor_id: vendor1.id
        })
        .maybeSingle();

      if (vendorUserError && vendorUserError.code !== '23505') {
        throw vendorUserError;
      }

      logger.info('Vendor user created: vendor@acme.com / vendor123');

      const { data: po1, error: po1Error } = await db
        .from('purchase_orders')
        .insert({
          po_number: 'PO-2024-001',
          po_date: '2024-01-15',
          priority: 'HIGH',
          type: 'NEW_ITEMS',
          vendor_id: vendor1.id,
          status: 'CREATED'
        })
        .select()
        .maybeSingle();

      if (po1Error && po1Error.code !== '23505') {
        throw po1Error;
      }

      if (po1) {
        await db.from('purchase_order_line_items').insert([
          {
            po_id: po1.id,
            product_code: 'PROD-001',
            product_name: 'Widget A',
            quantity: 100,
            gst_percent: 18,
            price: 25.50,
            mrp: 35.00,
            line_priority: 'HIGH',
            status: 'CREATED'
          },
          {
            po_id: po1.id,
            product_code: 'PROD-002',
            product_name: 'Widget B',
            quantity: 50,
            gst_percent: 18,
            price: 45.00,
            mrp: 60.00,
            line_priority: 'MEDIUM',
            status: 'CREATED'
          }
        ]);

        logger.info('Purchase order PO-2024-001 created with 2 line items');
      }

      const { data: po2, error: po2Error } = await db
        .from('purchase_orders')
        .insert({
          po_number: 'PO-2024-002',
          po_date: '2024-01-20',
          priority: 'MEDIUM',
          type: 'REPEAT',
          vendor_id: vendor1.id,
          status: 'CREATED'
        })
        .select()
        .maybeSingle();

      if (po2Error && po2Error.code !== '23505') {
        throw po2Error;
      }

      if (po2) {
        await db.from('purchase_order_line_items').insert([
          {
            po_id: po2.id,
            product_code: 'PROD-003',
            product_name: 'Gadget X',
            quantity: 200,
            gst_percent: 12,
            price: 15.00,
            mrp: 20.00,
            line_priority: 'MEDIUM',
            status: 'CREATED'
          }
        ]);

        logger.info('Purchase order PO-2024-002 created with 1 line item');
      }
    }

    const { data: vendor2, error: vendor2Error } = await db
      .from('vendors')
      .insert({
        name: 'Global Supplies Inc',
        code: 'GLOB001',
        contact_person: 'Jane Smith',
        contact_email: 'jane@globalsupplies.com',
        contact_phone: '+1-555-0002',
        address: '456 Commerce Ave, Los Angeles, CA 90001',
        gst_number: 'GST987654321',
        is_active: true
      })
      .select()
      .maybeSingle();

    if (vendor2Error && vendor2Error.code !== '23505') {
      throw vendor2Error;
    }

    logger.info('Seed completed successfully!');
    logger.info('');
    logger.info('Login credentials:');
    logger.info('Admin: admin@example.com / admin123');
    logger.info('Vendor: vendor@acme.com / vendor123');

  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
