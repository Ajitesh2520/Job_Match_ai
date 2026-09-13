/**
 * Job persistence (Repository Pattern).
 * Concrete Prisma queries will be added with models.
 */
export class JobRepository {
  // constructor(private readonly prisma: PrismaClient) {}

  async findById(_id: string): Promise<null> {
    throw new Error('JobRepository.findById is not implemented yet');
  }

  async create(_data: unknown): Promise<never> {
    throw new Error('JobRepository.create is not implemented yet');
  }

  async findAll(): Promise<never[]> {
    throw new Error('JobRepository.findAll is not implemented yet');
  }
}
