// Migration script to add role field and set MANAGER roles
// Run this from the ECS container or any environment with database access

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Starting role migration...');
    
    // The role field should already exist from prisma db push
    // But we need to set MANAGER for Andres and Monica
    
    const andresPhone = '573176677225';
    const monicaPhone = '573137207163';
    
    console.log('Setting MANAGER role for Andres (+573176677225)...');
    const andres = await prisma.user.updateMany({
      where: { phone: andresPhone },
      data: { role: 'MANAGER' }
    });
    console.log(`Updated ${andres.count} user(s) for Andres`);
    
    console.log('Setting MANAGER role for Monica (+573137207163)...');
    const monica = await prisma.user.updateMany({
      where: { phone: monicaPhone },
      data: { role: 'MANAGER' }
    });
    console.log(`Updated ${monica.count} user(s) for Monica`);
    
    // Verify
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, phone: true, role: true }
    });
    
    console.log('\nCurrent MANAGER users:');
    console.table(managers);
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
