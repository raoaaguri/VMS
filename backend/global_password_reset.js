import bcrypt from "bcryptjs";
import { getDbClient, query } from "./src/config/db.js";

async function globalReset() {
  const db = getDbClient();
  const password = "vendor123";
  
  try {
    console.log(`--- Global Reset: Setting all VENDOR passwords to "${password}" ---`);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Update all vendors in the users table
    const { data, error } = await db.from('users')
      .update({ password_hash: hash })
      .eq('role', 'VENDOR');
      
    if (error) throw error;
    
    console.log('Update query finished.');

    // VERIFICATION
    console.log('\n--- VERIFICATION ---');
    const vendors = await query("SELECT email, password_hash FROM users WHERE role = 'VENDOR'");
    let failureCount = 0;
    
    for (const v of vendors) {
      const match = await bcrypt.compare(password, v.password_hash);
      if (!match) {
        console.error(`[FAIL] ${v.email} does not match!`);
        failureCount++;
      }
    }
    
    if (failureCount === 0) {
      console.log(`[SUCCESS] Verified all ${vendors.length} vendors now have the password: ${password}`);
    } else {
      console.error(`[ERROR] ${failureCount} vendors failed verification.`);
    }

  } catch (err) {
    console.error("Critical Error during reset:", err);
  } finally {
    process.exit(0);
  }
}

globalReset();
