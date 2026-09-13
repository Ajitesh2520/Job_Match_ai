import { normalizeSkill, normalizeSkills } from '../../../../shared/skills.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

export const SKILL_MAX_SCORE = 50;
const MUST_HAVE_POINTS = 40;
const NICE_TO_HAVE_POINTS = 10;

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
 * Skill fit (max 50).
 * Eligibility already guarantees must-haves, so mandatory fit is worth 40.
 * Nice-to-have overlap contributes up to 10 proportionally.
 * Jobs with no nice-to-have skills are not penalized (full 50).
 */
export class SkillScorer implements ScoringStrategy {
  readonly name = 'skills' as const;
  readonly maxScore = SKILL_MAX_SCORE;

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
    const mustHavePoints = MUST_HAVE_POINTS;

    if (niceToHaveSkills.length === 0) {
      return {
        score: SKILL_MAX_SCORE,
        maxScore: SKILL_MAX_SCORE,
        details: {
          mustHaveMatched,
          mustHaveTotal,
          mustHavePoints,
          niceToHaveMatched: 0,
          niceToHaveTotal: 0,
          niceToHavePoints: NICE_TO_HAVE_POINTS,
          noNiceToHaveSkills: true,
        },
      };
    }

    const niceToHaveMatched = niceToHaveSkills.filter((skill) => candidateSkills.has(skill)).length;
    const niceToHaveTotal = niceToHaveSkills.length;
    const niceToHavePoints = (niceToHaveMatched / niceToHaveTotal) * NICE_TO_HAVE_POINTS;
    const score = mustHavePoints + niceToHavePoints;

    return {
      score,
      maxScore: SKILL_MAX_SCORE,
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
