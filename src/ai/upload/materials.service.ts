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
          status: 'UPLOADED',
          isApproved: false,
        },
      });

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
          indexStatus: 'PENDING',
          indexedAt: null,
          indexError: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedReason: null,
        },
      });

      ingestionService.ingestMaterial(updated.id).catch(() => undefined);

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
