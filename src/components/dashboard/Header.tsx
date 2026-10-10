import { memo, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Mail, Phone, User, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { greeting, type Role } from "@/lib/auth";
import { Modal } from "./Modal";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_phone: string | null;
  message: string;
  is_read: boolean;
  listing_id: string | null;
  created_at: string;
};

type Props = { userId: string; displayName: string; role: Role; onLogout: () => void };

export const Header = memo(function Header({ userId, displayName, role, onLogout }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Msg | null>(null);
  const [reply, setReply] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["inbox", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_messages")
        .select("id,sender_id,sender_name,sender_phone,message,is_read,listing_id,created_at")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_messages", filter: `receiver_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["inbox", userId] });
        toast("New marketplace message");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const unread = notes.some((n) => !n.is_read);

  const openNote = async (n: Msg) => {
    setSelected(n);
    setOpen(false);
    if (!n.is_read) {
      await supabase.from("marketplace_messages").update({ is_read: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["inbox", userId] });
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const { error } = await supabase.from("marketplace_messages").insert({
      sender_id: userId,
      receiver_id: selected.sender_id,
      listing_id: selected.listing_id,
      sender_name: displayName,
      message: reply.trim(),
    });
    if (error) return toast.error("Couldn't send reply");
    toast.success("Reply sent");
    setReply("");
    setSelected(null);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card/90 px-6 lg:px-10">
      <div className="min-w-0">
        <h2 className="truncate text-base font-black">
          {greeting()}, <span className="text-primary">{displayName}</span>
        </h2>
        <p className="label-micro text-muted-foreground">
          Society {role === "admin" ? "Command Center" : role === "guard" ? "Security Hub" : "Resident Hub"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-muted-foreground"
          >
            <Bell size={18} />
            {unread && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive" />}
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-80 rounded-2xl border bg-card p-4 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-100">
              <div className="mb-3 flex items-center gap-2">
                <Mail size={16} className="text-primary" />
                <span className="text-sm font-black">Messages</span>
              </div>
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {notes.length === 0 && <p className="py-8 text-center text-xs font-bold text-muted-foreground">No messages yet</p>}
                {notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNote(n)}
                    className={`rounded-xl border p-3 text-left ${n.is_read ? "" : "border-accent bg-muted"}`}
                  >
                    <p className="label-micro text-primary">Marketplace</p>
                    <p className="text-sm font-bold">{n.sender_name || "A resident"} is interested</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">"{n.message}"</p>
                  </button>
                ))}
              </div>
              <Link to="/dashboard/marketplace" onClick={() => setOpen(false)} className="label-micro mt-3 block rounded-xl bg-muted py-2.5 text-center">
                View marketplace
              </Link>
            </div>
          )}
        </div>
        <div className="hidden items-center gap-2 rounded-xl border bg-card py-1.5 pl-1.5 pr-3 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-primary">
            <User size={15} />
          </div>
          <div>
            <p className="text-xs font-black leading-none">{displayName.split(" ")[0]}</p>
            <p className="text-[10px] font-bold text-primary">{role === "admin" ? "Administrator" : role === "guard" ? "Security" : "Resident"}</p>
          </div>
        </div>
        <button onClick={onLogout} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
          <LogOut size={16} />
        </button>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.sender_name || "Resident"} is interested`}>
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="rounded-2xl bg-muted p-4 text-sm font-semibold">"{selected.message}"</p>
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Phone size={14} /> {selected.sender_phone || "No number provided"}
            </div>
            {selected.sender_phone && (
              <a
                className="btn-primary"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${selected.sender_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${selected.sender_name ?? ""}, regarding your marketplace message...`)}`}
              >
                <ExternalLink size={14} /> WhatsApp
              </a>
            )}
            <div className="flex gap-2">
              <input className="field" placeholder="Write a reply..." value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} />
              <button onClick={sendReply} className="btn-primary" aria-label="Send reply">
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </header>
  );
});
