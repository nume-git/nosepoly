import type { PredictionState, PredictionValue, Role, RoundState } from "@/domain/types";

export interface UserRecord {
  id: string;
  email: string | null;
  alias: string | null;
  role: Role;
  canCreate: boolean;
  isJury: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface RoundRecord {
  id: string;
  name: string;
  state: RoundState;
  openedAt: Date;
  collectingClosedAt: Date | null;
  closedAt: Date | null;
}

export interface PredictionRecord {
  id: string;
  roundId: string;
  authorId: string;
  text: string;
  state: PredictionState;
  value: PredictionValue | null;
  valueSetByAdmin: boolean;
  resultSetByAdmin: boolean;
  hidden: boolean;
  createdAt: Date;
  validatedAt: Date | null;
}

export interface AuditEntry {
  actorId: string;
  action: string;
  entity: "prediction" | "round" | "user";
  entityId: string;
  before: unknown;
  after: unknown;
}

/**
 * Acceso a datos del juego. Hoy lo implementa un store en memoria con datos de
 * prueba; después lo implementa Drizzle sobre Postgres sin cambiar las pantallas.
 */
export interface GameRepository {
  getUser(id: string): Promise<UserRecord | null>;
  listUsers(): Promise<UserRecord[]>;
  updateUser(id: string, patch: Partial<Pick<UserRecord, "canCreate" | "isJury">>): Promise<void>;

  listRounds(): Promise<RoundRecord[]>;
  getRound(id: string): Promise<RoundRecord | null>;
  createRound(name: string): Promise<RoundRecord>;
  updateRound(id: string, patch: Partial<Omit<RoundRecord, "id">>): Promise<void>;

  listPredictions(filter?: { roundId?: string }): Promise<PredictionRecord[]>;
  getPrediction(id: string): Promise<PredictionRecord | null>;
  insertPrediction(input: Pick<PredictionRecord, "roundId" | "authorId" | "text">): Promise<PredictionRecord>;
  updatePrediction(id: string, patch: Partial<Omit<PredictionRecord, "id">>): Promise<void>;
  deletePrediction(id: string): Promise<void>;

  ratingVotes(predictionIds: string[]): Promise<Map<string, Map<string, PredictionValue>>>;
  setRatingVote(predictionId: string, userId: string, value: PredictionValue): Promise<void>;
  validationVotes(predictionIds: string[]): Promise<Map<string, Map<string, boolean>>>;
  setValidationVote(predictionId: string, userId: string, fulfilled: boolean): Promise<void>;
  clearValidationVotes(predictionId: string): Promise<void>;

  addAudit(entry: AuditEntry): Promise<void>;
}
