"use client";

import { Alert, Box } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import type { Flash } from "@/server/flash";

export function Toaster({ flash }: { flash: Flash | null }) {
  const [shown, setShown] = useState<Flash | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // El refresco en vivo trae flash = null enseguida (la cookie se borra al
  // mostrarlo), así que el toast se guarda en estado hasta que vence.
  if (flash && flash.id !== lastId) {
    setLastId(flash.id);
    setShown(flash);
  }

  useEffect(() => {
    if (!shown) return;
    document.cookie = "flash=; Max-Age=0; path=/";
    const id = window.setTimeout(() => setShown(null), 4500);
    return () => window.clearTimeout(id);
  }, [shown]);

  if (!shown) return null;

  return (
    <Box id="toast" position="fixed" bottom="4" insetEnd="4" zIndex="toast" aria-live="polite">
      <Alert.Root id="toast-message" role="status" status={shown.kind} variant="solid" shadow="lg">
        <Alert.Indicator />
        <Alert.Title>{shown.text}</Alert.Title>
      </Alert.Root>
    </Box>
  );
}
