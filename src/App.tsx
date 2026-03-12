import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { GLOBAL_STYLES } from "./lib/theme.js";
import AppShell from "./components/layout/AppShell.js";
import LandingPage from "./components/landing/LandingPage.js";
import SandboxLoader from "./components/landing/SandboxLoader.js";

const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "steve@getu.ai",
  user_metadata: { full_name: "Steve" },
} as unknown as User;

export default function App() {
  const [view, setView] = useState<"landing" | "loading" | "app">("landing");

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_STYLES;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const handleGetStarted = useCallback(() => setView("loading"), []);
  const handleLoaded = useCallback(() => setView("app"), []);

  if (view === "landing") {
    return <LandingPage onGetStarted={handleGetStarted} onSignIn={handleGetStarted} />;
  }

  if (view === "loading") {
    return <SandboxLoader onReady={handleLoaded} />;
  }

  return <AppShell user={DEV_USER} />;
}
