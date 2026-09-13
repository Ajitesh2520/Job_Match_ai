import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCORING_WEIGHTS,
  resolveScoringWeights,
  validateScoringWeights,
} from './scoring.js';
import { createScoringStrategies } from '../modules/recommendations/domain/create-scoring-strategies.js';
import { ScoringEngine } from '../modules/recommendations/domain/scoring-engine.js';

describe('scoring weight configuration', () => {
  it('exposes default weights totaling 100', () => {
    expect(DEFAULT_SCORING_WEIGHTS).toEqual({
      skills: 50,
      experience: 20,
      location: 15,
      salary: 15,
    });
    expect(
      DEFAULT_SCORING_WEIGHTS.skills +
        DEFAULT_SCORING_WEIGHTS.experience +
        DEFAULT_SCORING_WEIGHTS.location +
        DEFAULT_SCORING_WEIGHTS.salary,
    ).toBe(100);
  });

  it('accepts valid weights that total exactly 100', () => {
    expect(
      validateScoringWeights({
        skills: 40,
        experience: 30,
        location: 20,
        salary: 10,
      }),
    ).toEqual({
      skills: 40,
      experience: 30,
      location: 20,
      salary: 10,
    });
  });

  it('rejects negative weights', () => {
    expect(() =>
      validateScoringWeights({
        skills: 60,
        experience: -10,
        location: 25,
        salary: 25,
      }),
    ).toThrow(/experience.*non-negative/i);
  });

  it('rejects NaN weights', () => {
    expect(() =>
      validateScoringWeights({
        skills: Number.NaN,
        experience: 20,
        location: 15,
        salary: 15,
      }),
    ).toThrow(/skills.*non-negative finite/i);
  });

  it('rejects weights that do not total 100', () => {
    expect(() =>
      validateScoringWeights({
        skills: 50,
        experience: 20,
        location: 15,
        salary: 10,
      }),
    ).toThrow(/exactly 100/i);
  });

  it('resolveScoringWeights returns the validated defaults', () => {
    expect(resolveScoringWeights()).toEqual(DEFAULT_SCORING_WEIGHTS);
  });

  it('createScoringStrategies wires configured maximums into each strategy', () => {
    const strategies = createScoringStrategies({
      skills: 40,
      experience: 30,
      location: 20,
      salary: 10,
    });

    expect(strategies.map((s) => ({ name: s.name, maxScore: s.maxScore }))).toEqual([
      { name: 'skills', maxScore: 40 },
      { name: 'experience', maxScore: 30 },
      { name: 'location', maxScore: 20 },
      { name: 'salary', maxScore: 10 },
    ]);

    const engine = new ScoringEngine(strategies);
    expect(engine.maxScore).toBe(100);
  });

  it('rejects invalid weights before constructing strategies', () => {
    expect(() =>
      createScoringStrategies({
        skills: 50,
        experience: 50,
        location: 50,
        salary: 50,
      }),
    ).toThrow(/exactly 100/i);
  });
});
