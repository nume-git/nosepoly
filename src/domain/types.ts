export type Role = "player" | "admin";

export type RoundState = "collecting" | "in_play" | "closed";

export type PredictionState = "draft" | "rating" | "rated" | "validating" | "hit" | "miss";

export type PredictionValue = 1 | 2 | 3;

export type Result = "hit" | "miss";

export interface Actor {
  id: string;
  role: Role;
  canCreate: boolean;
  isJury: boolean;
  deleted: boolean;
}

export interface RoundSnapshot {
  id: string;
  state: RoundState;
}

export interface PredictionSnapshot {
  id: string;
  roundId: string;
  authorId: string;
  state: PredictionState;
  value: PredictionValue | null;
}
