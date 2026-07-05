export interface ReviewPeriod {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

/**
 * The quarter whose BTW filing is due next: the most recently ended
 * quarter. Mirrors the backend's getQuarterUnderReview so the mobile app
 * asks for the same period the backend's scheduled report was created for.
 */
export function getCurrentReviewPeriod(now: Date = new Date()): ReviewPeriod {
  const quarterIndex = Math.floor(now.getMonth() / 3); // 0..3, current quarter
  if (quarterIndex === 0) {
    return { period: "Q4", year: now.getFullYear() - 1 };
  }
  return { period: QUARTERS[quarterIndex - 1], year: now.getFullYear() };
}
