import type { AboutData } from "../lib/types";

export function AboutDataPanel({ data }: { data: AboutData }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
      <h3 className="text-sm font-semibold text-text">About the CMS Medicare Dataset</h3>
      <p className="text-xs leading-relaxed text-text font-medium">{data.source}</p>
      <p className="text-xs leading-relaxed text-subtext">{data.what_it_is}</p>
      <p className="text-xs leading-relaxed text-subtext">{data.why_used}</p>
      <h4 className="pt-2 text-xs font-semibold uppercase tracking-wide text-subtext">Known Data Properties & Disclosures</h4>
      <ul className="list-disc space-y-1.5 pl-4 text-xs text-subtext leading-relaxed">
        {data.known_limitations.map((l, i) => (
          <li key={i}>{l.replace(/—/g, ": ").replace(/--/g, ": ")}</li>
        ))}
      </ul>
    </div>
  );
}
