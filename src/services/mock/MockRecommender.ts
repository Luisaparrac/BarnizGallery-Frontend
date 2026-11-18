import type { Id } from "../../domain/common";
import type { InteractionAction, Recommendation, RecommendationStrategy, TasteProfile } from "../../domain/taste";
import { MockDatabase } from "./MockDatabase";
import type { ArtworkRow } from "./MockTables";
import { views } from "./MockViews";

const WEIGHTS: Record<InteractionAction, number> = {
  VIEW: 1, ZOOM: 2, FAVORITE: 3, ADD_TO_CART: 4, SHARE: 2, BID: 5, BUY: 6, VISIT_STORE: 1, CUSTOM_ORDER: 3,
};

interface Match {
  score: number;
  colors: Id[];
  shape: boolean;
  style: boolean;
  motifs: Id[];
  budget: boolean;
}

/**
 * Simulated recommendation strategies (profile, interactions and hybrid 60/40) like the backend's
 * RecommendationStrategy classes. The reason is a structured string the interface translates:
 * "colors=1,11;shape=1;style=0;motifs=2;budget=1;interactions=0".
 */
export class MockRecommender {
  private get t() {
    return MockDatabase.instance.tables;
  }

  recommend(profile: TasteProfile | null, userId: Id | null, strategy: RecommendationStrategy): Recommendation[] {
    const artworks = this.t.artworks.filter((artwork) => views.isPublicArtwork(artwork));
    const interactionPoints = userId ? this.interactionPoints(userId) : new Map<Id, number>();
    const useInteractions = strategy === "interactions" || (strategy === "hybrid" && userId !== null && this.interactionCount(userId) >= 3);
    const maxPoints = Math.max(1, ...interactionPoints.values());

    const scored = artworks.map((artwork) => {
      const match = profile ? this.match(profile, artwork) : { score: 0, colors: [], shape: false, style: false, motifs: [], budget: false };
      const interactions = (interactionPoints.get(artwork.id) ?? 0) / maxPoints;
      let score = match.score;
      if (strategy === "interactions") score = interactions * 100;
      else if (useInteractions) score = match.score * 0.4 + interactions * 100 * 0.6;
      return { artwork, match, score: Math.round(score), interactions: interactions > 0 };
    });

    const now = new Date().toISOString();
    const reason = (match: Match, interactions: boolean) =>
      `colors=${match.colors.join(",")};shape=${match.shape ? 1 : 0};style=${match.style ? 1 : 0};motifs=${match.motifs.join(",")};budget=${match.budget ? 1 : 0};interactions=${interactions ? 1 : 0}`;
    let id = 0;
    const topArtworks = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

    const byStore = new Map<Id, typeof scored>();
    scored.forEach((entry) => byStore.set(entry.artwork.storeId, [...(byStore.get(entry.artwork.storeId) ?? []), entry]));
    const stores = [...byStore.entries()]
      .map(([storeId, entries]) => {
        const best = entries.sort((a, b) => b.score - a.score).slice(0, 2);
        const score = Math.round(best.reduce((total, entry) => total + entry.score, 0) / best.length);
        return { storeId, score, best: best[0] };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return [
      ...stores.map((entry) => ({ id: ++id, storeId: entry.storeId, artworkId: null, score: entry.score, reason: reason(entry.best.match, entry.best.interactions), strategy, createdAt: now })),
      ...topArtworks.map((entry) => ({ id: ++id, storeId: null, artworkId: entry.artwork.id, score: entry.score, reason: reason(entry.match, entry.interactions), strategy, createdAt: now })),
    ];
  }

  private match(profile: TasteProfile, artwork: ArtworkRow): Match {
    const multicolor = this.t.catalogs.colors.find((color) => color.code === "multicolor")?.id;
    const colors = profile.colorIds.filter((id) => artwork.colorIds.includes(id) || (id === multicolor && artwork.colorIds.length >= 3));
    const shape = artwork.shapeId !== null && profile.shapeIds.includes(artwork.shapeId);
    const style = artwork.styleId !== null && profile.styleIds.includes(artwork.styleId);
    const motifs = profile.motifIds.filter((id) => artwork.motifIds.includes(id));
    const range = this.t.catalogs.budgets.find((budget) => budget.id === profile.budgetRangeId);
    const budget = !!range && artwork.price !== null && artwork.price >= range.minAmount && (range.maxAmount === null || artwork.price <= range.maxAmount);
    const colorPart = profile.colorIds.length ? (colors.length / profile.colorIds.length) * 40 : 0;
    const motifPart = profile.motifIds.length ? (motifs.length / profile.motifIds.length) * 10 : 0;
    const score = colorPart + (shape ? 25 : 0) + (style ? 15 : 0) + motifPart + (budget ? 10 : 0);
    return { score, colors, shape, style, motifs, budget };
  }

  private interactionCount(userId: Id): number {
    return this.t.interactions.filter((row) => row.userId === userId).length;
  }

  private interactionPoints(userId: Id): Map<Id, number> {
    const points = new Map<Id, number>();
    for (const row of this.t.interactions.filter((entry) => entry.userId === userId)) {
      if (!row.artworkId) continue;
      const duration = row.durationSeconds ? Math.min(2, 1 + row.durationSeconds / 300) : 1;
      points.set(row.artworkId, (points.get(row.artworkId) ?? 0) + WEIGHTS[row.action] * duration);
    }
    return points;
  }
}

export const recommender = new MockRecommender();
