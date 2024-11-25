import { JobType } from '@prisma/client';

export interface CreateJobListingDto {
  title: string;
  company?: string;
  location: string;
  type: JobType;
  salary: string;
  description: string;
  requirements: string[];
}

export interface UpdateJobListingDto {
  title?: string;
  company?: string;
  location?: string;
  type?: JobType;
  salary?: string;
  description?: string;
  requirements?: string[];
  isActive?: boolean;
}
