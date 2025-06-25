import { PrismaClient, TrainingType, TeamMemberRole } from '@prisma/client';
import * as process from 'process';

const prisma = new PrismaClient();

const users = [
  {
    id: 1,
    name: 'Enis',
    surname: 'Gjocaj',
    email: 'enisg1489@gmail.com',
    password: '$2a$10$40f8q1JwdfgoUGQlfZciqeoP8But24U5V/45JQHxLFYaFf2jEIuNS',
    createdAt: new Date('2024-09-10T10:42:11.284Z')
  },
  {
    id: 2,
    name: 'Testaccount1',
    surname: 'testacc1',
    email: 'testaccount1@gmail.com',
    password: '$2a$10$kv1wGTkQuC/FRzsKQPd6zeuNh2yU6dfXbABPpkcZmw9BzevGjb4DO',
    createdAt: new Date('2024-09-10T10:49:11.417Z')
  },
  {
    id: 3,
    name: 'Testaccount2',
    surname: 'testacc2',
    email: 'testaccount2@gmail.com',
    password: '$2a$10$pylM0S62xfao1L0FejHQX.zTUH.n26SEAlicVNcqR4Wh7ghOqMLOK',
    createdAt: new Date('2024-09-10T10:51:12.418Z')
  },
  {
    id: 4,
    name: 'Testaccount3',
    surname: 'testacc3',
    email: 'testaccount3@gmail.com',
    password: '$2a$10$ydir40ViN8DqPbLkfPOxM.VeQ0HRgHD.Cxo7BlpYiYN9DFjE.Ah6m',
    createdAt: new Date('2024-09-10T10:51:54.546Z')
  },
  {
    id: 5,
    name: 'Testaccount4',
    surname: 'testacc4',
    email: 'testaccount4@gmail.com',
    password: '$2a$10$qrm6hEgwc4P9jHQP.7kwzeVJvy.yAFM.dFVQgWx.Y95uU6Dz5ZQ9m',
    createdAt: new Date('2024-09-10T10:53:04.072Z')
  },
  {
    id: 6,
    name: 'Testaccount5',
    surname: 'testacc5',
    email: 'testaccount5@gmail.com',
    password: '$2a$10$ZUz1Jmk0c7sUhvwnuSrd.eTcbZgAZzTNg6meOFtP..37/Lvo348ny',
    createdAt: new Date('2024-09-10T10:58:55.444Z')
  },
  {
    id: 7,
    name: 'Testaccount9',
    surname: 'testacc6',
    email: 'testaccount6@gmail.com',
    password: '',
    createdAt: new Date('2024-09-10T11:11:29.413Z')
  },
  {
    id: 10,
    name: 'UserTest',
    surname: 'UserTest',
    email: 'usertest11111@gmail.com',
    password: '',
    createdAt: new Date('2024-09-10T19:08:28.671Z')
  },
  {
    id: 11,
    name: 'NewUserForTest999',
    surname: 'NewUserForTest1',
    email: 'newuserfortest1@gmail.com',
    password: '',
    createdAt: new Date('2024-09-14T15:04:16.113Z')
  },
  {
    id: 13,
    name: 'EnisGjocaj',
    surname: 'EnisGjocaj',
    email: 'enisgjocaj1@hotmail.com',
    password: '$2a$10$x7r/SX7fkGnOUzW6b9VeRuAVCVF7kCxg5zSRDRv1VQCPzOFGAcIcy',
    createdAt: new Date('2024-09-14T23:24:33.579Z')
  },
  {
    id: 14,
    name: 'newusername',
    surname: 'newusername',
    email: 'newusername1@gmail.com',
    password: '$2a$10$LMTSnFu8YIgQfwQVnxHLoO4qGjClUuqP1/fWg2fUH3Lgmckh7zgzi',
    createdAt: new Date('2024-09-14T23:53:43.731Z')
  },
  {
    id: 15,
    name: 'newusername1',
    surname: 'newusername1',
    email: 'devmastere@gmail.com',
    password: '$2a$10$3ZSgwaXvpYO9DesjgrV6buoGb/Uiemw4.MtUxsWji0Y6qmLUpY1X2',
    createdAt: new Date('2024-09-14T23:56:32.081Z')
  },
  {
    id: 16,
    name: 'Ardit',
    surname: 'Bobi',
    email: 'arditbobi@gmail.com',
    password: '$2a$10$d4XW/PCha3197Ky6w4rlT.Ca5i3jkAqM4EguSU3.YEio91g7L1PtK',
    createdAt: new Date('2024-09-17T06:11:49.099Z')
  },
  {
    id: 17,
    name: 'Sara',
    surname: 'Arifaj',
    email: 'saraarifaj00@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-09-29T18:11:26.079Z')
  },
  {
    id: 18,
    name: 'Enis',
    surname: 'Gjocaj',
    email: 'devmastery17@gmail.com',
    password: '$2a$10$faodkDt.vNiueRWh.sW8J.5EapnqJdd8k8k5NP0shKOk4fWO3gzpi',
    createdAt: new Date('2024-09-29T19:09:00.73Z')
  },
  {
    id: 19,
    name: 'Enis',
    surname: 'Gjocaj',
    email: 'eniscode7@gmail.com',
    password: '$2a$10$WbHlUQXf1Mgz.ygohW1jeO91OF2rLcEo0u7fh9lT10TB1pjhnjgjW',
    createdAt: new Date('2024-09-29T22:22:55.643Z')
  },
  {
    id: 20,
    name: 'Erza',
    surname: 'Ukaj',
    email: 'erza.ukajj1@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-01T20:41:34.701Z')
  },
  {
    id: 21,
    name: 'Edonis',
    surname: 'Haxhija',
    email: 'edonis.haxhija@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-01T21:32:21.919Z')
  },
  {
    id: 22,
    name: 'Lendita',
    surname: 'Berisha',
    email: 'Lenditaberisha51@icloud.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-01T21:32:59.771Z')
  },
  {
    id: 23,
    name: 'haxhi',
    surname: 'alimehaj',
    email: 'alimehajhaxhi13@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-01T21:59:47.088Z')
  },
  {
    id: 39,
    name: 'Aurora',
    surname: 'Ismaili',
    email: 'auroraiismajli@icould.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-01T23:28:09.676Z')
  },
  {
    id: 55,
    name: 'Erion',
    surname: 'Dervishaj',
    email: 'eriondervishaj14@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T06:09:09.805Z')
  },
  {
    id: 56,
    name: 'Albana',
    surname: 'Belegu',
    email: 'belegu705@hotmail.com',
    password: '$2a$10$ZTD5UKzLzLhrsvOYReJWxO.uy9INinHzGi64ujOdQcHbdu3Himw5S',
    createdAt: new Date('2024-10-02T06:14:57.578Z')
  },
  {
    id: 57,
    name: 'Anita',
    surname: 'Rexhepi',
    email: 'anitarexhepi612@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T09:22:33.452Z')
  },
  {
    id: 62,
    name: 'Esa',
    surname: 'Avdimetaj',
    email: 'esaavdimetaj@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T09:22:33.56Z')
  },
  {
    id: 80,
    name: 'Fjolla',
    surname: 'Berisha',
    email: 'berishaf752@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T09:50:10.664Z')
  },
  {
    id: 81,
    name: 'Genesa',
    surname: 'Mehmetaj',
    email: 'genesamehmetaj07@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T09:50:55.99Z')
  },
  {
    id: 82,
    name: 'testuser',
    surname: 'testusername',
    email: 'test@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T11:31:48.149Z')
  },
  {
    id: 83,
    name: 'name',
    surname: 'surname',
    email: 'testmail@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-02T11:34:03.965Z')
  },
  {
    id: 84,
    name: '𝑨𝒍𝒃𝒆𝒓𝒕𝒊𝒏𝒂',
    surname: 'Kameraj',
    email: 'albertinakameraj0@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-04T13:09:32.495Z')
  },
  {
    id: 85,
    name: 'Horgita',
    surname: 'Ibraj',
    email: 'horgitaibraj2@gmail.com',
    password: 'defaultPassword123',
    createdAt: new Date('2024-10-05T14:57:14.228Z')
  }
];

