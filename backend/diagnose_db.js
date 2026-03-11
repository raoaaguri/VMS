import { query } from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function diagnose() {
  try {
    console.log('--- 1. Users Table Schema ---');
    const cols = await query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.table(cols);

    console.log('\n--- 2. Random Vendor Password Hashes ---');
    const vendors = await query("SELECT email, password_hash FROM users WHERE role = 'VENDOR' LIMIT 5");
    
    for (const v of vendors) {
      const matchVendor123 = await bcrypt.compare('vendor123', v.password_hash);
      const matchVendor = await bcrypt.compare('vendor', v.password_hash);
      console.log(`Email: ${v.email}`);
      console.log(`  Hash: ${v.password_hash}`);
      console.log(`  Match 'vendor123': ${matchVendor123}`);
      console.log(`  Match 'vendor': ${matchVendor}`);
    }

  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    process.exit(0);
  }
}

diagnose();
