import { normalizeSkill, normalizeSkills } from '../../../../shared/skills.js';
import {
  DEFAULT_SCORING_WEIGHTS,
  SKILL_MUST_HAVE_SHARE,
  SKILL_NICE_TO_HAVE_SHARE,
} from '../../../../config/scoring.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

/** @deprecated Prefer DEFAULT_SCORING_WEIGHTS.skills */
export const SKILL_MAX_SCORE = DEFAULT_SCORING_WEIGHTS.skills;

export type SkillScoreDetails = {
  mustHaveMatched: number;
  mustHaveTotal: number;
  mustHavePoints: number;
  niceToHaveMatched: number;
  niceToHaveTotal: number;
  niceToHavePoints: number;
  noNiceToHaveSkills: boolean;
};

/**
 * Skill fit.
 * Eligibility already guarantees must-haves, so mandatory fit takes the must-have share.
 * Nice-to-have overlap contributes the remaining share proportionally.
 * Jobs with no nice-to-have skills are not penalized (full skills weight).
 */
export class SkillScorer implements ScoringStrategy {
  readonly name = 'skills' as const;
  readonly maxScore: number;
  private readonly mustHavePoints: number;
  private readonly niceToHavePoints: number;

  constructor(maxScore: number = DEFAULT_SCORING_WEIGHTS.skills) {
    this.maxScore = maxScore;
    this.mustHavePoints = maxScore * SKILL_MUST_HAVE_SHARE;
    this.niceToHavePoints = maxScore * SKILL_NICE_TO_HAVE_SHARE;
  }

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<SkillScoreDetails> {
    const candidateSkills = new Set(normalizeSkills(candidate.skills));

    const mustHaveSkills = uniqueSkills(
      job.skills.filter((entry) => entry.type === 'MUST_HAVE').map((entry) => entry.skill),
    );
    const niceToHaveSkills = uniqueSkills(
      job.skills.filter((entry) => entry.type === 'NICE_TO_HAVE').map((entry) => entry.skill),
    );

    const mustHaveMatched = mustHaveSkills.filter((skill) => candidateSkills.has(skill)).length;
    const mustHaveTotal = mustHaveSkills.length;
    const mustHavePoints = this.mustHavePoints;

    if (niceToHaveSkills.length === 0) {
      return {
        score: this.maxScore,
        maxScore: this.maxScore,
        details: {
          mustHaveMatched,
          mustHaveTotal,
          mustHavePoints,
          niceToHaveMatched: 0,
          niceToHaveTotal: 0,
          niceToHavePoints: this.niceToHavePoints,
          noNiceToHaveSkills: true,
        },
      };
    }

    const niceToHaveMatched = niceToHaveSkills.filter((skill) => candidateSkills.has(skill)).length;
    const niceToHaveTotal = niceToHaveSkills.length;
    const niceToHavePoints = (niceToHaveMatched / niceToHaveTotal) * this.niceToHavePoints;
    const score = mustHavePoints + niceToHavePoints;

    return {
      score,
      maxScore: this.maxScore,
      details: {
        mustHaveMatched,
        mustHaveTotal,
        mustHavePoints,
        niceToHaveMatched,
        niceToHaveTotal,
        niceToHavePoints,
        noNiceToHaveSkills: false,
      },
    };
  }
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of skills) {
    const skill = normalizeSkill(raw);
    if (skill.length === 0 || seen.has(skill)) {
      continue;
    }
    seen.add(skill);
    result.push(skill);
  }

  return result;
}
