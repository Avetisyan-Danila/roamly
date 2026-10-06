import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.property.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.amenity.deleteMany();
}
