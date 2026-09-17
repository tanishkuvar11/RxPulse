import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", end: true },
  { to: "/simulator", label: "Live Simulator", isDemo: true },
  { to: "/patient", label: "Patient Profiles" },
  { to: "/cohort", label: "Cohort Study" },
  { to: "/instrument", label: "Reliability" },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-ground text-text">
      <header className="sticky top-0 z-30 border-b border-hairline bg-ground/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">Vanishing Dose</span>
            <span className="hidden text-xs text-subtext sm:inline">a clinical evidence instrument</span>
          </NavLink>
          <nav className="flex items-center gap-1.5">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-surface text-text ring-1 ring-hairline shadow-sm"
                      : "text-subtext hover:text-text hover:bg-surface/50"
                  } ${t.isDemo ? "border border-amber/40 bg-amber/5 text-amber hover:bg-amber/10" : ""}`
                }
              >
                <span>{t.label}</span>
                {t.isDemo && (
                  <span className="rounded bg-amber px-1.5 py-0.2 text-[9px] font-bold text-ground">
                    DEMO
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
