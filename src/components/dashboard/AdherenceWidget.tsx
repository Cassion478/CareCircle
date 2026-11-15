import { CheckCircle2, Flame, CalendarCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdherenceStats } from "@/types";

interface AdherenceWidgetProps {
  stats: AdherenceStats;
}

export function AdherenceWidget({ stats }: AdherenceWidgetProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-teal-600" />
            Weekly Routine Consistency
          </CardTitle>
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            {stats.currentStreakDays} Day Streak!
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 space-y-4">
        {/* Weekly Completion Bar */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 p-4 border border-teal-100 dark:from-teal-950/40 dark:to-emerald-950/40 dark:border-teal-900">
          <div>
            <div className="text-2xl font-black text-teal-900 dark:text-teal-100">
              {stats.weeklyPercentage}%
            </div>
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
              Routine Completion Rate
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              On Track
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Updated in real-time</p>
          </div>
        </div>

        {/* Routine Summary */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {stats.takenThisWeek} Doses Confirmed
              </div>
              <div className="text-xs text-slate-500">
                Out of {stats.totalScheduledThisWeek} total doses planned for this week
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Visual Mini Bar */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            7-Day Routine History
          </span>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {stats.dailyProgress.map((day) => (
              <div key={day.day} className="space-y-1">
                <div
                  className={`w-full rounded-md flex items-end justify-center pb-1 transition-all ${
                    day.allTaken
                      ? "bg-teal-500 text-white font-bold text-[11px]"
                      : "bg-teal-300 text-slate-900 font-bold text-[11px]"
                  }`}
                  style={{ height: `${Math.max(28, (day.percentage / 100) * 44)}px` }}
                  title={`${day.day}: ${day.percentage}% complete`}
                >
                  ✓
                </div>
                <span className="text-[10px] font-bold text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
