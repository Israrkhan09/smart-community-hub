import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "resident" | "guard";

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit: string | null;
  status: string;
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  displayName: string;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ROLE_PRIORITY: Role[] = ["admin", "guard", "resident"];

export function homeForRole(role: Role | null) {
  if (role === "admin") return "/dashboard/admin" as const;
  if (role === "guard") return "/dashboard/guard" as const;
  return "/dashboard" as const;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") qc.clear();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const user = session?.user ?? null;

  const meQuery = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,name,email,phone,unit,status").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      const owned = (roles ?? []).map((r) => r.role as Role);
      const role = ROLE_PRIORITY.find((r) => owned.includes(r)) ?? "resident";
      return { profile: (profile as Profile | null) ?? null, role };
    },
  });

  const value = useMemo<AuthState>(() => {
    const profile = meQuery.data?.profile ?? null;
    const displayName =
      profile?.name || (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "Member";
    return {
      user,
      profile,
      role: meQuery.data?.role ?? null,
      loading: !ready || (!!user && meQuery.isLoading),
      displayName,
      refresh: async () => {
        await qc.invalidateQueries({ queryKey: ["me"] });
      },
    };
  }, [user, meQuery.data, meQuery.isLoading, ready, qc]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
