import type { CandidateRepository } from './candidate.repository.js';

/**
 * Candidate business logic.
 * Depends on the repository via constructor injection.
 */
export class CandidateService {
  constructor(private readonly candidateRepository: CandidateRepository) {}

  async getById(id: string): Promise<null> {
    return this.candidateRepository.findById(id);
  }

  async create(data: unknown): Promise<never> {
    return this.candidateRepository.create(data);
  }
}
