// هذا الملف يقوم بإنشاء المستخدمين التجريبيين بكلمات مرور مشفرة

import { hash } from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'dev.db'));

async function main() {
  console.log('🌱 Seeding demo users...');
  
  const demoPassword = 'demo123';
  const hashedPassword = await hash(demoPassword, 12);

  const users = [
    { email: 'customer@sareepro.local', role: 'customer', fullName: 'Demo Customer' },
    { email: 'merchant@sareepro.local', role: 'merchant', fullName: 'Demo Merchant' },
    { email: 'driver@sareepro.local', role: 'driver', fullName: 'Demo Driver' },
    { email: 'admin@sareepro.local', role: 'admin', fullName: 'Demo Admin' },
  ];

  for (const user of users) {
    try {
      const existing = db.prepare('SELECT id FROM AppUser WHERE email = ?').get(user.email);
      
      if (existing) {
        db.prepare('UPDATE AppUser SET "passwordHash" = ?, "fullName" = ?, role = ? WHERE email = ?')
          .run(hashedPassword, user.fullName, user.role, user.email);
        console.log(`✅ Updated: ${user.email}`);
      } else {
        db.prepare(`
          INSERT INTO AppUser (id, email, role, "fullName", "passwordHash", "isActive", "emailVerified", "createdAt", "updatedAt")
          VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))
        `).run(user.email, user.role, user.fullName, hashedPassword);
        console.log(`✅ Created: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Error with ${user.email}:`, error.message);
    }
  }

  console.log('✅ Seed completed!');
  db.close();
}

main().catch(console.error);
