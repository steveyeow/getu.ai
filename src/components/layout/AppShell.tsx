import { useState, useEffect, useCallback } from "react";
import Sidebar, { type SidebarTab } from "./Sidebar.js";
import AriaChat from "../chat/AriaChat.js";
import MissionCenter from "../tasks/MissionCenter.js";
import SkillsPage from "../skills/SkillsPage.js";
import AgentsPage from "../agents/AgentsPage.js";
import { useTasks } from "../../hooks/useTasks.js";
import { getConversations, getAgentConversations } from "../../lib/api.js";
import type { User } from "@supabase/supabase-js";
import type { Conversation } from "../../../shared/types.js";
import type { AgentInfo } from "../agents/AgentsPage.js";

interface Props {
  user: User;
}

export default function AppShell({ user }: Props) {
  const [tab, setTab]                       = useState<SidebarTab>("chat");
  const [activeConvId, setActiveConvId]     = useState<string | undefined>();
  const [chatKey, setChatKey]               = useState(0);
  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [initialPrompt, setInitialPrompt]   = useState<string | undefined>();
  const [activeChatAgent, setActiveChatAgent]         = useState<string | null>(null);
  const [activeChatAgentInfo, setActiveChatAgentInfo] = useState<Pick<AgentInfo, "name" | "color" | "tagline" | "starter"> | null>(null);
  const { tasks } = useTasks(user.id);

  const loadConversations = useCallback(async () => {
    try { setConversations(await getConversations()); } catch { /* non-critical */ }
  }, []);

  const loadAgentConversations = useCallback(async (agentName: string) => {
    try { setConversations(await getAgentConversations(agentName)); } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (tab !== "chat") return;
    if (activeChatAgent) loadAgentConversations(activeChatAgent);
    else loadConversations();
  }, [tab, activeChatAgent, loadConversations, loadAgentConversations]);

  // Called by AriaChat when a new conversation is auto-created mid-session.
  // Only updates sidebar state — does NOT change chatKey, so AriaChat stays mounted.
  function handleNewConversation(id: string) {
    setActiveConvId(id);
    if (activeChatAgent) loadAgentConversations(activeChatAgent);
    else loadConversations();
  }

  function handleNewChat() {
    setActiveConvId(undefined);
    setInitialPrompt(undefined);
    setActiveChatAgent(null);
    setActiveChatAgentInfo(null);
    setChatKey(k => k + 1); // force remount → fresh empty state
    setTab("chat");
  }

  function handleSkillChat(prompt?: string) {
    setActiveConvId(undefined);
    setInitialPrompt(prompt);
    setActiveChatAgent(null);
    setActiveChatAgentInfo(null);
    setChatKey(k => k + 1); // force remount so initialPrompt takes effect
    setTab("chat");
  }

  function handleChatWithAgent(agent: AgentInfo) {
    setActiveChatAgent(agent.name);
    setActiveChatAgentInfo({ name: agent.name, color: agent.color, tagline: agent.tagline, starter: agent.starter });
    setActiveConvId(undefined);
    setInitialPrompt(agent.starter || undefined); // pre-fill composer with agent's starter prompt
    setChatKey(k => k + 1); // force remount for agent chat
    setTab("chat");
  }

  function handleSelectConversation(id: string) {
    setActiveConvId(id);
    // Do NOT remount (no chatKey++) — same chat view just loads the selected conversation.
    // This keeps any in-flight stream for the previous conv running; when it completes the
    // server saves the reply, so when user switches back they see the full response.
    setTab("chat");
  }

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <Sidebar
        activeTab={tab}
        onTabChange={setTab}
        tasks={tasks}
        userEmail={user.email ?? ""}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "chat" && (
          <AriaChat
            key={chatKey}
            onNavigate={setTab}
            conversationId={activeConvId}
            onNewConversation={handleNewConversation}
            initialPrompt={initialPrompt}
            onInitialPromptConsumed={() => setInitialPrompt(undefined)}
            userName={user.email ?? ""}
            agentName={activeChatAgent ?? undefined}
            agentInfo={activeChatAgentInfo ?? undefined}
          />
        )}
        {tab === "missions" && <MissionCenter userId={user.id} onChat={() => setTab("chat")} />}
        {tab === "skills"   && <SkillsPage onChat={handleSkillChat} />}
        {tab === "agents"   && <AgentsPage onNavigate={setTab} onChatWithAgent={handleChatWithAgent} />}
      </main>
    </div>
  );
}
