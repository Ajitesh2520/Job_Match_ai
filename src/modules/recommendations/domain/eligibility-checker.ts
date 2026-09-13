/**
 * Hard filters before scoring (e.g. must-have skills).
 * Ineligible jobs are excluded from recommendations.
 */
export class EligibilityChecker {
  isEligible(_candidate: unknown, _job: unknown): boolean {
    throw new Error('EligibilityChecker.isEligible is not implemented yet');
  }
}
