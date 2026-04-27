import { createContext, useContext } from "react";

// Apple-inspired dark palette: not pure black, but warm dark grays
// with subtle depth — the same philosophy as macOS dark mode.

const LIGHT_TOKENS = {
  bg:          "#f8f7f4",
  surface:     "#ffffff",
  surfaceHov:  "#f2f0ec",
  sidebarHov:  "#f0eee9",
  sidebarAct:  "#e5e2db",
  border:      "#e9e6df",
  borderMid:   "#d4d1c9",
  text:        "#1a1714",
  textMid:     "#6b6760",
  textDim:     "#a8a49e",
  green:       "#16a34a",
  greenLight:  "#dcfce7",
  greenMid:    "#86efac",
  shadow:      "rgba(0,0,0,0.07)",
  scrollThumb: "rgba(0,0,0,0.12)",
  scrollHover: "rgba(0,0,0,0.22)",
  codeBg:      "rgba(0,0,0,0.07)",
} as const;

const DARK_TOKENS = {
  bg:          "#1c1c1e",
  surface:     "#2c2c2e",
  surfaceHov:  "#3a3a3c",
  sidebarHov:  "#3a3a3c",
  sidebarAct:  "#48484a",
  border:      "#38383a",
  borderMid:   "#48484a",
  text:        "#f5f5f7",
  textMid:     "#b8b8bd",
  textDim:     "#8e8e93",
  green:       "#30d158",
  greenLight:  "rgba(48,209,88,0.14)",
  greenMid:    "rgba(48,209,88,0.30)",
  shadow:      "rgba(0,0,0,0.35)",
  scrollThumb: "rgba(255,255,255,0.15)",
  scrollHover: "rgba(255,255,255,0.25)",
  codeBg:      "rgba(255,255,255,0.10)",
} as const;

// T keeps the same API used everywhere — CSS variable references
export const T = {
  bg:          "var(--t-bg)",
  surface:     "var(--t-surface)",
  surfaceHov:  "var(--t-surfaceHov)",
  sidebarHov:  "var(--t-sidebarHov)",
  sidebarAct:  "var(--t-sidebarAct)",
  border:      "var(--t-border)",
  borderMid:   "var(--t-borderMid)",
  text:        "var(--t-text)",
  textMid:     "var(--t-textMid)",
  textDim:     "var(--t-textDim)",
  green:       "var(--t-green)",
  greenLight:  "var(--t-greenLight)",
  greenMid:    "var(--t-greenMid)",

  shadow:      "var(--t-shadow)",
  codeBg:      "var(--t-codeBg)",

  sans:         "'Inter', sans-serif",
  mono:         "'DM Mono', monospace",
  serif:        "'Source Serif 4', ui-serif, Georgia, serif",
  serifDisplay: "'Newsreader', 'Source Serif 4', ui-serif, Georgia, serif",
} as const;

function tokenVars(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `--t-${k}: ${v};`)
    .join("\n    ");
}

export type ThemeMode = "light" | "dark";

export function getGlobalStyles(mode: ThemeMode): string {
  const tokens = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
  return `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&family=Newsreader:opsz,wght@6..72,300;6..72,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300&display=swap');
  :root {
    ${tokenVars(tokens)}
    color-scheme: ${mode};
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: ${T.sans}; background: var(--t-bg); color: var(--t-text); transition: background .3s ease, color .3s ease; }
  button { font-family: inherit; cursor: pointer; }
  button:focus, input:focus, textarea:focus { outline: none; }
  ::placeholder { color: var(--t-textDim); opacity: 1; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${tokens.scrollThumb}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${tokens.scrollHover}; }
  ${mode === "dark" ? `
  h1, h2, h3 { -webkit-font-smoothing: antialiased; }
  ` : ""}
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes blink   { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes slideUpBar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`;
}

// Keep the old export so existing `import { GLOBAL_STYLES }` doesn't break at compile time.
// App.tsx will switch to getGlobalStyles() for runtime usage.
export const GLOBAL_STYLES = getGlobalStyles("light");

// ── Theme Context ────────────────────────────────────────────────────────────

export interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  toggle: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
