import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

export const LOCATION_MAX_SCORE = 15;

export type LocationMatchKind = 'exact' | 'remote' | 'mismatch';

export type LocationScoreDetails = {
  candidateLocation: string;
  jobLocation: string;
  remoteAllowed: boolean;
  match: LocationMatchKind;
};

/**
 * Location preference (max 15): exact match > remote > mismatch.
 */
export class LocationScorer implements ScoringStrategy {
  readonly name = 'location' as const;
  readonly maxScore = LOCATION_MAX_SCORE;

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<LocationScoreDetails> {
    const candidateLocation = normalizeLocation(candidate.location);
    const jobLocation = normalizeLocation(job.location);
    const exactMatch = candidateLocation === jobLocation && candidateLocation.length > 0;

    let score: number;
    let match: LocationMatchKind;

    if (exactMatch) {
      score = LOCATION_MAX_SCORE;
      match = 'exact';
    } else if (job.remoteAllowed) {
      score = 10;
      match = 'remote';
    } else {
      score = 0;
      match = 'mismatch';
    }

    return {
      score,
      maxScore: LOCATION_MAX_SCORE,
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
