import "server-only";
import { cookies } from "next/headers";

export const FLASH_COOKIE = "flash";

export type FlashKind = "success" | "error" | "info";

export interface Flash {
  id: string;
  text: string;
  kind: FlashKind;
}

/** Mensaje para mostrar como toast en la próxima renderización. Solo en Server Actions. */
export async function setFlash(text: string, kind: FlashKind = "success") {
  const flash: Flash = { id: crypto.randomUUID(), text, kind };
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), { path: "/", maxAge: 30 });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Flash;
  } catch {
    return null;
  }
}
