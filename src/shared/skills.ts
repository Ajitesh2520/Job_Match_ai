/**
 * Normalizes a single skill token: trim + lowercase.
 * Empty strings after trim are discarded by callers.
 */
export function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

/**
 * Trims, lowercases, drops empties, and deduplicates while preserving first-seen order.
 */
export function normalizeSkills(skills: string[]): string[] {
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
