import type { AboutData } from "../lib/types";

export function AboutDataPanel({ data }: { data: AboutData }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-5">
      <h3 className="text-sm font-medium text-text">About the data</h3>
      <p className="mt-2 text-sm leading-relaxed text-text">{data.source}</p>
      <p className="mt-2 text-sm leading-relaxed text-subtext">{data.what_it_is}</p>
      <p className="mt-2 text-sm leading-relaxed text-subtext">{data.why_used}</p>
      <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-subtext">Known limitations</h4>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-subtext">
        {data.known_limitations.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
