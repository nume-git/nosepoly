"use client";

import { IconButton, createIcon } from "@chakra-ui/react";
import { useLayoutEffect } from "react";
import { THEME_KEY, applyTheme, currentTheme } from "./theme";

const ICON_PROPS = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" } as const;

const MoonIcon = createIcon({
  displayName: "MoonIcon",
  d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  defaultProps: ICON_PROPS,
});

const SunIcon = createIcon({
  displayName: "SunIcon",
  d: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  defaultProps: ICON_PROPS,
});

/** Alterna claro/oscuro. El ícono sale del CSS (`_dark`), así no depende del estado de React. */
export function ThemeToggle() {
  // En desarrollo, el remontaje de Strict Mode borra la clase que puso el script del <head>.
  useLayoutEffect(() => {
    const classes = document.documentElement.classList;
    if (!classes.contains("dark") && !classes.contains("light")) applyTheme();
  }, []);

  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  return (
    <IconButton
      id="theme-toggle"
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      variant="ghost"
      rounded="full"
      onClick={toggle}
    >
      {/* Luna en modo claro, sol en modo oscuro. */}
      <MoonIcon aria-hidden _dark={{ display: "none" }} />
      <SunIcon aria-hidden display="none" _dark={{ display: "block" }} />
    </IconButton>
  );
}
