import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestAmenities(prisma: PrismaService) {
  const wifi = await prisma.amenity.create({
    data: {
      code: 'WIFI',
      name: 'Wi-Fi',
    },
  });

  const kitchen = await prisma.amenity.create({
    data: {
      code: 'KITCHEN',
      name: 'Kitchen',
    },
  });

  return {
    wifi,
    kitchen,
  };
}
