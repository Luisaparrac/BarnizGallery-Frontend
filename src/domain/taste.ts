import type { Id, IsoDate } from "./common";

/** Answers of the welcome questionnaire, as catalog ids. */
export interface TasteProfile {
  colorIds: Id[];
  shapeIds: Id[];
  styleIds: Id[];
  motifIds: Id[];
  budgetRangeId: Id | null;
}

export type RecommendationStrategy = "profile" | "interactions" | "hybrid" | "ai";

export interface Recommendation {
  id: Id;
  storeId: Id | null;
  artworkId: Id | null;
  score: number;
  reason: string;
  strategy: RecommendationStrategy;
  createdAt: IsoDate;
}

export type InteractionAction =
  | "VIEW"
  | "ZOOM"
  | "FAVORITE"
  | "ADD_TO_CART"
  | "SHARE"
  | "BID"
  | "BUY"
  | "VISIT_STORE"
  | "CUSTOM_ORDER";

export interface InteractionInput {
  action: InteractionAction;
  artworkId?: Id;
  storeId?: Id;
  durationSeconds?: number;
}

/** Language, avatar and questionnaire of a visitor who has not created an account yet. */
export interface VisitorSetup {
  completed: boolean;
  avatarId: Id | null;
  taste: TasteProfile | null;
}
