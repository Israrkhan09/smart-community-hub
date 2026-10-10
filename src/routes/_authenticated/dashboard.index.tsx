import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Car, ShieldCheck } from "lucide-react";
import { useAuth, homeForRole } from "@/lib/auth";
import { activityQuery, myVisitorsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageBanner, StatCard, BannerBadge } from "@/components/dashboard/PageBanner";
import { formatClock } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Smart-Society OS" }] }),
  component: Overview,
});

function Overview() {
  const { user, role, displayName } = useAuth();
  const uid = user!.id;
  const visitors = useQuery(myVisitorsQuery(uid));
  const logs = useQuery(activityQuery(uid));
  const vehicles = useQuery({
    queryKey: ["vehicles", "mine", uid],
    queryFn: async () => (await supabase.from("resident_vehicles").select("*").eq("resident_id", uid)).data ?? [],
  });

  if (role && role !== "resident") return <Navigate to={homeForRole(role)} />;

  const active = (visitors.data ?? []).filter((v) => v.status === "Active").length;

  return (
    <div className="flex flex-col gap-6">
      <PageBanner
        icon={ShieldCheck}
        eyebrow="Identity verified"
        title={`Welcome back, ${displayName.split(" ")[0]}`}
        subtitle="Your residency is active and all security systems are operational."
        badges={<BannerBadge>Resident</BannerBadge>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active visitors" value={String(active).padStart(2, "0")} sub="Currently inside" icon={Users} />
        <StatCard label="My vehicles" value={String(vehicles.data?.length ?? 0).padStart(2, "0")} sub="Registered units" icon={Car} tone="text-blue-500 bg-blue-50" />
        <StatCard label="Security status" value="100%" sub="All systems normal" icon={ShieldCheck} />
      </div>
      <div className="card-soft overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-black">Recent activity</h3>
          <p className="label-micro text-muted-foreground">Your latest actions</p>
        </div>
        <div className="max-h-[520px] overflow-auto p-4">
          <table className="w-full border-separate border-spacing-y-2 text-left">
            <thead>
              <tr className="label-micro text-muted-foreground">
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Detail</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(logs.data ?? []).map((l) => (
                <tr key={l.id} className="bg-muted/60">
                  <td className="rounded-l-2xl px-4 py-3 text-sm font-black">{l.type}</td>
                  <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{l.detail}</td>
                  <td className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">{formatClock(l.created_at)}</td>
                  <td className="rounded-r-2xl px-4 py-3">
                    <span className="label-micro rounded-lg bg-accent px-3 py-1 text-primary">{l.status}</span>
                  </td>
                </tr>
              ))}
              {!logs.isLoading && (logs.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="label-micro py-10 text-center text-muted-foreground">
                    No activity yet — issue a visitor pass to get started
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
