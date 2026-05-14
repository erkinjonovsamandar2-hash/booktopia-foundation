import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["Soria", "Georgia", "serif"],
        // font-serif → Neuton (used on nav & footer links)
        serif:   ["Neuton", "serif"],
        sans:    ["Inter", "sans-serif"],
        got:     ['"GameOfThrones"', "serif"],
        // font-lora → Lora (readable literary serif for quiz body text)
        lora:    ["Lora", "Georgia", "serif"],
      },
      colors: {
        // ── FIXED: <alpha-value> injection enables bg-x/50, text-x/80, etc. ──
        border:     "hsl(var(--border) / <alpha-value>)",
        input:      "hsl(var(--input) / <alpha-value>)",
        ring:       "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT:    "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },

        // Legacy tokens
        gold: {
          DEFAULT: "hsl(var(--gold) / <alpha-value>)",
          dim:     "hsl(var(--gold-dim) / <alpha-value>)",
        },
        silver:   "hsl(var(--silver) / <alpha-value>)",
        obsidian: "hsl(var(--obsidian) / <alpha-value>)",
        charcoal: "hsl(var(--charcoal) / <alpha-value>)",

        // Explicit Booktopia palette for direct utility (text-booktopia-navy)
        booktopia: {
          cream:    "#F4F2C9",
          navy:     "#265999",
          blue:     "#4488BF",
          gold:     "#D5AD36",
          darkNavy: "#0A192F",
        },

        sidebar: {
          DEFAULT:            "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground:         "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary:            "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground":"hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent:             "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":"hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border:             "hsl(var(--sidebar-border) / <alpha-value>)",
          ring:               "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "shimmer": {
          "100%": { transform: "translateX(150%)" }
        },
        "breathe": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(255,255,255,0.1), 0 0 5px rgba(255,255,255,0.1)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 35px rgba(255,255,255,0.5), 0 0 15px rgba(255,255,255,0.4)", transform: "scale(1.02)" }
        },
        "gradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 2.5s infinite",
        "breathe": "breathe 6s ease-in-out infinite",
        "gradient": "gradient 8s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;