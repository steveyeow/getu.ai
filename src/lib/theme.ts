// Design tokens — warm beige palette matching the product prototype
export const T = {
  // Backgrounds
  bg:          "#f8f7f4",
  surface:     "#ffffff",
  surfaceHov:  "#f2f0ec",
  sidebarHov:  "#f0eee9",
  sidebarAct:  "#e5e2db",

  // Borders
  border:      "#e9e6df",
  borderMid:   "#d4d1c9",

  // Text
  text:        "#1a1714",
  textMid:     "#6b6760",
  textDim:     "#a8a49e",

  // Accent — green
  green:       "#16a34a",
  greenLight:  "#dcfce7",
  greenMid:    "#86efac",

  // Fonts
  sans:         "'Inter', sans-serif",
  mono:         "'DM Mono', monospace",
  serif:        "'Source Serif 4', ui-serif, Georgia, serif",
  serifDisplay: "'Newsreader', 'Source Serif 4', ui-serif, Georgia, serif",
} as const;

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&family=Newsreader:opsz,wght@6..72,300;6..72,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: ${T.sans}; background: ${T.bg}; color: ${T.text}; }
  button { font-family: inherit; cursor: pointer; }
  button:focus, input:focus, textarea:focus { outline: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes blink   { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
`;
