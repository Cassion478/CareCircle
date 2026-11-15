import { CheckCircle2, Flame, CalendarCheck, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdherenceStats } from "@/types";

interface AdherenceWidgetProps {
  stats: AdherenceStats;
}

export function AdherenceWidget({ stats }: AdherenceWidgetProps) {
  const hasData =
    stats.totalScheduledThisWeek > 0 &&
    stats.weeklyPercentage !== null &&
    !isNaN(stats.weeklyPercentage);

  return (
    <Card className="rounded-2xl border border-[#E3EAE5] bg-white shadow-xs">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-[#26352E]">
            <CalendarCheck className="h-5 w-5 text-[#477A62]" />
            Weekly Routine Consistency
          </CardTitle>
          <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-bold text-[#B45309] border border-[#FDE68A]">
            <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            {stats.currentStreakDays} Day Streak
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 space-y-4">
        {/* Weekly Completion Bar */}
        <div className="flex items-center justify-between rounded-xl bg-linear-to-r from-[#EAF2EC] to-emerald-50/60 p-4 border border-[#D9E2DC]">
          <div>
            <div className="text-2xl font-black text-[#26352E]">
              {hasData ? `${stats.weeklyPercentage}%` : "No data available"}
            </div>
            <p className="text-xs font-semibold text-[#477A62]">
              {hasData ? "Routine Completion Rate" : "Awaiting first recorded dose"}
            </p>
          </div>
          <div className="text-right">
            {hasData ? (
              <span
                className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  (stats.weeklyPercentage ?? 0) >= 80
                    ? "bg-emerald-100 text-emerald-800"
                    : (stats.weeklyPercentage ?? 0) > 0
                    ? "bg-amber-100 text-amber-900"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {(stats.weeklyPercentage ?? 0) >= 80
                  ? "On Track"
                  : (stats.weeklyPercentage ?? 0) > 0
                  ? "In Progress"
                  : "Needs Attention"}
              </span>
            ) : (
              <span className="inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                Not enough data
              </span>
            )}
            <p className="text-[11px] text-[#66736B] mt-0.5">Updated in real-time</p>
          </div>
        </div>

        {/* Routine Summary */}
        <div className="rounded-xl border border-[#E3EAE5] bg-[#F8FAF8] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62]">
              {hasData ? <CheckCircle2 className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-base font-bold text-[#26352E]">
                {hasData
                  ? `${stats.takenThisWeek} Doses Confirmed`
                  : "0 Doses Scheduled Today"}
              </div>
              <div className="text-xs text-[#66736B]">
                {hasData
                  ? `Out of ${stats.totalScheduledThisWeek} total doses planned for this week`
                  : "Add your medications to establish your personal weekly routine"}
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Visual Mini Bar */}
        {stats.dailyProgress && stats.dailyProgress.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-bold text-[#66736B]">
              7-Day Routine History
            </span>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {stats.dailyProgress.map((day) => (
                <div key={day.day} className="space-y-1">
                  <div
                    className={`w-full rounded-md flex items-end justify-center pb-1 transition-all ${
                      day.percentage === 100
                        ? "bg-[#477A62] text-white font-bold text-[11px]"
                        : day.percentage > 0
                        ? "bg-[#8F9E94] text-white font-bold text-[11px]"
                        : "bg-[#E3EAE5] text-[#66736B] font-bold text-[11px]"
                    }`}
                    style={{ height: `${Math.max(28, (day.percentage / 100) * 44)}px` }}
                    title={`${day.day}: ${day.percentage}% complete`}
                  >
                    {day.percentage > 0 ? "✓" : "–"}
                  </div>
                  <span className="text-[10px] font-bold text-[#66736B]">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
