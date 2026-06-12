import { Trade, UserGamification, DailyCheckin } from "@/types";
import { supabase } from "@/lib/supabase";

export const LEVEL_TITLES = [
  "Novice",
  "Apprentice",
  "Trader",
  "Senior Trader",
  "Elite",
  "Master",
  "Legend"
];

export function xpForLevel(level: number): number {
  // Exponential curve: level 1 = 0 XP needed, level 2 = 200, level 3 = 450, etc.
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < LEVEL_TITLES.length) {
    level++;
  }
  return level;
}

export function titleFromLevel(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level - 1, 0), LEVEL_TITLES.length - 1)];
}

export type BadgeId =
  | "10-trade-win-streak"
  | "discipline-master"
  | "risk-manager"
  | "early-bird"
  | "reviewer"
  | "psychology-pro"
  | "diversified";

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: "10-trade-win-streak", name: "10 Trade Win Streak", description: "10 consecutive wins", icon: "🔥" },
  { id: "discipline-master", name: "Discipline Master", description: "No rule breaks for 30 days", icon: "🛡️" },
  { id: "risk-manager", name: "Risk Manager", description: "No single loss > 2% for 60 days", icon: "⚖️" },
  { id: "early-bird", name: "Early Bird", description: "Check in before 7 AM for 14 days", icon: "🌅" },
  { id: "reviewer", name: "Reviewer", description: "Review 5 past trades weekly for 4 weeks", icon: "🔍" },
  { id: "psychology-pro", name: "Psychology Pro", description: "Mood score avg > 4.0 for 30 days", icon: "🧠" },
  { id: "diversified", name: "Diversified", description: "Traded 5+ different assets in a month", icon: "🌍" },
];

export const XP_TRADE_LOGGED = 10;
export const XP_DAILY_CHECKIN = 5;
export const XP_REVIEW_COMPLETED = 20;
export const XP_BADGE_EARNED = 100;

export type QuestId =
  | "morning-routine"
  | "trade-logger"
  | "mistake-review"
  | "check-in-hero"
  | "edge-hunter";

export interface DailyQuest {
  id: QuestId;
  name: string;
  description: string;
  xp: number;
}

export const DAILY_QUESTS: DailyQuest[] = [
  { id: "morning-routine", name: "Morning Routine", description: "Complete pre-market checklist", xp: 10 },
  { id: "trade-logger", name: "Trade Logger", description: "Log all today's trades before midnight", xp: 10 },
  { id: "mistake-review", name: "Mistake Review", description: "Review yesterday's losing trade", xp: 15 },
  { id: "check-in-hero", name: "Check-In Hero", description: "Daily mental check-in", xp: 5 },
  { id: "edge-hunter", name: "Edge Hunter", description: "Identify one new pattern in your data", xp: 15 },
];

export interface GamificationUpdate {
  xp: number;
  newBadges: BadgeId[];
  questsCompleted: Record<string, string>;
  levelUp?: { old: number; new: number };
}

export function computeNewBadges(
  existing: BadgeId[],
  trades: Trade[],
  checkins: DailyCheckin[]
): BadgeId[] {
  const earned = new Set(existing);

  // 10-trade win streak
  const closed = [...trades]
    .filter(t => ["Closed - Win", "Closed - Loss", "Breakeven", "Partial"].includes(t.status))
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
  let streak = 0;
  for (const t of closed) {
    if (t.net_pnl > 0) streak++;
    else break;
  }
  if (streak >= 10) earned.add("10-trade-win-streak");

  // Risk manager: no loss > 2% in last 60 days
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const recentLosses = closed.filter(t => t.trade_date >= sixtyDaysAgo && t.net_pnl < 0);
  const baseBalance = Math.max(
    ...trades.map(t => (t as any).portfolio_starting_balance || 1),
    1
  );
  const largeLoss = recentLosses.some(t => Math.abs(t.net_pnl) > baseBalance * 0.02);
  if (recentLosses.length > 0 && !largeLoss) earned.add("risk-manager");

  // Psychology pro: mood avg > 4.0 over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const recentMoods = checkins.filter(c => c.checkin_date >= thirtyDaysAgo).map(c => c.mood_score);
  if (recentMoods.length >= 7) {
    const avgMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    if (avgMood > 4.0) earned.add("psychology-pro");
  }

  // Diversified: 5+ different assets in a month
  const monthTrades = closed.filter(t => t.trade_date >= thirtyDaysAgo);
  const uniqueAssets = new Set(monthTrades.map(t => t.symbol));
  if (uniqueAssets.size >= 5) earned.add("diversified");

  // Discipline master: criteria compliance 100% for 30 days
  const recentWithCriteria = monthTrades.filter(
    t => Array.isArray(t.criteria_checked) && t.criteria_checked.length > 0
  );
  if (
    recentWithCriteria.length >= 5 &&
    recentWithCriteria.every(t => t.criteria_checked.every(c => c.checked))
  ) {
    earned.add("discipline-master");
  }

  // Early bird: check in before 7 AM for 14 days
  const earlyCheckins = checkins.filter(c => {
    const date = new Date(c.checkin_date);
    return date.getUTCHours() < 7;
  });
  if (earlyCheckins.length >= 14) earned.add("early-bird");

  // Reviewer: post_trade_lesson filled on 5 trades in a week, 4 weeks in a row
  // Simplified: unlock if user has reviewed 20+ trades total
  const reviewed = trades.filter(t => t.post_trade_lesson && t.post_trade_lesson.trim().length > 20);
  if (reviewed.length >= 20) earned.add("reviewer");

  return Array.from(earned).filter((id): id is BadgeId => BADGES.some(b => b.id === id));
}

