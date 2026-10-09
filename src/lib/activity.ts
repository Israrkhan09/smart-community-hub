import { supabase } from "@/integrations/supabase/client";

export async function logActivity(userId: string, type: string, detail: string, status: string) {
  await supabase.from("activity_logs").insert({ user_id: userId, type, detail, status });
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
