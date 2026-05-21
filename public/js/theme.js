const THEME_KEY = "notes_app_theme";

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

export function applyTheme(theme) {
  const resolved =
    theme === "dark" || theme === "light"
      ? theme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(THEME_KEY, resolved);
  return resolved;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  return applyTheme(current === "dark" ? "light" : "dark");
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
