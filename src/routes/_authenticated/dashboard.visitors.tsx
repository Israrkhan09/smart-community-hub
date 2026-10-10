import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { myVisitorsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { PageBanner, StatCard } from "@/components/dashboard/PageBanner";
import { VisitorTable, type VisitorRow } from "@/components/dashboard/VisitorTable";
import { VisitorPassModal } from "@/components/dashboard/VisitorPassModal";

export const Route = createFileRoute("/_authenticated/dashboard/visitors")({
  head: () => ({ meta: [{ title: "Visitor Pass — Smart-Society OS" }] }),
  component: VisitorsPage,
});

function VisitorsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery(myVisitorsQuery(uid));

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["visitors"] }), [qc]);

  const exit = useCallback(
    async (v: VisitorRow) => {
      qc.setQueryData(myVisitorsQuery(uid).queryKey, (old) => old?.map((r) => (r.id === v.id ? { ...r, status: "Used" } : r)));
      const { error } = await supabase.from("visitors").update({ status: "Used" }).eq("id", v.id);
      if (error) {
        toast.error("Couldn't mark exit");
        refresh();
        return;
      }
      void logActivity(uid, "Visitor Exit", `${v.purpose} ${v.name} marked as safely exited.`, "Used");
    },
    [qc, uid, refresh],
  );

  const active = data.filter((v) => v.status === "Active").length;
  const overtime = data.filter((v) => v.status === "Active" && Date.now() - new Date(v.created_at).getTime() > 18 * 3600_000).length;

  return (
    <div className="flex flex-col gap-6">
      <PageBanner
        icon={Users}
        eyebrow="Security & access control"
        title="Visitor Management"
        subtitle="Issue digital QR passes and keep track of who is inside."
        actions={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> Issue new QR pass
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Active passes" value={String(active).padStart(2, "0")} sub="Currently inside" icon={ShieldCheck} />
        <StatCard label="Overtime alerts" value={String(overtime).padStart(2, "0")} sub="Over 18 hours" icon={AlertTriangle} tone="text-rose-500 bg-rose-50" />
      </div>
      <VisitorTable rows={data} loading={isLoading} onExit={exit} />
      <VisitorPassModal open={open} onClose={() => setOpen(false)} residentId={uid} onCreated={refresh} />
    </div>
  );
}
