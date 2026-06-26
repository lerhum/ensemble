// Thème par école : applique la couleur d'accent de l'événement à la variable
// CSS --accent-brand (utilisée par le logo, les CTA, les liens).
const DEFAULT_ACCENT = "#DA4A40";

export function applyAccent(color: string | null | undefined): void {
  document.documentElement.style.setProperty("--accent-brand", color || DEFAULT_ACCENT);
}

export function resetAccent(): void {
  applyAccent(DEFAULT_ACCENT);
}
