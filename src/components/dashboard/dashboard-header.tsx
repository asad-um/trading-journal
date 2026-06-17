"use client";

interface Gamification {
  xp: number;
  level: number;
  title: string;
  badges: string[];
}

interface DashboardHeaderProps {
  title: string;
  gamification: Gamification | null;
}

export function DashboardHeader({ title, gamification }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {gamification && (
        <div className="flex items-center gap-3 bg-background-secondary border border-border px-3 py-1.5 rounded-lg">
          <span className="text-xs text-text-muted">{gamification.title}</span>
          <span className="text-sm font-bold text-primary">Lvl {gamification.level}</span>
          <div className="w-24 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min((gamification.xp / Math.round(100 * Math.pow(gamification.level, 1.6))) * 100, 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-text-muted">{gamification.xp} XP</span>
          {gamification.badges.length > 0 && <span className="text-xs">🏅 {gamification.badges.length}</span>}
        </div>
      )}
    </div>
  );
}
