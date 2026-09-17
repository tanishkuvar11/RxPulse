import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", end: true },
  { to: "/cohort", label: "Cohort" },
  { to: "/patient", label: "Patient" },
  { to: "/instrument", label: "Instrument" },
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
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive ? "bg-surface text-text" : "text-subtext hover:text-text"
                  }`
                }
              >
                {t.label}
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
