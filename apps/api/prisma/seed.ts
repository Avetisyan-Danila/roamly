import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

const amenities = [
  {
    code: 'WIFI',
    name: 'Wi-Fi',
  },
  {
    code: 'KITCHEN',
    name: 'Kitchen',
  },
  {
    code: 'WASHING_MACHINE',
    name: 'Washing machine',
  },
  {
    code: 'AIR_CONDITIONING',
    name: 'Air conditioning',
  },
  {
    code: 'PARKING',
    name: 'Parking',
  },
];

async function main() {
  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: {
        code: amenity.code,
      },
      update: {
        name: amenity.name,
      },
      create: amenity,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });
