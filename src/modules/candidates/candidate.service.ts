import { normalizeSkills } from '../../shared/skills.js';
import type { CandidateRepository, CandidateWithSkills } from './candidate.repository.js';
import type { CreateCandidateInput } from './candidate.schemas.js';

/**
 * Candidate business logic.
 * Depends on the repository via constructor injection.
 */
export class CandidateService {
  constructor(private readonly candidateRepository: CandidateRepository) {}

  async getById(id: string): Promise<CandidateWithSkills | null> {
    return this.candidateRepository.findById(id);
  }

  async create(input: CreateCandidateInput): Promise<CandidateWithSkills> {
    const skills = normalizeSkills(input.skills);

    return this.candidateRepository.create({
      name: input.name,
      yearsOfExperience: input.yearsOfExperience,
      location: input.location,
      expectedSalary: input.expectedSalary,
      skills,
    });
  }
}
