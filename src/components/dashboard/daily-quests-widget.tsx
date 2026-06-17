"use client";

import { DAILY_QUESTS, DailyQuest, QuestId } from "@/lib/gamification";
import { CheckCircle2, Circle, Zap } from "lucide-react";
import Link from "next/link";

interface DailyQuestsWidgetProps {
  completedQuestIds: string[];
  onCompleteQuest?: (questId: QuestId) => void;
}

const QUEST_LINKS: Partial<Record<QuestId, string>> = {
  "trade-logger": "/trades/new",
  "mistake-review": "/trades",
  "check-in-hero": "/dashboard",
  "morning-routine": "/dashboard",
  "edge-hunter": "/statistics",
};

const QUEST_ACTION_LABELS: Partial<Record<QuestId, string>> = {
  "trade-logger": "Log Trade",
  "mistake-review": "Review Trades",
  "check-in-hero": "Check In",
  "morning-routine": "Go to Dashboard",
  "edge-hunter": "View Statistics",
};

export function DailyQuestsWidget({ completedQuestIds, onCompleteQuest }: DailyQuestsWidgetProps) {
  const today = new Date().toISOString().split("T")[0];
  const completedToday = completedQuestIds.filter(id => id.includes(today) || completedQuestIds.includes(id));

  const totalXp = DAILY_QUESTS.reduce((a, q) => a + q.xp, 0);
  const earnedXp = DAILY_QUESTS
    .filter(q => completedQuestIds.includes(q.id))
    .reduce((a, q) => a + q.xp, 0);

  const completedCount = DAILY_QUESTS.filter(q => completedQuestIds.includes(q.id)).length;
  const progressPct = (completedCount / DAILY_QUESTS.length) * 100;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
        <span>{completedCount}/{DAILY_QUESTS.length} completed</span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          <Zap className="h-3 w-3" />
          {earnedXp}/{totalXp} XP
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Quest list */}
      <div className="space-y-2 mt-3">
        {DAILY_QUESTS.map((quest: DailyQuest) => {
          const done = completedQuestIds.includes(quest.id);
          const link = QUEST_LINKS[quest.id];
          const actionLabel = QUEST_ACTION_LABELS[quest.id];

          return (
            <div
              key={quest.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                done
                  ? "bg-win/5 border-win/20 opacity-70"
                  : "bg-background-secondary border-border hover:border-primary/30"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-win shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-text-muted shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${done ? "line-through text-text-muted" : ""}`}>
                  {quest.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{quest.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${done ? "bg-win/10 text-win" : "bg-primary/10 text-primary"}`}>
                  +{quest.xp} XP
                </span>
                {!done && link && (
                  <Link
                    href={link}
                    className="text-xs text-primary hover:underline font-medium whitespace-nowrap"
                  >
                    {actionLabel} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedCount === DAILY_QUESTS.length && (
        <div className="mt-3 p-3 bg-win/10 border border-win/30 rounded-lg text-center">
          <p className="text-sm font-bold text-win">🎉 All quests complete for today!</p>
          <p className="text-xs text-text-muted mt-0.5">Come back tomorrow for new quests.</p>
        </div>
      )}
    </div>
  );
}
