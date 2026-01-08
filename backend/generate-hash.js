import bcrypt from 'bcryptjs';

async function generateHashes() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const vendorHash = await bcrypt.hash('vendor123', 10);

  console.log('Admin hash (admin123):', adminHash);
  console.log('Vendor hash (vendor123):', vendorHash);
}

generateHashes();
