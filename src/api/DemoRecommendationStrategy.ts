import { RoomCatalog } from "../data/RoomCatalog";
import type { RecommendationOutcome, TasteSubmission } from "../model/models";
import type { RecommendationStrategy } from "./RecommendationStrategy";

/**
 * Offline-only recommender: scores the placeholder tags of each sala against the questionnaire
 * so the kiosk can be demoed without a backend. Real recommendations always come from the API.
 */
export class DemoRecommendationStrategy implements RecommendationStrategy {
  async compute(submission: TasteSubmission): Promise<RecommendationOutcome> {
    const { preferredColors, preferredTypes, preferredStyles } = submission.profile;
    const wanted = new Set([...preferredColors, ...preferredTypes, ...preferredStyles].map(RoomCatalog.normalize));
    const recommendations = RoomCatalog.rooms
      .map((room) => {
        const hits = room.demoTags.filter((tag) => wanted.has(RoomCatalog.normalize(tag)));
        return {
          roomId: null,
          roomNameEs: room.displayName.es,
          roomNameEn: room.displayName.en,
          score: Math.round((hits.length / room.demoTags.length) * 100),
          reason: hits.length ? `demo:${hits.join(", ")}` : "demo:",
          roomKey: room.key,
        };
      })
      .sort((a, b) => b.score - a.score);
    return { visitor: null, recommendations, isDemo: true };
  }
}
