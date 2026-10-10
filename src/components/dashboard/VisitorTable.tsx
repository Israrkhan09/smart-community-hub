import { memo, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { initials } from "@/lib/activity";

export type VisitorRow = {
  id: string;
  name: string;
  purpose: string;
  vehicle_number: string | null;
  time_in: string | null;
  expiry_time: string | null;
  status: string;
  created_at: string;
};

const PURPOSE_TONE: Record<string, string> = {
  Casual: "bg-blue-500",
  Delivery: "bg-amber-500",
  Maintenance: "bg-purple-500",
  Event: "bg-emerald-500",
};

type Props = {
  rows: VisitorRow[];
  loading?: boolean;
  onExit?: (row: VisitorRow) => void;
  hostLabel?: (row: VisitorRow) => string;
};

export const VisitorTable = memo(function VisitorTable({ rows, loading, onExit, hostLabel }: Props) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter(
      (v) =>
        (filter === "All" || v.status === filter) &&
        (!s || v.name.toLowerCase().includes(s) || (v.vehicle_number ?? "").toLowerCase().includes(s) || v.purpose.toLowerCase().includes(s)),
    );
  }, [rows, filter, q]);

  return (
    <div className="card-soft overflow-hidden">
      <div className="flex flex-col items-center justify-between gap-4 border-b p-5 lg:flex-row">
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {["All", "Active", "Used"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`label-micro rounded-xl px-5 py-2 ${filter === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input className="field pl-11" placeholder="Search by name, plate or purpose..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="max-h-[600px] overflow-auto p-4">
        <table className="w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="label-micro text-muted-foreground">
              <th className="px-4 py-2">Visitor</th>
              <th className="px-4 py-2">Entry</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((v) => (
              <tr key={v.id} className="bg-muted/60 hover:bg-accent/60">
                <td className="rounded-l-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-sm font-black text-primary">{initials(v.name)}</div>
                    <div>
                      <p className="text-sm font-black">{v.name}</p>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{hostLabel ? hostLabel(v) : `Valid till ${v.expiry_time ?? "—"}`}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase text-primary-foreground ${PURPOSE_TONE[v.purpose] ?? "bg-slate-500"}`}>{v.purpose}</span>
                  <span className="ml-2 text-[10px] font-bold text-muted-foreground">{v.time_in}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-black">{v.vehicle_number}</td>
                <td className="px-4 py-3">
                  <span className={`label-micro flex items-center gap-2 ${v.status === "Active" ? "text-primary" : "text-muted-foreground"}`}>
                    <span className={`h-2 w-2 rounded-full ${v.status === "Active" ? "bg-primary" : "bg-slate-300"}`} />
                    {v.status}
                  </span>
                </td>
                <td className="rounded-r-2xl px-4 py-3 text-right">
                  {v.status === "Active" && onExit ? (
                    <button onClick={() => onExit(v)} className="label-micro rounded-xl bg-destructive/10 px-4 py-2 text-destructive hover:bg-destructive/20">
                      Exit
                    </button>
                  ) : (
                    <span className="label-micro text-muted-foreground">{v.status === "Active" ? "" : "Used"}</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="label-micro py-10 text-center text-muted-foreground">
                  No visitors found
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="label-micro py-10 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
