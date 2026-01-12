import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountingTraining = await prisma.training.create({
    data: {
      title: "Trajnim në Kontabilitetin Praktik",
      description: "Trajnim intensiv dhe praktik në kontabilitet që përfshin: Libërmbajtje praktike, përgatitjen e pasqyrave financiare, TVSH, Tatimi në Paga dhe kontributet pensionale, përdorimin e programeve bashkëkohore të kontabilitetit.",
      category: "ACCOUNTING",
      level: "BEGINNER",
      instructor: "Ardit Bobi",
      totalHours: 12,
      startDate: new Date('2024-06-06'),
      endDate: new Date('2024-07-12'),
      maxParticipants: 15, 
      isActive: true,
    }
  });

  console.log(`Seeded: Accounting training created successfully`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });