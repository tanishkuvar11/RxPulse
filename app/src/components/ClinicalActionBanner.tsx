import type { ClinicalAction } from "../lib/types";

export function ClinicalActionBanner({
  action,
  riskLevel,
  ingredient,
}: {
  action?: ClinicalAction;
  riskLevel?: "high" | "moderate" | "low" | "withheld";
  ingredient: string;
}) {
  if (!action) return null;

  const isEscalationDanger = action.action_type === "escalation_danger";
  const isWithheld = action.action_type === "withheld_investigation";
  const isBarrierCheck = action.action_type === "barrier_check";

  const borderColor = isEscalationDanger
    ? "border-rose-500/50 bg-rose-950/20"
    : isWithheld
    ? "border-amber/40 bg-amber/5"
    : isBarrierCheck
    ? "border-amber/40 bg-amber/10"
    : "border-emerald-500/40 bg-emerald-950/20";

  const badgeColor = isEscalationDanger
    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
    : isWithheld
    ? "bg-amber/20 text-amber border-amber/40"
    : isBarrierCheck
    ? "bg-amber/20 text-amber border-amber/40"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  const cleanBadge = action.alert_badge.replace(/—/g, ": ").replace(/--/g, ": ");
  const cleanRecommendation = action.recommendation.replace(/—/g, ": ").replace(/--/g, ": ");

  return (
    <div className={`rounded-xl border p-5 transition-all shadow-lg ${borderColor}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${badgeColor}`}>
            {isEscalationDanger && (
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            )}
            {cleanBadge}
          </span>
        </div>
        <span className="text-xs text-subtext font-mono">
          Clinical Guidance for: {ingredient.toUpperCase()}
        </span>
      </div>

      <div className="mt-3">
        <h3 className="text-base font-semibold text-text leading-snug">
          {cleanRecommendation}
        </h3>
      </div>

      <div className="mt-4 rounded-lg border border-hairline/60 bg-ground/80 p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber uppercase tracking-wider">
          <svg className="w-4 h-4 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Doctor Conversation Tip: How to ask without making the patient feel judged
        </div>
        <p className="mt-1.5 text-sm italic text-text leading-relaxed">
          {action.talking_point}
        </p>
        <p className="mt-1 text-[11px] text-subtext">
          Focuses on practical issues like pharmacy costs or side effects rather than accusing the patient.
        </p>
      </div>
    </div>
  );
}
