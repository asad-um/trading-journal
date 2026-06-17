"use client";

import { Button } from "@/components/ui/button";

interface MentalEdgeCheckInProps {
  hasCheckedIn: boolean;
  avgMood: number;
  avgDiscipline: number;
  moodScore: number;
  disciplineScore: number;
  onMoodChange: (score: number) => void;
  onDisciplineChange: (score: number) => void;
  onCheckIn: () => void;
}

export function MentalEdgeCheckIn({
  hasCheckedIn,
  avgMood,
  avgDiscipline,
  moodScore,
  disciplineScore,
  onMoodChange,
  onDisciplineChange,
  onCheckIn,
}: MentalEdgeCheckInProps) {
  return (
    <div className={`bg-gradient-to-r from-accent/5 to-transparent border border-accent/20 rounded-xl overflow-hidden transition-all duration-500 ease-in-out ${hasCheckedIn ? 'max-h-0 opacity-0 p-0 border-0' : 'max-h-[500px] opacity-100 p-4'} flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4`}>
      <div>
        <h3 className="font-bold text-foreground">Mental Edge</h3>
        <p className="text-xs text-text-muted">Track your mood and discipline.</p>
        {avgMood > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs font-medium">
            <span className="text-text-secondary">30-Day Avg:</span>
            <span className={avgMood >= 3.5 ? "text-win" : avgMood <= 2 ? "text-loss" : "text-breakeven"}>Mood {avgMood.toFixed(1)}/5</span>
            <span className={avgDiscipline >= 3.5 ? "text-win" : avgDiscipline <= 2 ? "text-loss" : "text-breakeven"}>Discipline {avgDiscipline.toFixed(1)}/5</span>
          </div>
        )}
      </div>

      {!hasCheckedIn ? (
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto bg-background/50 p-3 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-text-secondary w-16">Mood</span>
            <input type="range" min="1" max="5" value={moodScore} onChange={(e) => onMoodChange(parseInt(e.target.value))} className="w-full sm:w-24 accent-primary" />
            <span className="text-xs font-mono w-6">{moodScore}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-text-secondary w-16">Discipline</span>
            <input type="range" min="1" max="5" value={disciplineScore} onChange={(e) => onDisciplineChange(parseInt(e.target.value))} className="w-full sm:w-24 accent-primary" />
            <span className="text-xs font-mono w-6">{disciplineScore}</span>
          </div>
          <Button size="sm" onClick={onCheckIn} className="w-full sm:w-auto whitespace-nowrap bg-accent hover:bg-accent/90 text-background">Check In</Button>
        </div>
      ) : (
        <div className="px-4 py-2 bg-win/10 text-win border border-win/20 rounded-lg text-sm font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          Checked in for today
        </div>
      )}
    </div>
  );
}
