import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // Unified with the public site: Hanken Grotesk body, Spectral display
        sans: ["Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Spectral", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          primary: "#FF6B35",
          anchor: "#012A4A",
          highlight: "#A9D6E5",
          surface: "#F8F9FA",
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
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "tangerine-trace": {
          "0%": { backgroundPosition: "200% 0" },
          "50%": { backgroundPosition: "0% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "spark-flicker": {
          "0%, 100%": { opacity: "0.8", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.5)" },
        },
        "kinetic-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "success-reveal": {
          "0%": { boxShadow: "0 0 0px #FF6B35" },
          "100%": { boxShadow: "0 0 30px rgba(255, 107, 53, 0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "tangerine-trace": "tangerine-trace 2.5s ease-in-out infinite",
        "spark-flicker": "spark-flicker 0.6s ease-in-out infinite",
        "kinetic-shimmer": "kinetic-shimmer 1.5s ease-in-out infinite",
        "success-reveal": "success-reveal 0.8s forwards",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Safe-area + on-screen-keyboard utilities. Safe-area insets only
    // resolve once index.html's viewport meta carries viewport-fit=cover;
    // --kb-inset is written live by src/hooks/use-keyboard-inset.ts.
    plugin(({ addUtilities }) => {
      addUtilities({
        ".pt-safe": { paddingTop: "env(safe-area-inset-top, 0px)" },
        ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom, 0px)" },
        ".pl-safe": { paddingLeft: "env(safe-area-inset-left, 0px)" },
        ".pr-safe": { paddingRight: "env(safe-area-inset-right, 0px)" },
        ".pb-kb": { paddingBottom: "var(--kb-inset, 0px)" },
        ".bottom-kb": { bottom: "var(--kb-inset, 0px)" },
      });
    }),
  ],
} satisfies Config;
