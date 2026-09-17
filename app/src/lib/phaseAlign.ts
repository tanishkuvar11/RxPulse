import { STATUS_CENSORED, STATUS_COVERED } from "./types";

export interface AlignedPoint {
  offset: number;
  meanCoverage: number | null;
  n: number;
}

/** Client-side re-alignment of one patient's own coverage strip to their own encounter
 * calendar -- the same operation pipeline/04_align.py does pooled across the whole
 * cohort, run here for a single patient so the Hero comparison can render both the
 * calendar-time and appointment-relative view of the same real data without a
 * second pipeline export. Offsets run -60..+30 days relative to each encounter. */
export function alignToEncounters(
  dates: string[],
  status: number[],
  encounterDates: string[],
  lo = -60,
  hi = 30
): AlignedPoint[] {
  const dayIndex = new Map<string, number>();
  dates.forEach((d, i) => dayIndex.set(d, i));

  const offsets: number[] = [];
  for (let o = lo; o <= hi; o++) offsets.push(o);

  const coveredSum = new Array(offsets.length).fill(0);
  const nSum = new Array(offsets.length).fill(0);

  const dateToMs = (d: string) => new Date(d + "T00:00:00Z").getTime();
  const msPerDay = 86400000;
  const startMs = dateToMs(dates[0]);

  for (const enc of encounterDates) {
    const encIdx = Math.round((dateToMs(enc) - startMs) / msPerDay);
    offsets.forEach((offset, k) => {
      const idx = encIdx + offset;
      if (idx < 0 || idx >= status.length) return;
      const s = status[idx];
      if (s === STATUS_CENSORED) return;
      nSum[k] += 1;
      if (s === STATUS_COVERED) coveredSum[k] += 1;
    });
  }

  return offsets.map((offset, k) => ({
    offset,
    meanCoverage: nSum[k] > 0 ? coveredSum[k] / nSum[k] : null,
    n: nSum[k],
  }));
}