export async function fetchUserGamification(userId: string): Promise<UserGamification | null> {
  const { data, error } = await supabase
    .from("user_gamification")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchUserGamification error:", error);
    return null;
  }
  return data as UserGamification | null;
}

export async function ensureUserGamification(userId: string): Promise<UserGamification | null> {
  const existing = await fetchUserGamification(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("user_gamification")
    .insert({ user_id: userId, xp: 0, level: 1, badges: [], quests_completed: {} })
    .select()
    .single();

  if (error) {
    console.error("ensureUserGamification error:", error);
    return null;
  }
  return data as UserGamification;
}

export async function awardGamificationUpdate(
  userId: string,
  xpDelta: number,
  newBadges: BadgeId[],
  completedQuestIds: QuestId[]
): Promise<GamificationUpdate | null> {
  const gamification = await ensureUserGamification(userId);
  if (!gamification) return null;

  const today = new Date().toISOString().split("T")[0];
  const mergedBadges = Array.from(new Set([...gamification.badges, ...newBadges]));
  const questsCompleted = { ...gamification.quests_completed };

  for (const qid of completedQuestIds) {
    questsCompleted[qid] = today;
  }

  const oldLevel = gamification.level;
  const newXp = gamification.xp + xpDelta;
  const newLevel = levelFromXp(newXp);

  const { error } = await supabase
    .from("user_gamification")
    .update({
      xp: newXp,
      level: newLevel,
      badges: mergedBadges,
      quests_completed: questsCompleted,
      last_quest_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gamification.id);

  if (error) {
    console.error("awardGamificationUpdate error:", error);
    return null;
  }

  return {
    xp: newXp,
    newBadges: mergedBadges.filter(b => !gamification.badges.includes(b)),
    questsCompleted,
    levelUp: newLevel > oldLevel ? { old: oldLevel, new: newLevel } : undefined,
  };
}

export async function onTradeLogged(userId: string, trade: Trade): Promise<GamificationUpdate | null> {
  // Load all trades + checkins for badge computation
  const [{ data: tradesRes }, { data: checkinsRes }] = await Promise.all([
    supabase.from("trades").select("*").eq("user_id", userId),
    supabase.from("daily_checkins").select("*").eq("user_id", userId),
  ]);

  const trades = (tradesRes || []) as Trade[];
  const checkins = (checkinsRes || []) as DailyCheckin[];

  const gamification = await ensureUserGamification(userId);
  const existingBadges = ((gamification?.badges || []) as string[]).filter((id): id is BadgeId => BADGES.some(b => b.id === id));
  const newBadges = computeNewBadges(existingBadges, trades, checkins);

  const today = new Date().toISOString().split("T")[0];
  const todayTrades = trades.filter(t => t.trade_date === today);

  const completedQuests: QuestId[] = [];
  if (todayTrades.length > 0) completedQuests.push("trade-logger");
  if (trade.post_trade_lesson && trade.post_trade_lesson.trim().length > 20) {
    completedQuests.push("mistake-review");
  }

  const badgeXp = newBadges.filter(b => !existingBadges.includes(b)).length * XP_BADGE_EARNED;
  const totalXp = XP_TRADE_LOGGED + badgeXp;

  return awardGamificationUpdate(userId, totalXp, newBadges, completedQuests);
}

export async function onDailyCheckin(userId: string): Promise<GamificationUpdate | null> {
  return awardGamificationUpdate(userId, XP_DAILY_CHECKIN, [], ["check-in-hero"]);
}
