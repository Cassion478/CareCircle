import { Users, Phone, MessageSquare, UserPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Caregiver } from "@/types";

interface CareCircleWidgetProps {
  caregivers: Caregiver[];
}

export function CareCircleWidget({ caregivers }: CareCircleWidgetProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Family & Care Circle
          </CardTitle>
          <Badge variant="secondary">{caregivers.length} Connected</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 space-y-3">
        {caregivers.map((cg) => (
          <div
            key={cg.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                {cg.avatarInitials}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {cg.name}
                  </span>
                  {cg.role === "Primary Caregiver" && (
                    <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[10px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {cg.relationship} • {cg.role}
                </p>
                {cg.lastCheckIn && (
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                    Checked in {cg.lastCheckIn}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${cg.phone}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors dark:bg-slate-800 dark:text-slate-300"
                title={`Call ${cg.name}`}
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`sms:${cg.phone}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors dark:bg-slate-800 dark:text-slate-300"
                title={`Message ${cg.name}`}
              >
                <MessageSquare className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3 text-center dark:border-teal-900 dark:bg-teal-950/20">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300">
            <UserPlus className="h-3.5 w-3.5" />
            Invite Family Members
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Unique invite code generation arriving in Phase 4
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
