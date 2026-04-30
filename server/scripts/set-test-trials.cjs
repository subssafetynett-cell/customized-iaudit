const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' }
  });

  if (users.length < 2) {
    console.log('Not enough users found for testing.');
    return;
  }

  const userA = users[0];
  const userB = users[1];

  // User A -> Normal state (10 days remaining)
  const dateA = new Date();
  dateA.setDate(dateA.getDate() + 10);
  await prisma.user.update({
    where: { id: userA.id },
    data: { 
      trialEndDate: dateA,
      subscriptionStatus: 'trial'
    }
  });
  console.log(`Updated User A (ID: ${userA.id}, Email: ${userA.email}) to 10 days remaining.`);

  // User B -> Warning state (2 days remaining)
  const dateB = new Date();
  dateB.setDate(dateB.getDate() + 2);
  await prisma.user.update({
    where: { id: userB.id },
    data: { 
      trialEndDate: dateB,
      subscriptionStatus: 'trial'
    }
  });
  console.log(`Updated User B (ID: ${userB.id}, Email: ${userB.email}) to 2 days remaining.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
