/**
 * Recommendation scoring domain types — independent of Express and Prisma.
 */

export type JobSkillType = 'MUST_HAVE' | 'NICE_TO_HAVE';

export type ScoringCandidate = {
  skills: string[];
  yearsOfExperience: number;
  location: string;
  expectedSalary: number;
};

export type ScoringJobSkill = {
  skill: string;
  type: JobSkillType;
};

export type ScoringJob = {
  skills: ScoringJobSkill[];
  minYearsExperience: number;
  location: string;
  salaryMin: number;
  salaryMax: number;
  remoteAllowed: boolean;
};

export type ScoreDimension = 'skills' | 'experience' | 'location' | 'salary';

export type ScoreResult<TDetails extends Record<string, unknown> = Record<string, unknown>> = {
  score: number;
  maxScore: number;
  details: TDetails;
};
