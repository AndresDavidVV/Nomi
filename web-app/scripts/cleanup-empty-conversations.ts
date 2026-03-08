import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find user
  const user = await prisma.user.findFirst({
    where: { phone: { contains: '3176677226' } },
  });
  console.log('User:', user?.id, user?.phone);

  if (!user) {
    console.log('User not found');
    return;
  }

  // Find empty conversations (no messages)
  const emptyConvs = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      messages: { none: {} },
    },
  });

  console.log(`Found ${emptyConvs.length} empty conversations`);

  if (emptyConvs.length > 0) {
    const deleted = await prisma.conversation.deleteMany({
      where: {
        id: { in: emptyConvs.map(c => c.id) },
      },
    });
    console.log(`Deleted ${deleted.count} empty conversations`);
  }

  // Show remaining
  const remaining = await prisma.conversation.count({ where: { userId: user.id } });
  console.log(`Remaining conversations: ${remaining}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
