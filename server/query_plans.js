import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.auditPlan.findMany();
  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
