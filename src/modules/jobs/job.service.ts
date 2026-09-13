import { normalizeSkill } from '../../shared/skills.js';
import type { CreateJobData, JobRepository, JobWithSkills } from './job.repository.js';
import type { CreateJobInput } from './job.schemas.js';

/**
 * Job business logic.
 * Depends on the repository via constructor injection.
 */
export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async getById(id: string): Promise<JobWithSkills | null> {
    return this.jobRepository.findById(id);
  }

  async create(input: CreateJobInput): Promise<JobWithSkills> {
    const skills = normalizeJobSkills(input.skills);

    const data: CreateJobData = {
      title: input.title,
      minYearsExperience: input.minYearsExperience,
      location: input.location,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      remoteAllowed: input.remoteAllowed,
      skills,
    };

    return this.jobRepository.create(data);
  }

  async list(): Promise<JobWithSkills[]> {
    return this.jobRepository.findAll();
  }
}

/**
 * Normalizes job skill names and deduplicates by skill.
 * First occurrence wins (preserves its type).
 */
export function normalizeJobSkills(
  skills: CreateJobInput['skills'],
): CreateJobData['skills'] {
  const seen = new Set<string>();
  const result: CreateJobData['skills'] = [];

  for (const entry of skills) {
    const skill = normalizeSkill(entry.skill);
    if (skill.length === 0 || seen.has(skill)) {
      continue;
    }
    seen.add(skill);
    result.push({ skill, type: entry.type });
  }

  return result;
}
