import type { PrismaClient } from '@prisma/client';

export async function assertMaterialsAccessible(params: {
  prisma: PrismaClient;
  userId: number;
  materialIds: number[];
}) {
  const { prisma, userId, materialIds } = params;

  const materials = await prisma.aiMaterial.findMany({
    where: {
      id: { in: materialIds },
      isApproved: true,
      OR: [{ ownerUserId: userId }, { visibility: 'PUBLIC' }],
    },
    select: { id: true },
  });

  if (materials.length !== materialIds.length) {
    throw new Error('One or more materials are not approved or not accessible');
  }
}
