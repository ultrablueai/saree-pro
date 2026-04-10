import { execSync } from 'node:child_process';
import { hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log('ðŸŒ± Starting seed...');

  const demoPassword = 'demo123';
  const hashedPassword = await hash(demoPassword, BCRYPT_ROUNDS);

  console.log('âœ… Password hashed successfully');
  console.log('Hash:', hashedPassword);

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

    console.log('âœ… Updated demo users with hashed passwords');
  } catch (error) {
    console.error('âŒ Error updating users:', error);
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
