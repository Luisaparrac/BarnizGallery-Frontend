import type { RecommendationOutcome, TasteSubmission } from "../model/models";

/** Strategy interface: how a questionnaire turns into recommended salas. */
export interface RecommendationStrategy {
  compute(submission: TasteSubmission): Promise<RecommendationOutcome>;
}
