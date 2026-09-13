import { normalizeSkill, normalizeSkills } from '../../../shared/skills.js';
import type { ScoringCandidate, ScoringJob } from './types.js';

/**
 * Hard filter before scoring.
 * Only MUST_HAVE skills can exclude a job. Nice-to-have, experience,
 * location, and salary never affect eligibility.
 */
export class EligibilityChecker {
  isEligible(candidate: ScoringCandidate, job: ScoringJob): boolean {
    const candidateSkills = new Set(normalizeSkills(candidate.skills));
    const mustHaveSkills = uniqueNormalizedSkills(
      job.skills.filter((entry) => entry.type === 'MUST_HAVE').map((entry) => entry.skill),
    );

    if (mustHaveSkills.length === 0) {
      return true;
    }

    return mustHaveSkills.every((skill) => candidateSkills.has(skill));
  }
}

function uniqueNormalizedSkills(skills: string[]): string[] {
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
