import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VisitorRow } from "@/components/dashboard/VisitorTable";

const VISITOR_COLS = "id,name,purpose,vehicle_number,time_in,expiry_time,status,created_at,resident_id";

export const myVisitorsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["visitors", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("visitors").select(VISITOR_COLS).eq("resident_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as (VisitorRow & { resident_id: string })[];
    },
  });

export const allVisitorsQuery = () =>
  queryOptions({
    queryKey: ["visitors", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("visitors").select(VISITOR_COLS).order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data as (VisitorRow & { resident_id: string })[];
    },
  });

export const profilesQuery = () =>
  queryOptions({
    queryKey: ["profiles"],
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,name,email,phone,unit,shift,status,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        if (r.role === "admin" || !roleMap.has(r.user_id) || (r.role === "guard" && roleMap.get(r.user_id) === "resident")) roleMap.set(r.user_id, r.role);
      });
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "resident" }));
    },
  });

export const activityQuery = (userId: string) =>
  queryOptions({
    queryKey: ["activity", userId],
    queryFn: async () => {
      const { data } = await supabase.from("activity_logs").select("id,type,detail,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

export const allVehiclesQuery = () =>
  queryOptions({
    queryKey: ["vehicles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resident_vehicles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
