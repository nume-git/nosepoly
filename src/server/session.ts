import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Actor } from "@/domain/types";
import { repo } from "./repo";
import type { UserRecord } from "./repository";

export const DEV_USER_COOKIE = "dev_user";
const DEFAULT_DEV_USER = "u-admin";

export interface Viewer {
  actor: Actor;
  user: UserRecord;
}

export function toActor(user: UserRecord): Actor {
  return {
    id: user.id,
    role: user.role,
    canCreate: user.canCreate,
    isJury: user.isJury,
    deleted: user.deletedAt !== null,
  };
}

/**
 * Usuario actual. Mientras se usan datos de prueba sale de una cookie de
 * desarrollo; con Supabase va a salir de la sesión de login. Memoizado por
 * request: el encabezado y la página comparten el resultado.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const id = (await cookies()).get(DEV_USER_COOKIE)?.value ?? DEFAULT_DEV_USER;
  const user = (await repo.getUser(id)) ?? (await repo.getUser(DEFAULT_DEV_USER));
  if (!user) throw new Error("No se encontró el usuario de desarrollo.");
  return { actor: toActor(user), user };
});
