import { describe, expect, it } from 'vitest';
import { normalizeSkill, normalizeSkills } from './skills.js';

describe('normalizeSkill', () => {
  it('trims and lowercases', () => {
    expect(normalizeSkill('  TypeScript  ')).toBe('typescript');
  });
});

describe('normalizeSkills', () => {
  it('trims, lowercases, and deduplicates', () => {
    expect(normalizeSkills(['  TypeScript ', 'NODE.js', 'typescript', 'Go'])).toEqual([
      'typescript',
      'node.js',
      'go',
    ]);
  });

  it('drops empty strings after trim', () => {
    expect(normalizeSkills(['', '  ', 'React', 'react'])).toEqual(['react']);
  });

  it('preserves first-seen order', () => {
    expect(normalizeSkills(['B', 'A', 'b', 'C'])).toEqual(['b', 'a', 'c']);
  });
});
