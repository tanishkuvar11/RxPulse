import { useState } from "react";
import type { Provenance } from "../lib/types";

const LABEL: Record<Provenance, string> = {
  measured: "measured",
  derived: "derived",
  simulated: "simulated",
};

const DEFAULT_NOTE: Record<Provenance, string> = {
  measured: "From a downloaded CMS file, untouched.",
  derived: "Computed from measured data by this pipeline.",
  simulated: "From the validation harness (injected-effect synthetic data), never the real cohort.",
};

/** The one tag every number on screen must carry. Hover (or focus, for keyboard/touch)
 * shows the formula or source note. No number renders without one of these three. */
export function ProvenanceTag({
  kind,
  formula,
}: {
  kind: Provenance;
  formula?: string;
}) {
  const [open, setOpen] = useState(false);
  const color =
    kind === "measured" ? "text-subtext" : kind === "derived" ? "text-amber" : "text-subtext";

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className={`ml-1.5 rounded-sm border border-hairline px-1 text-[10px] font-mono leading-4 ${color} hover:border-subtext focus:outline-none focus:border-amber`}
        aria-label={`provenance: ${kind}`}
      >
        {LABEL[kind]}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-md border border-hairline bg-surface px-3 py-2 text-xs leading-snug text-text shadow-lg"
        >
          {formula ?? DEFAULT_NOTE[kind]}
        </span>
      )}
    </span>
  );
}
