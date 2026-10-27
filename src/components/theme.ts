export const THEME_KEY = "theme";

/**
 * Corre en el <head> antes del primer pintado: aplica el tema guardado o, si no
 * hay, el del sistema. Chakra lee la clase `dark`/`light` de <html>; así siempre
 * está puesta y no hay parpadeo. Es la misma lógica que `applyTheme`, en un string.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var c=document.documentElement.classList;c.remove("light","dark");c.add(t);document.documentElement.style.colorScheme=t}catch(e){}})()`;

export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme?: Theme) {
  if (!theme) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}
    theme =
      stored === "light" || stored === "dark"
        ? stored
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}
