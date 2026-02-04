import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

import { cloudinary } from '../core/cloudinary';
import { ingestionService } from '../core/ai.container';

const prisma = new PrismaClient();

type UploadMaterialInput = {
  title?: string;
  courseType?: string;
  courseName?: string;
  materialType?: string;
  visibility?: string;
  file: Express.Multer.File;
};

export class MaterialsService {
  async listMyMaterials(userId: number) {
    try {
      const materials = await prisma.aiMaterial.findMany({
        where: {
          ownerUserId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return { statusCode: 200, message: materials };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async updateMaterialMetadataScoped(
    materialId: string,
    requester: { userId: number; role?: string },
    updates: {
      title?: string;
      visibility?: string;
      courseType?: string | null;
      courseName?: string | null;
      materialType?: string;
    }
  ) {
    try {
      const id = Number(materialId);
      if (Number.isNaN(id)) {
        return { statusCode: 400, message: { message: 'Invalid material id' } };
      }

      const existing = await prisma.aiMaterial.findUnique({ where: { id } });
      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const isAdmin = requester.role === 'ADMIN';
      if (!isAdmin && existing.ownerUserId !== requester.userId) {
        return { statusCode: 403, message: { message: 'Access denied' } };
      }

      return await this.updateMaterialMetadata(materialId, updates);
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async deleteMaterialScoped(materialId: string, requester: { userId: number; role?: string }) {
    try {
      const id = Number(materialId);
      if (Number.isNaN(id)) {
        return { statusCode: 400, message: { message: 'Invalid material id' } };
      }

      const existing = await prisma.aiMaterial.findUnique({ where: { id } });
      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const isAdmin = requester.role === 'ADMIN';
      if (!isAdmin && existing.ownerUserId !== requester.userId) {
        return { statusCode: 403, message: { message: 'Access denied' } };
      }

      return await this.deleteMaterial(materialId);
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async listAllMaterialsAdmin(filter?: 'pending' | 'approved' | 'all') {
    try {
      const where: any = {};

      if (filter === 'approved') {
        where.isApproved = true;
      } else if (filter === 'pending') {
        where.status = { in: ['UPLOADED', 'SUBMITTED'] };
      }

      const materials = await prisma.aiMaterial.findMany({
        where,
        include: {
          ownerUser: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              role: true,
              isStudent: true,
            },
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return { statusCode: 200, message: materials };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async updateMaterialMetadata(
    materialId: string,
    updates: {
      title?: string;
      visibility?: string;
      courseType?: string | null;
      courseName?: string | null;
      materialType?: string;
    }
  ) {
    try {
      const id = Number(materialId);
      if (Number.isNaN(id)) {
        return { statusCode: 400, message: { message: 'Invalid material id' } };
      }

      const existing = await prisma.aiMaterial.findUnique({ where: { id } });
      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const data: any = {};
      if (typeof updates.title === 'string') data.title = updates.title;
      if (typeof updates.visibility === 'string') data.visibility = updates.visibility;
      if (updates.courseType !== undefined) data.courseType = updates.courseType;
      if (updates.courseName !== undefined) data.courseName = updates.courseName;
      if (typeof updates.materialType === 'string') data.materialType = updates.materialType;

      const updated = await prisma.aiMaterial.update({
        where: { id },
        data,
      });

      return { statusCode: 200, message: updated };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async deleteMaterial(materialId: string) {
    try {
      const id = Number(materialId);
      if (Number.isNaN(id)) {
        return { statusCode: 400, message: { message: 'Invalid material id' } };
      }

      const material = await prisma.aiMaterial.findUnique({ where: { id } });
      if (!material) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const cloudinaryPublicId = material.cloudinaryPublicId || material.storagePath;
      if (cloudinaryPublicId) {
        await cloudinary.uploader
          .destroy(cloudinaryPublicId, { resource_type: 'raw' })
          .catch(() => undefined);
      }

      await prisma.$transaction(async (tx) => {
        const chunks = await tx.aiMaterialChunk.findMany({
          where: { materialId: id },
          select: { id: true },
        });
        const chunkIds = chunks.map((c) => c.id);

        if (chunkIds.length > 0) {
          await tx.aiQueryRetrieval.deleteMany({ where: { chunkId: { in: chunkIds } } });
          await tx.aiChunkEmbedding.deleteMany({ where: { chunkId: { in: chunkIds } } });
        }

        await tx.aiMaterialChunk.deleteMany({ where: { materialId: id } });

        await tx.aiQueryLog.updateMany({
          where: { materialId: id },
          data: { materialId: null },
        });

        await tx.aiMaterial.delete({ where: { id } });
      });

      return { statusCode: 200, message: { message: 'Deleted' } };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async listPublicMaterials() {
    try {
      const materials = await prisma.aiMaterial.findMany({
        where: {
          visibility: 'PUBLIC',
          isApproved: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return { statusCode: 200, message: materials };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async uploadMaterial(userId: number, input: UploadMaterialInput) {
    try {
      if (input.file.mimetype !== 'application/pdf') {
        return {
          statusCode: 400,
          message: { message: 'Only PDF materials are supported.' },
        };
      }

      const settings = await (prisma as any).aiSettings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, requireApproval: true },
      });

      const requireApproval = Boolean(settings?.requireApproval);
      const autoApprove = !requireApproval;

      const checksum = crypto.createHash('sha256').update(input.file.buffer).digest('hex');

      const uploadResult = await new Promise<{
        public_id: string;
        secure_url: string;
        resource_type: string;
        format?: string;
        bytes?: number;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'iapm/ai-materials',
            resource_type: 'raw',
            use_filename: true,
            unique_filename: true,
            filename_override: input.file.originalname,
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Cloudinary upload failed'));
            }

            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
              resource_type: result.resource_type,
              format: (result as any).format,
              bytes: result.bytes,
            });
          }
        );

        uploadStream.end(input.file.buffer);
      });

      const created = await prisma.aiMaterial.create({
        data: {
          ownerUserId: userId,
          title: input.title || input.file.originalname,
          courseType: input.courseType || null,
          courseName: input.courseName || null,
          materialType: (input.materialType as any) || 'OTHER',
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          checksumSha256: checksum,
          visibility: (input.visibility as any) || 'PRIVATE',
          storageProvider: 'CLOUDINARY',
          storagePath: uploadResult.public_id,
          cloudinaryPublicId: uploadResult.public_id,
          cloudinaryUrl: uploadResult.secure_url,
          status: autoApprove ? 'APPROVED' : 'SUBMITTED',
          isApproved: autoApprove,
          approvedAt: autoApprove ? new Date() : null,
          approvedByUserId: null,
          indexStatus: autoApprove ? 'PENDING' : 'PENDING',
          indexedAt: null,
          indexError: null,
        },
      });

      if (autoApprove) {
        console.log('[AI][INGEST_DISPATCH]', created.id);
        ingestionService.ingestMaterial(created.id).catch((err: any) => {
          console.error('[AI][INGEST_FAILED]', created.id, err?.stack || err);
        });
      }

      return { statusCode: 201, message: created };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async submitForApproval(userId: number, materialId: string) {
    try {
      const existing = await prisma.aiMaterial.findFirst({
        where: {
          id: Number(materialId),
          ownerUserId: userId,
        },
      });

      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const updated = await prisma.aiMaterial.update({
        where: {
          id: Number(materialId),
        },
        data: {
          status: 'SUBMITTED',
          isApproved: false,
          approvedAt: null,
          approvedByUserId: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedReason: null,
        },
      });

      return { statusCode: 200, message: updated };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async approveMaterial(adminId: number, materialId: string) {
    try {
      console.log('[AI][APPROVE]', materialId);
      const existing = await prisma.aiMaterial.findUnique({
        where: { id: Number(materialId) },
      });

      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const updated = await prisma.aiMaterial.update({
        where: {
          id: Number(materialId),
        },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedByUserId: adminId,
          status: 'APPROVED',
          indexStatus: 'INDEXING',
          indexedAt: null,
          indexError: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedReason: null,
        },
      });

      console.log('[AI][INGEST_DISPATCH]', updated.id);
      ingestionService.ingestMaterial(updated.id).catch((err: any) => {
        console.error('[AI][INGEST_FAILED]', updated.id, err?.stack || err);
      });

      return { statusCode: 200, message: updated };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async rejectMaterial(adminId: number, materialId: string, reason?: string) {
    try {
      const existing = await prisma.aiMaterial.findUnique({
        where: { id: Number(materialId) },
      });

      if (!existing) {
        return { statusCode: 404, message: { message: 'Material not found' } };
      }

      const updated = await prisma.aiMaterial.update({
        where: {
          id: Number(materialId),
        },
        data: {
          isApproved: false,
          approvedAt: null,
          approvedByUserId: null,
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedByUserId: adminId,
          rejectedReason: reason || null,
        },
      });

      return { statusCode: 200, message: updated };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }
}
