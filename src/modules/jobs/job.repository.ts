import type { Job, JobSkill, JobSkillType, PrismaClient } from '@prisma/client';
import type { CreateJobInput } from './job.schemas.js';

export type JobWithSkills = Job & { skills: JobSkill[] };

export type CreateJobSkillData = {
  skill: string;
  type: JobSkillType;
};

export type CreateJobData = Omit<CreateJobInput, 'skills'> & {
  skills: CreateJobSkillData[];
};

/**
 * Job persistence (Repository Pattern).
 */
export class JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<JobWithSkills | null> {
    return this.prisma.job.findUnique({
      where: { id },
      include: { skills: true },
    });
  }

  async create(data: CreateJobData): Promise<JobWithSkills> {
    return this.prisma.job.create({
      data: {
        title: data.title,
        minYearsExperience: data.minYearsExperience,
        location: data.location,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        remoteAllowed: data.remoteAllowed,
        skills: {
          create: data.skills.map((entry) => ({
            skill: entry.skill,
            type: entry.type,
          })),
        },
      },
      include: { skills: true },
    });
  }

  async findAll(): Promise<JobWithSkills[]> {
    return this.prisma.job.findMany({
      include: { skills: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
