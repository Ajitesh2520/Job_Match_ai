/**
 * Prisma client placeholder.
 * Instantiation and lifecycle management will be wired when models exist.
 */
export type PrismaClientPlaceholder = {
  // Replaced by @prisma/client once schema models are defined.
  readonly __brand: 'PrismaClientPlaceholder';
};

let prisma: PrismaClientPlaceholder | null = null;

export function getPrismaClient(): PrismaClientPlaceholder {
  if (!prisma) {
    prisma = { __brand: 'PrismaClientPlaceholder' };
  }
  return prisma;
}
