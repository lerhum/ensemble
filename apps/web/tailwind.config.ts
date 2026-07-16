import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Tokens EXACTS du handoff (Direction B). Clean/Apple : blanc, hairlines, air,
// accent corail #DA4A40. Pas de dégradés.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1240px" } },
    extend: {
      colors: {
        // — Jetons sémantiques shadcn (mappés sur la palette Ensemble) —
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },

        // — Palette brute Ensemble (valeurs hex du README) —
        ink: "#0F1F30",
        ink2: "#42505E",
        navy: "#1C3A5E",
        coral: { DEFAULT: "#DA4A40", light: "#F4897E" },
        // Accent thématisé par organisation (var --accent-brand, défaut corail)
        brand: "var(--accent-brand)",
        success: { DEFAULT: "#2F7E59", bg: "#EAF4EF" },
        warn: { DEFAULT: "#B5781E", bg: "#FBF1DF", bar: "#E8A13A" },
        danger: { DEFAULT: "#C7443A", bg: "#FBE9E7" },
        label: "#6B7A8D",
        label2: "#8A97A6",
        chip: "#EEF1F4",
        hair: "#E1E4E8",
        surface: "#FBFBFC",
        surface2: "#FCFCFD",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "20px",
        frame: "24px",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontWeight: {
        "400": "400",
        "500": "500",
        "600": "600",
        "700": "700",
        "800": "800",
      },
      boxShadow: {
        card: "0 28px 60px rgba(28,58,94,.12)",
        soft: "0 8px 24px rgba(28,58,94,.08)",
      },
      letterSpacing: {
        tightest: "-.04em",
        tighter2: "-.02em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
