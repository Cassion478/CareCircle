"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Clock, Calendar, Pill, HeartHandshake, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DbAlert } from "@/types";
import { formatAlertTime } from "@/lib/alerts";

interface AlertsWidgetProps {
  alerts: DbAlert[];
  onAcknowledge?: (id: string) => void;
}

export function AlertsWidget({ alerts, onAcknowledge }: AlertsWidgetProps) {
  const activeAlerts = alerts.filter((a) => a.status === "pending" || a.status === "snoozed");

  if (activeAlerts.length === 0) {
    return null;
  }

  // Display top 2 active alerts to avoid overwhelming the senior dashboard
  const displayAlerts = activeAlerts.slice(0, 2);

  return (
    <div className="rounded-3xl border border-teal-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Active Reminders</span>
              <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white">
                {activeAlerts.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Timely reminders requiring your attention today
            </p>
          </div>
        </div>

        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 transition-colors"
        >
          <span>Alerts Centre</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayAlerts.map((alert) => {
          const isAssist = alert.type === "assistance";
          const isApt = alert.type === "appointment";

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                isAssist
                  ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
                  : isApt
                  ? "border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20"
                  : "border-teal-200 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isAssist
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : isApt
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                  }`}
                >
                  {isAssist ? (
                    <HeartHandshake className="h-4 w-4" />
                  ) : isApt ? (
                    <Calendar className="h-4 w-4" />
                  ) : (
                    <Pill className="h-4 w-4" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {alert.title}
                    </span>
                    <Badge
                      variant={alert.status === "snoozed" ? "warning" : "danger"}
                      className="text-[10px] px-1.5 py-0 capitalize"
                    >
                      {alert.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {alert.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatAlertTime(alert.scheduled_for)}
                </span>

                {onAcknowledge && (
                  <Button
                    variant="outline"
                    onClick={() => onAcknowledge(alert.id)}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1 border-teal-300 text-teal-800 hover:bg-teal-100 dark:border-teal-700 dark:text-teal-300 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Acknowledge</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
