// Thème par organisation : applique la couleur d'accent de l'événement à la variable
// CSS --accent-brand (utilisée par le logo, les CTA, les liens).
export const DEFAULT_ACCENT = "#DA4A40";

/** Applies a custom accent color to the CSS --accent-brand variable. Falls back to the default red if null/undefined. */
export function applyAccent(color: string | null | undefined): void {
  document.documentElement.style.setProperty("--accent-brand", color || DEFAULT_ACCENT);
}

/** Resets the accent color to the app's default red (#DA4A40). */
export function resetAccent(): void {
  applyAccent(DEFAULT_ACCENT);
}
