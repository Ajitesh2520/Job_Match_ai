import type { Candidate, CandidateSkill, PrismaClient } from '@prisma/client';
import type { CreateCandidateInput } from './candidate.schemas.js';

export type CandidateWithSkills = Candidate & { skills: CandidateSkill[] };

export type CreateCandidateData = Omit<CreateCandidateInput, 'skills'> & {
  skills: string[];
};

/**
 * Candidate persistence (Repository Pattern).
 */
export class CandidateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CandidateWithSkills | null> {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: { skills: true },
    });
  }

  async create(data: CreateCandidateData): Promise<CandidateWithSkills> {
    return this.prisma.candidate.create({
      data: {
        name: data.name,
        yearsOfExperience: data.yearsOfExperience,
        location: data.location,
        expectedSalary: data.expectedSalary,
        skills: {
          create: data.skills.map((skill) => ({ skill })),
        },
      },
      include: { skills: true },
    });
  }
}