const applications = [
  {
    id: 60,
    name: "Aurora",
    surname: "Ismaili",
    email: "auroraiismajli@icould.com",
    createdAt: new Date("2024-10-01T23:28:09.889Z"),
    type: "MARKETING" as TrainingType,
    userId: 39
  },
  {
    id: 69,
    name: "Aurora",
    surname: "Ismaili",
    email: "auroraiismajli@icould.com",
    createdAt: new Date("2024-10-01T23:28:12.321Z"),
    type: "ACCOUNTING" as TrainingType,
    userId: 39
  },
  {
    id: 76,
    name: "Erion",
    surname: "Dervishaj",
    email: "eriondervishaj14@gmail.com",
    createdAt: new Date("2024-10-02T06:09:09.811Z"),
    type: "ACCOUNTING" as TrainingType,
    userId: 55
  },
  {
    id: 77,
    name: "Albana",
    surname: "Belegu",
    email: "belegu705@hotmail.com",
    createdAt: new Date("2024-10-02T06:18:14.041Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 56
  },
  {
    id: 78,
    name: "Anita",
    surname: "Rexhepi",
    email: "anitarexhepi612@gmail.com",
    createdAt: new Date("2024-10-02T09:22:33.64Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 57
  },
  {
    id: 79,
    name: "Esa",
    surname: "Avdimetaj",
    email: "esaavdimetaj@gmail.com",
    createdAt: new Date("2024-10-02T09:22:33.739Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 62
  },
  {
    id: 88,
    name: "Fjolla",
    surname: "Berisha",
    email: "berishaf752@gmail.com",
    createdAt: new Date("2024-10-02T09:50:10.676Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 80
  },
  {
    id: 91,
    name: "Genesa",
    surname: "Mehmetaj",
    email: "genesamehmetaj07@gmail.com",
    createdAt: new Date("2024-10-02T09:50:55.995Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 81
  },
  {
    id: 48,
    name: "Erza",
    surname: "Ukaj",
    email: "erza.ukajj1@gmail.com",
    createdAt: new Date("2024-10-01T20:41:34.71Z"),
    type: "ACCOUNTING" as TrainingType,
    userId: 20
  },
  {
    id: 49,
    name: "Edonis",
    surname: "Haxhija",
    email: "edonis.haxhija@gmail.com",
    createdAt: new Date("2024-10-01T21:32:21.942Z"),
    type: "ACCOUNTING" as TrainingType,
    userId: 21
  },
  {
    id: 50,
    name: "Lendita",
    surname: "Berisha",
    email: "Lenditaberisha51@icloud.com",
    createdAt: new Date("2024-10-01T21:32:59.777Z"),
    type: "AGROBUSINESS" as TrainingType,
    userId: 22
  },
  {
    id: 51,
    name: "haxhi",
    surname: "alimehaj",
    email: "alimehajhaxhi13@gmail.com",
    createdAt: new Date("2024-10-01T21:59:47.196Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 23
  },
  {
    id: 113,
    name: "𝑨𝒍𝒃𝒆𝒓𝒕𝒊𝒏𝒂",
    surname: "Kameraj",
    email: "albertinakameraj0@gmail.com",
    createdAt: new Date("2024-10-04T13:09:32.509Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 84
  },
  {
    id: 115,
    name: "Horgita",
    surname: "Ibraj",
    email: "horgitaibraj2@gmail.com",
    createdAt: new Date("2024-10-05T14:57:14.234Z"),
    type: "INFORMATION_SCIENCE" as TrainingType,
    userId: 85
  }
];

const news = [
  {
    id: 6,
    title: "Marrveshje bashkpunimi",
    content: "Njoftim Special për Studentët e Fakultetit të Biznesit! \r\nPërfitoni Nga Marrëveshja Ekskluzive! \r\nNe jemi krenarë të njoftojmë një marrëveshje bashkëpunimi të jashtëzakonshme për studentët tanë të Fakultetit të Biznesit! 🎓\r\nArdit Bobi, kryetari i Unionit të Studentëve, ka arritur të sigurojë një kontratë 1-vjeçare me kompaninë prestigjioze ELIF. \r\nÇfarë përfitoni ju? \r\n✅ Trajnime Profesionale të Kontabilitetit - TOTALISHT FALAS!\r\n✅ Mundësi e artë për të zhvilluar aftësitë tuaja profesionale dhe për të përgatitur për një karrierë të suksesshme.\r\n✅ Një hap më afër suksesit në botën e biznesit.\r\nMos e humbisni këtë mundësi unike për të ngritur nivelin tuaj profesional! 📈\r\nPër më shumë informacione dhe për të aplikuar, na kontaktoni ose vizitoni faqen tonë të internetit IAP-M.",
    createdAt: new Date("2024-09-17T14:20:46.282Z"),
    imageUrl: "/uploads/image-1726589411564-799623369.jpg"
  },
  {
    id: 7,
    title: "Themelimi i IAP-M",
    content: "Themelimi i institutit IAP-M.\r\n Trajnimi dhe certifikimi i studentëve dhe individëve për sukses në karrierë. Instituti per aftesim dhe menaxhim.",
    createdAt: new Date("2024-09-17T18:39:46.027Z"),
    imageUrl: "/uploads/image-1726599877221-150900011.jpg"
  },
  {
    id: 13,
    title: "Bashkpunimi I IAP-M me Universitetin Trakya",
    content: "Bashkëpunimi i IAP-M me Universitetin Trakya dhe Organizatën YTB: Mundësi të reja për studentët e Pejës\r\nSot, me 31 maj 2024, menaxhmenti i Institutit për Aftësim Profesional & Menaxhim (IAP-M) gëzohet të njoftojë për pranimin e tyre në dy takime të rëndësishme në Qytetin e Edirnës në Turqi:\r\nUniversiteti Trakya, përfaqësuar nga Rıfat Gürgendereli, Drejtor i Marrëdhënieve me Jashtë.\r\nKoordinatori i Organizatës YTB në Edirne, Ahmet Halaşlı.\r\nDiskutimet në këto takime kryesisht u përqendruan në mundësinë e bashkëpunimit mes IAP-M dhe Universitetit Trakya, si dhe Organizatës YTB. Në veçanti, u diskutua për ndarjen e bursave për studentët e Pejës, hap i rëndësishëm për të arritur qëllimet e përbashkëta arsimore dhe zhvillimin e talenteve në nivel ndërkombëtar",
    createdAt: new Date("2024-09-18T08:22:58.065Z"),
    imageUrl: "/uploads/image-1726647778059-497459854.jpg"
  }
];

const teamMembers = [
  {
    id: 11,
    fullName: 'Adnan Neziraj',
    role: TeamMemberRole.PRESIDENT,
    description: 'President of IAP-M',
    title: 'President',
    imagePath: '/uploads/image-1726589096066-218857047.png',
    createdAt: new Date('2024-09-17T16:04:56.072Z')
  },
  {
    id: 12,
    fullName: 'Sara Arifaj',
    role: TeamMemberRole.PRESIDENT,
    description: 'Sara Arifaj president i IAP-M',
    title: 'President of IAP-M',
    imagePath: '/uploads/image-1726589185270-429842664.png',
    createdAt: new Date('2024-09-17T16:06:25.272Z')
  },
  {
    id: 10,
    fullName: 'Shpetim Misiri',
    role: TeamMemberRole.PRESIDENT,
    description: 'Shpetim Misiri president i IAP-M',
    title: 'President of IAP-M',
    imagePath: '/uploads/image-1726589203870-362225657.png',
    createdAt: new Date('2024-09-17T12:51:34.833Z')
  },
  {
    id: 13,
    fullName: 'Ardit Bobi',
    role: TeamMemberRole.EXECUTIVE_DIRECTOR,
    description: 'Ardit Bobi drejtor ekzekutiv i IAP-M',
    title: 'Drejtor Ekzekutiv',
    imagePath: '/uploads/image-1726589203870-362225657.png',
    createdAt: new Date('2024-09-17T12:51:34.833Z')
  },
  {
    id: 14,
    fullName: 'Bleona Lajqi',
    role: TeamMemberRole.MEETING_COORDINATOR,
    description: 'Bleona Lajqi koordinator i takimeve i IAP-M',
    title: 'Koordinator i Takimeve',
    imagePath: '/uploads/image-1726589203870-362225657.png',
    createdAt: new Date('2024-09-17T12:51:34.833Z')
  }
];

async function seed() {
  try {
    console.log('Starting to seed users...');
    
    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user
      });
    }
    console.log('Users seeding finished.');


    console.log('Starting to seed applications...');
    for (const application of applications) {
      await prisma.application.upsert({
        where: {
          email_type: {
            email: application.email,
            type: application.type
          }
        },
        update: {},
        create: application
      });
    }
    console.log('Applications seeding finished.');


    console.log('Starting to seed news...');
    // Seed newss
    for (const newsItem of news) {
      await prisma.news.upsert({
        where: { id: newsItem.id },
        update: {},
        create: newsItem
      });
    }
    console.log('News seeding finished.');

    console.log('Starting to seed team members...');
    for (const member of teamMembers) {
      await prisma.teamMember.upsert({
        where: { id: member.id },
        update: {},
        create: member
      });
    }
    console.log('Team members seeding finished.');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });