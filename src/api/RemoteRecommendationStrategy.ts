import type { RecommendationOutcome, TasteSubmission } from "../model/models";
import type { ApiClient } from "./ApiClient";
import type { RecommendationStrategy } from "./RecommendationStrategy";

/** Identifies the visitor, saves the taste profile and asks the backend for recommendations. */
export class RemoteRecommendationStrategy implements RecommendationStrategy {
  constructor(private readonly api: ApiClient) {}

  async compute(submission: TasteSubmission): Promise<RecommendationOutcome> {
    const { visitor } = await this.api.identifyVisitor({
      email: submission.email,
      name: submission.name,
      country: submission.country,
      preferredLanguage: submission.language,
      cameraMode: submission.cameraMode,
    });
    await this.api.saveTasteProfile(visitor.visitorId, submission.profile);
    const recommendations = await this.api.computeRecommendations(visitor.visitorId, "hybrid");
    return { visitor, recommendations, isDemo: false };
  }
}
