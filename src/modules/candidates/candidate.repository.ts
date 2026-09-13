/**
 * Candidate persistence (Repository Pattern).
 * Concrete Prisma queries will be added with models.
 */
export class CandidateRepository {
  // constructor(private readonly prisma: PrismaClient) {}

  async findById(_id: string): Promise<null> {
    throw new Error('CandidateRepository.findById is not implemented yet');
  }

  async create(_data: unknown): Promise<never> {
    throw new Error('CandidateRepository.create is not implemented yet');
  }
}
