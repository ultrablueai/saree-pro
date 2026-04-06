import { hash } from 'bcryptjs';
import { getDbExecutor } from '../lib/db.js';

async function main() {
  console.log('🌱 Seeding database with demo users...');

  const demoPassword = 'demo123';
  const hashedPassword = await hash(demoPassword, 12);

  const db = await getDbExecutor();

  // Create demo users
  const users = [
    {
      email: 'customer@sareepro.local',
      role: 'customer',
      fullName: 'Demo Customer',
    },
    {
      email: 'merchant@sareepro.local',
      role: 'merchant',
      fullName: 'Demo Merchant',
    },
    {
      email: 'driver@sareepro.local',
      role: 'driver',
      fullName: 'Demo Driver',
    },
    {
      email: 'admin@sareepro.local',
      role: 'admin',
      fullName: 'Demo Admin',
    },
  ];

  for (const user of users) {
    try {
      // Check if user exists
      const existing = await db.get(
        `SELECT id FROM AppUser WHERE email = ?`,
        [user.email]
      );

      if (existing) {
        // Update existing user
        await db.run(
          `UPDATE AppUser SET "passwordHash" = ?, "fullName" = ?, role = ?, "isActive" = 1, "emailVerified" = 1 WHERE email = ?`,
          [hashedPassword, user.fullName, user.role, user.email]
        );
        console.log(`✅ Updated user: ${user.email}`);
      } else {
        // Create new user
        await db.run(
          `INSERT INTO AppUser (id, email, role, "fullName", "passwordHash", "isActive", "emailVerified", "createdAt", "updatedAt") 
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`,
          [user.email, user.role, user.fullName, hashedPassword]
        );
        console.log(`✅ Created user: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Error with user ${user.email}:`, error);
    }
  }

  console.log('✅ Seed completed successfully!');
  process.exit(0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
