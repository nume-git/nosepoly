import "server-only";
import { mockRepository } from "./mock/repository";
import type { GameRepository } from "./repository";

export const repo: GameRepository = mockRepository;

export const usingMockData = true;
