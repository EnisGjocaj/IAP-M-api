import { PrismaClient, Prisma, JobType } from '@prisma/client';
import { CreateJobListingDto, UpdateJobListingDto } from './jobListing.dto';
import { injectable } from 'tsyringe';

const prisma = new PrismaClient();

interface GetAllJobListingsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: JobType;
  location?: string;
  sortBy?: 'recent' | 'salaryHighToLow' | 'salaryLowToHigh';
  includeInactive?: boolean;
  showAll?: boolean;
}

@injectable()
export class JobListingService {
  async createJobListing(data: CreateJobListingDto) {
    try {
      const jobListing = await prisma.jobListing.create({
        data: {
          title: data.title,
          company: data.company || 'IAPM', 
          location: data.location,
          type: data.type,
          salary: data.salary,
          description: data.description,
          requirements: Array.isArray(data.requirements) ? data.requirements : [data.requirements],
        },
      });
      return { success: true, message: 'Job listing created successfully', data: jobListing };
    } catch (error) {
      console.error('Error creating job listing:', error);
      throw new Error('Failed to create job listing');
    }
  }

  async getAllJobListings(params: GetAllJobListingsParams = {}) {
    try {
      console.log('Backend received params:', params);
      
      const {
        page = 1,
        limit = 10,
        search = '',
        type,
        location,
        sortBy = 'recent',
        includeInactive = false,
      } = params;

      console.log('Checking for inactive listings in database...');
      const inactiveCount = await prisma.jobListing.count({
        where: { isActive: false }
      });
      console.log(`Total inactive listings in database: ${inactiveCount}`);

      const skip = (page - 1) * limit;

      const where: Prisma.JobListingWhereInput = {
        ...(type && { type }),
        ...(location && { location }),
        ...(includeInactive ? {} : { isActive: true }), 
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      console.log('Query where clause:', JSON.stringify(where, null, 2));

      
      console.log('Checking all job listings status...');
      const allListings = await prisma.jobListing.findMany();
      console.log('All listings status breakdown:', {
        total: allListings.length,
        active: allListings.filter(job => job.isActive).length,
        inactive: allListings.filter(job => !job.isActive).length,
        statuses: allListings.map(job => ({ id: job.id, isActive: job.isActive }))
      });

      const [total, jobListings] = await Promise.all([
        prisma.jobListing.count({ where }),
        prisma.jobListing.findMany({
          where,
          orderBy: { posted: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      console.log('Filtered query results:', {
        total,
        receivedListings: jobListings.length,
        listings: jobListings.map(job => ({
          id: job.id,
          title: job.title,
          isActive: job.isActive
        }))
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: jobListings,
        pagination: {
          total,
          page,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching job listings:', error);
      throw new Error('Failed to fetch job listings');
    }
  }

  async getJobListingById(id: number) {
    try {
      const jobListing = await prisma.jobListing.findUnique({
        where: { id },
      });

      if (!jobListing) {
        throw new Error('Job listing not found');
      }

      return { success: true, data: jobListing };
    } catch (error) {
      console.error('Error fetching job listing:', error);
      throw error;
    }
  }

  async updateJobListing(id: number, data: UpdateJobListingDto) {
    try {
      const jobListing = await prisma.jobListing.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.company && { company: data.company }),
          ...(data.location && { location: data.location }),
          ...(data.type && { type: data.type }),
          ...(data.salary && { salary: data.salary }),
          ...(data.description && { description: data.description }),
          ...(Array.isArray(data.requirements) && { requirements: data.requirements }),
          ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
        },
      });

      return { success: true, data: jobListing };
    } catch (error) {
      console.error('Error updating job listing:', error);
      throw error;
    }
  }

  async deleteJobListing(id: number) {
    try {
      await prisma.jobListing.delete({
        where: { id },
      });

      return { success: true, message: 'Job listing deleted successfully' };
    } catch (error) {
      console.error('Error deleting job listing:', error);
      throw error;
    }
  }

  async toggleJobListingStatus(id: number) {
    try {
      const jobListing = await prisma.jobListing.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!jobListing) {
        throw new Error('Job listing not found');
      }

      const updatedJobListing = await prisma.jobListing.update({
        where: { id },
        data: {
          isActive: !jobListing.isActive,
        },
      });

      return { success: true, data: updatedJobListing };
    } catch (error) {
      console.error('Error toggling job listing status:', error);
      throw error;
    }
  }
}
