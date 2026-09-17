export type Provenance = "measured" | "derived" | "simulated";

export interface FunnelStep {
  label: string;
  n: number;
}
export interface FunnelData {
  provenance: Provenance;
  steps: FunnelStep[];
  min_fills: number;
  min_encounters: number;
}

export interface AlignmentResult {
  observed_lift: number;
  p_value: number;
  ci_lo: number;
  ci_hi: number;
  n_permutations: number;
  n_bootstrap: number;
  n_pairs: number;
  null_band_95: [number, number];
}
export interface CohortCurveData {
  provenance: Provenance;
  offsets: number[];
  mean_coverage: (number | null)[];
  n_observations: number[];
  near_band: [number, number];
  far_band: [number, number];
  result: AlignmentResult;
}

export interface ArchetypeCluster {
  cluster: number;
  label: string;
  n: number;
  centroid: Record<string, number>;
}
export interface ArchetypesData {
  provenance: Provenance;
  clusters: ArchetypeCluster[];
}

export interface PowerCurveRow {
  noise_sd: number;
  true_effect_size: number;
  power: number;
  n_replicates: number;
  mean_observed_lift: number;
}
export interface InstrumentData {
  provenance_note: string;
  calibration_curve: {
    provenance: Provenance;
    nominal_coverage: number[];
    realized_coverage: number[];
    n_val: number[];
  };
  power_curve?: {
    provenance: Provenance;
    rows: PowerCurveRow[];
  };
}

export interface Hypothesis {
  hypothesis: string;
  verdict: "supported" | "contradicted" | "not assessable";
  evidence: string;
}
export interface NextObservation {
  observation: string;
  expected_bits_reduced: number;
}
export interface ConformalInfo {
  predicted_lift: number;
  interval_lo: number;
  interval_hi: number;
  abstain: boolean;
}
export interface Patient {
  id: string;
  desynpuf_id: string;
  ingredient: string;
  drug_class: string;
  n_fills: number;
  archetype: { cluster: number; label: string } | null;
  pre_appointment_lift: number | null;
  conformal: ConformalInfo | null;
  hypotheses: Hypothesis[];
  next_observations: NextObservation[];
  coverage_dates: string[];
  coverage_status: number[]; // 0 uncovered, 1 covered, 2 censored
  encounter_dates: string[];
}
export interface PatientsData {
  provenance: Provenance;
  patients: Patient[];
}

export interface AboutData {
  source: string;
  what_it_is: string;
  why_used: string;
  known_limitations: string[];
  provenance: Provenance;
}

export const STATUS_UNCOVERED = 0;
export const STATUS_COVERED = 1;
export const STATUS_CENSORED = 2;
