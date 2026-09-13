import {
  DEFAULT_SCORING_WEIGHTS,
  LOCATION_REMOTE_SHARE,
} from '../../../../config/scoring.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

/** @deprecated Prefer DEFAULT_SCORING_WEIGHTS.location */
export const LOCATION_MAX_SCORE = DEFAULT_SCORING_WEIGHTS.location;

export type LocationMatchKind = 'exact' | 'remote' | 'mismatch';

export type LocationScoreDetails = {
  candidateLocation: string;
  jobLocation: string;
  remoteAllowed: boolean;
  match: LocationMatchKind;
};

/**
 * Location preference: exact match > remote > mismatch.
 * Remote score is a configured share of the location weight (10/15 by default).
 */
export class LocationScorer implements ScoringStrategy {
  readonly name = 'location' as const;
  readonly maxScore: number;
  private readonly remoteScore: number;

  constructor(maxScore: number = DEFAULT_SCORING_WEIGHTS.location) {
    this.maxScore = maxScore;
    this.remoteScore = maxScore * LOCATION_REMOTE_SHARE;
  }

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<LocationScoreDetails> {
    const candidateLocation = normalizeLocation(candidate.location);
    const jobLocation = normalizeLocation(job.location);
    const exactMatch = candidateLocation === jobLocation && candidateLocation.length > 0;

    let score: number;
    let match: LocationMatchKind;

    if (exactMatch) {
      score = this.maxScore;
      match = 'exact';
    } else if (job.remoteAllowed) {
      score = this.remoteScore;
      match = 'remote';
    } else {
      score = 0;
      match = 'mismatch';
    }

    return {
      score,
      maxScore: this.maxScore,
      details: {
        candidateLocation,
        jobLocation,
        remoteAllowed: job.remoteAllowed,
        match,
      },
    };
  }
}

function normalizeLocation(location: string): string {
  return location.trim().toLowerCase();
}
