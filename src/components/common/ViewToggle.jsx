import { LayoutGrid, List, Table2 } from "lucide-react";

const MODES = [
  { id: "grid", icon: LayoutGrid, label: "Grid" },
  { id: "list", icon: List, label: "List" },
  { id: "table", icon: Table2, label: "Table" },
];

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = view === m.id;
        return (
          <button
            key={m.id}
            type="button"
            title={m.label}
            onClick={() => onChange(m.id)}
            className={`p-2 rounded-lg transition ${
              active
                ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
