import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SOSProvider, useSOS } from "@/lib/sos";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart-Society OS" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SOSProvider>
      <Shell />
    </SOSProvider>
  );
}

function SOSBar() {
  const { flow, countdown } = useSOS();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  if (flow === "IDLE" || pathname === "/dashboard/sos") return null;
  return (
    <button
      onClick={() => navigate({ to: "/dashboard/sos" })}
      className="mx-6 mt-4 flex items-center justify-between rounded-2xl bg-destructive px-5 py-3 text-left text-destructive-foreground shadow-lg lg:mx-10"
    >
      <span className="flex items-center gap-3">
        <ShieldAlert size={18} className="animate-pulse" />
        <span className="text-xs font-black uppercase tracking-widest">Emergency SOS active — tap to return</span>
      </span>
      {countdown > 0 && countdown < 60 && <span className="font-mono text-lg font-black">0:{String(countdown).padStart(2, "0")}</span>}
    </button>
  );
}

function Shell() {
  const { user, role, displayName, loading } = useAuth();
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMessages = useRouterState({ select: (s) => s.location.pathname === "/dashboard/messages" });

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const logout = useCallback(async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }, [qc, navigate]);

  if (loading || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} displayName={displayName} open={open} onToggle={toggle} onLogout={logout} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200" style={{ marginLeft: open ? 288 : 80 }}>
        <Header userId={user.id} displayName={displayName} role={role} onLogout={logout} />
        <SOSBar />
        <main className={isMessages ? "h-[calc(100vh-64px)] overflow-hidden" : "flex-1 px-6 py-6 lg:px-10"}>
          <Outlet />
        </main>
        {!isMessages && (
          <footer className="border-t p-6 text-center text-xs font-semibold text-muted-foreground">
            © 2026 Smart-Society Management OS. All rights reserved.
          </footer>
        )}
      </div>
    </div>
  );
}
