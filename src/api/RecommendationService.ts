import type { RecommendationOutcome, TasteSubmission } from "../model/models";
import { ApiError } from "./ApiError";
import type { RecommendationStrategy } from "./RecommendationStrategy";

/** Runs the remote strategy and, on network failure only, falls back to the demo one. */
export class RecommendationService {
  constructor(
    private readonly remote: RecommendationStrategy,
    private readonly demo: RecommendationStrategy,
    private readonly allowFallback: boolean,
  ) {}

  async recommend(submission: TasteSubmission): Promise<RecommendationOutcome> {
    try {
      return await this.remote.compute(submission);
    } catch (error) {
      // An HTTP error means the backend answered: show it instead of hiding it behind demo data.
      if (error instanceof ApiError || !this.allowFallback) throw error;
      return this.demo.compute(submission);
    }
  }
}
