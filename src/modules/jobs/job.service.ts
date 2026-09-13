import type { JobRepository } from './job.repository.js';

/**
 * Job business logic.
 * Depends on the repository via constructor injection.
 */
export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async getById(id: string): Promise<null> {
    return this.jobRepository.findById(id);
  }

  async create(data: unknown): Promise<never> {
    return this.jobRepository.create(data);
  }

  async list(): Promise<never[]> {
    return this.jobRepository.findAll();
  }
}
