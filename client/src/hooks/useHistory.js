// ═══════════════════════════════════════════════════════════════
// HISTORY MANAGER — saves all debate sessions to localStorage
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";

const STORAGE_KEY  = "debate-coach-history";
const MAX_SESSIONS = 50; // keep last 50 sessions

// ── Helpers ──────────────────────────────────────────────────

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(sessions) {
  try {
    // Keep only last MAX_SESSIONS
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Could not save history:", e);
  }
}

function generateId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTitle(mode, messages) {
  if (!messages || messages.length === 0) return "Empty session";
  const first = messages[0]?.content || "";
  const truncated = first.slice(0, 60);
  return truncated.length < first.length ? truncated + "..." : truncated;
}

function getModeLabel(mode) {
  const labels = {
    learn:    "📚 Learn",
    counter:  "🛡️ Counter",
    evaluate: "📊 Evaluate",
    battle:   "⚔️ Battle",
  };
  return labels[mode] || mode;
}

// ── Main Hook ────────────────────────────────────────────────

export default function useHistory() {
  const [sessions, setSessions] = useState(loadHistory);

  // ── Save a chat session (Learn/Counter/Evaluate) ──
  const saveChatSession = useCallback((mode, messages) => {
    if (!messages || messages.length === 0) return;

    const session = {
      id:        generateId(),
      type:      "chat",
      mode:      mode,
      modeLabel: getModeLabel(mode),
      title:     getTitle(mode, messages),
      messages:  messages,
      timestamp: new Date().toISOString(),
      date:      new Date().toLocaleDateString("en-IN", {
        day:   "numeric",
        month: "short",
        year:  "numeric",
      }),
      time: new Date().toLocaleTimeString("en-IN", {
        hour:   "2-digit",
        minute: "2-digit",
      }),
    };

    setSessions((prev) => {
      const updated = [...prev, session];
      saveHistory(updated);
      return updated;
    });

    return session.id;
  }, []);

  // ── Save a battle session ──
  const saveBattleSession = useCallback((battleData, feedback) => {
    if (!battleData) return;

    const session = {
      id:           generateId(),
      type:         "battle",
      mode:         "battle",
      modeLabel:    "⚔️ Battle",
      title:        battleData.topic || "Debate Battle",
      topic:        battleData.topic,
      userSide:     battleData.userSide,
      aiSide:       battleData.aiSide,
      totalRounds:  battleData.totalRounds,
      roundsPlayed: Math.floor((battleData.messages?.length || 0) / 2),
      messages:     battleData.messages || [],
      feedback:     feedback || null,
      timestamp:    new Date().toISOString(),
      date:         new Date().toLocaleDateString("en-IN", {
        day:   "numeric",
        month: "short",
        year:  "numeric",
      }),
      time: new Date().toLocaleTimeString("en-IN", {
        hour:   "2-digit",
        minute: "2-digit",
      }),
    };

    setSessions((prev) => {
      const updated = [...prev, session];
      saveHistory(updated);
      return updated;
    });

    return session.id;
  }, []);

  // ── Delete one session ──
  const deleteSession = useCallback((id) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  // ── Clear all history ──
  const clearHistory = useCallback(() => {
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── Get sessions grouped by date ──
  const groupedSessions = sessions.reduceRight((groups, session) => {
    const date = session.date || "Unknown";
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
    return groups;
  }, {});

  return {
    sessions,
    groupedSessions,
    saveChatSession,
    saveBattleSession,
    deleteSession,
    clearHistory,
    totalSessions: sessions.length,
  };
}