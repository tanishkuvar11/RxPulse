import { Link } from "react-router-dom";
import { useData } from "../lib/useData";
import type { PatientsData } from "../lib/types";
import { AxisTransition } from "../components/AxisTransition";
import { titleCase } from "../lib/format";

export default function Hero() {
  const { data, loading, error } = useData<PatientsData>("patients.json");
  const patient = data?.patients?.slice().sort((a, b) => (b.pre_appointment_lift ?? -1) - (a.pre_appointment_lift ?? -1))[0];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-text sm:text-4xl">
          When blood pressure stays high, the reflex is to escalate the dose.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-subtext">
          If the real cause is missed doses, escalation becomes dangerous the moment the patient
          resumes taking the drug as prescribed. This instrument reads real prescription fills and
          real appointment dates to tell the difference between a drug that isn't working and a
          drug that isn't being taken -- and says plainly when there isn't enough evidence to tell.
        </p>
      </section>

      <section className="rounded-lg border border-hairline bg-surface p-5">
        <h2 className="text-sm font-medium text-text">One patient, two ways of looking at the same days</h2>
        <p className="mt-1 text-sm text-subtext">
          Every day this patient's medication was covered (amber), uncovered, or censored by a
          hospital stay (hatched), first in the order it happened, then re-sorted by how many days
          it fell before or after their nearest real appointment.
        </p>
        {loading && <p className="mt-4 text-sm text-subtext">Loading...</p>}
        {error && <p className="mt-4 text-sm text-subtext">Could not load patient data: {error}</p>}
        {patient && (
          <div className="mt-4">
            <AxisTransition
              dates={patient.coverage_dates}
              status={patient.coverage_status}
              encounterDates={patient.encounter_dates}
            />
            <p className="mt-3 text-xs text-subtext">
              {titleCase(patient.ingredient)} ({patient.drug_class.replace(/_/g, " ")}), one
              beneficiary from the cohort. This is one patient's own numbers, shown to make the
              method concrete -- the cohort-wide result is on the Cohort screen, including the
              cases where it comes out null.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link to="/cohort" className="rounded-md border border-hairline bg-surface px-4 py-2 text-sm text-text hover:border-amber">
          See the cohort-wide result →
        </Link>
        <Link to="/patient" className="rounded-md border border-hairline bg-surface px-4 py-2 text-sm text-text hover:border-amber">
          Look at individual patients →
        </Link>
        <Link to="/instrument" className="rounded-md border border-hairline bg-surface px-4 py-2 text-sm text-text hover:border-amber">
          Check the instrument itself →
        </Link>
      </section>
    </div>
  );
}
