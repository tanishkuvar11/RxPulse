import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Hero from "./views/Hero";
import CohortView from "./views/CohortView";
import PatientView from "./views/PatientView";
import InstrumentView from "./views/InstrumentView";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Hero />} />
        <Route path="/cohort" element={<CohortView />} />
        <Route path="/patient" element={<PatientView />} />
        <Route path="/instrument" element={<InstrumentView />} />
      </Route>
    </Routes>
  );
}
