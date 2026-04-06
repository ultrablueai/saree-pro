import { hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting seed...');

  // Hash passwords for demo users
  const demoPassword = 'demo123';
  const hashedPassword = await hash(demoPassword, BCRYPT_ROUNDS);

  console.log('✅ Password hashed successfully');
  console.log('Hash:', hashedPassword);

  // Update existing users with hashed passwords
  const { execSync } = require('child_process');
  
  try {
    execSync(`npx prisma db execute --stdin`, {
      input: `
        UPDATE app_users SET password_hash = '${hashedPassword}', updated_at = datetime('now') WHERE email = 'customer@sareepro.local';
        UPDATE app_users SET password_hash = '${hashedPassword}', updated_at = datetime('now') WHERE email = 'merchant@sareepro.local';
        UPDATE app_users SET password_hash = '${hashedPassword}', updated_at = datetime('now') WHERE email = 'driver@sareepro.local';
        UPDATE app_users SET password_hash = '${hashedPassword}', updated_at = datetime('now') WHERE email = 'admin@sareepro.local';
      `,
      stdio: 'pipe',
    });
    
    console.log('✅ Updated demo users with hashed passwords');
  } catch (error) {
    console.error('❌ Error updating users:', error);
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
