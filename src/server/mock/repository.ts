import type { PredictionValue } from "@/domain/types";
import type { AuditEntry, GameRepository, PredictionRecord, RoundRecord, UserRecord } from "../repository";
import { seedPredictions, seedRatingVotes, seedRounds, seedUsers, seedValidationVotes } from "./seed";

interface Store {
  users: Map<string, UserRecord>;
  rounds: Map<string, RoundRecord>;
  predictions: Map<string, PredictionRecord>;
  ratingVotes: Map<string, Map<string, PredictionValue>>;
  validationVotes: Map<string, Map<string, boolean>>;
  audit: (AuditEntry & { at: Date })[];
  nextId: number;
}

function createStore(): Store {
  const ratingVotes = new Map<string, Map<string, PredictionValue>>();
  for (const [p, u, v] of seedRatingVotes) {
    if (!ratingVotes.has(p)) ratingVotes.set(p, new Map());
    ratingVotes.get(p)!.set(u, v);
  }
  const validationVotes = new Map<string, Map<string, boolean>>();
  for (const [p, u, v] of seedValidationVotes) {
    if (!validationVotes.has(p)) validationVotes.set(p, new Map());
    validationVotes.get(p)!.set(u, v);
  }
  return {
    users: new Map(seedUsers.map((u) => [u.id, { ...u }])),
    rounds: new Map(seedRounds.map((r) => [r.id, { ...r }])),
    predictions: new Map(seedPredictions.map((p) => [p.id, { ...p }])),
    ratingVotes,
    validationVotes,
    audit: [],
    nextId: 1000,
  };
}

// Se guarda en globalThis para que sobreviva a las recargas en caliente del servidor de desarrollo.
const globalForStore = globalThis as unknown as { __mockStore?: Store };
const store = (globalForStore.__mockStore ??= createStore());

const clone = <T extends object>(value: T): T => ({ ...value });

function pick<T>(map: Map<string, Map<string, T>>, ids: string[]) {
  return new Map(ids.map((id) => [id, new Map(map.get(id) ?? [])]));
}

export const mockRepository: GameRepository = {
  async getUser(id) {
    const user = store.users.get(id);
    return user ? clone(user) : null;
  },
  async listUsers() {
    return [...store.users.values()].map(clone);
  },
  async updateUser(id, patch) {
    const user = store.users.get(id);
    if (user) Object.assign(user, patch);
  },

  async listRounds() {
    return [...store.rounds.values()].sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime()).map(clone);
  },
  async getRound(id) {
    const round = store.rounds.get(id);
    return round ? clone(round) : null;
  },
  async createRound(name) {
    const round: RoundRecord = {
      id: `r${store.nextId++}`,
      name,
      state: "collecting",
      openedAt: new Date(),
      collectingClosedAt: null,
      closedAt: null,
    };
    store.rounds.set(round.id, round);
    return clone(round);
  },
  async updateRound(id, patch) {
    const round = store.rounds.get(id);
    if (round) Object.assign(round, patch);
  },

  async listPredictions(filter) {
    return [...store.predictions.values()]
      .filter((p) => !filter?.roundId || p.roundId === filter.roundId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  },
  async getPrediction(id) {
    const prediction = store.predictions.get(id);
    return prediction ? clone(prediction) : null;
  },
  async insertPrediction({ roundId, authorId, text }) {
    const prediction: PredictionRecord = {
      id: `p${store.nextId++}`,
      roundId,
      authorId,
      text,
      state: "draft",
      value: null,
      valueSetByAdmin: false,
      resultSetByAdmin: false,
      hidden: false,
      createdAt: new Date(),
      validatedAt: null,
    };
    store.predictions.set(prediction.id, prediction);
    return clone(prediction);
  },
  async updatePrediction(id, patch) {
    const prediction = store.predictions.get(id);
    if (prediction) Object.assign(prediction, patch);
  },
  async deletePrediction(id) {
    store.predictions.delete(id);
    store.ratingVotes.delete(id);
    store.validationVotes.delete(id);
  },

  async ratingVotes(ids) {
    return pick(store.ratingVotes, ids);
  },
  async setRatingVote(predictionId, userId, value) {
    if (!store.ratingVotes.has(predictionId)) store.ratingVotes.set(predictionId, new Map());
    store.ratingVotes.get(predictionId)!.set(userId, value);
  },
  async validationVotes(ids) {
    return pick(store.validationVotes, ids);
  },
  async setValidationVote(predictionId, userId, fulfilled) {
    if (!store.validationVotes.has(predictionId)) store.validationVotes.set(predictionId, new Map());
    store.validationVotes.get(predictionId)!.set(userId, fulfilled);
  },
  async clearValidationVotes(predictionId) {
    store.validationVotes.delete(predictionId);
  },

  async addAudit(entry) {
    store.audit.push({ ...entry, at: new Date() });
  },
};
