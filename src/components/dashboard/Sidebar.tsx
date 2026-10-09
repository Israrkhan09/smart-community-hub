import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Car, ShieldAlert, MessageSquare, MessageCircle, LogOut, LayoutDashboard, ShoppingBag,
  ShieldCheck, Building, FileText, AlertCircle, CreditCard, HardDrive, ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth";

type NavItem = { name: string; to: string; icon: LucideIcon; exact?: boolean };

const MODULES: Record<Role, NavItem[]> = {
  admin: [
    { name: "Overview", to: "/dashboard/admin", icon: LayoutDashboard, exact: true },
    { name: "Residents", to: "/dashboard/admin/residents", icon: Building },
    { name: "Guards", to: "/dashboard/admin/guards", icon: ShieldCheck },
    { name: "Visitor Logs", to: "/dashboard/admin/visitors", icon: HardDrive },
    { name: "Vehicle Logs", to: "/dashboard/admin/vehicles", icon: Car },
    { name: "Operations", to: "/dashboard/admin/complaints", icon: FileText },
    { name: "SOS Center", to: "/dashboard/admin/sos", icon: AlertCircle },
    { name: "Financials", to: "/dashboard/admin/finance", icon: CreditCard },
    { name: "Messages", to: "/dashboard/messages", icon: MessageCircle },
  ],
  resident: [
    { name: "Overview", to: "/dashboard", icon: LayoutDashboard, exact: true },
    { name: "Visitor Pass", to: "/dashboard/visitors", icon: ShieldCheck },
    { name: "Vehicle Log", to: "/dashboard/vehicles", icon: Car },
    { name: "Emergency SOS", to: "/dashboard/sos", icon: ShieldAlert },
    { name: "Marketplace", to: "/dashboard/marketplace", icon: ShoppingBag },
    { name: "Complaints", to: "/dashboard/complaints", icon: MessageSquare },
    { name: "Messages", to: "/dashboard/messages", icon: MessageCircle },
  ],
  guard: [
    { name: "Checkpoint", to: "/dashboard/guard", icon: ShieldCheck, exact: true },
    { name: "Visitor Reg", to: "/dashboard/guard/visitors", icon: Users },
    { name: "Vehicle Check", to: "/dashboard/guard/vehicles", icon: Car },
    { name: "SOS Patrol", to: "/dashboard/guard/sos", icon: ShieldAlert },
    { name: "Messages", to: "/dashboard/messages", icon: MessageCircle },
  ],
};

type Props = {
  role: Role;
  displayName: string;
  open: boolean;
  onToggle: () => void;
  onLogout: () => void;
};

export const Sidebar = memo(function Sidebar({ role, displayName, open, onToggle, onLogout }: Props) {
  const links = MODULES[role];
  return (
    <aside
      className={`fixed left-0 top-0 z-[60] flex h-screen flex-col border-r bg-sidebar transition-[width] duration-200 ${open ? "w-72" : "w-20"}`}
    >
      <div className={`relative flex items-center p-6 pb-8 ${open ? "" : "justify-center px-4"}`}>
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Building size={20} />
          </div>
          {open && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-black uppercase tracking-[0.2em]">Smart Society</p>
              <p className="label-micro mt-0.5 text-muted-foreground">{role} terminal</p>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          aria-label={open ? "Collapse menu" : "Expand menu"}
          className="absolute -right-3 top-9 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-primary"
        >
          {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <nav className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {open && <p className="label-micro mb-3 px-4 text-muted-foreground">Command Center</p>}
        {links.map((l) => (
          <Link
            key={l.to + l.name}
            to={l.to}
            preload="intent"
            title={open ? undefined : l.name}
            activeOptions={{ exact: !!l.exact }}
            className={`group flex items-center gap-4 rounded-2xl px-3 py-2.5 text-muted-foreground transition-colors duration-75 hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-card data-[status=active]:text-primary data-[status=active]:shadow-sm data-[status=active]:ring-1 data-[status=active]:ring-border ${open ? "" : "justify-center px-0"}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted group-data-[status=active]:bg-accent group-data-[status=active]:text-primary">
              <l.icon size={18} />
            </span>
            {open && <span className="whitespace-nowrap text-[11px] font-black uppercase tracking-wider">{l.name}</span>}
          </Link>
        ))}
      </nav>

      <div className={`p-4 ${open ? "" : "px-2"}`}>
        <div className="rounded-[1.5rem] border bg-muted p-3">
          <div className={`mb-3 flex items-center gap-3 ${open ? "" : "justify-center"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-card font-black text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {open && (
              <div className="overflow-hidden">
                <p className="truncate text-xs font-black">{displayName}</p>
                <span className="label-micro text-muted-foreground">{role} account</span>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="label-micro flex w-full items-center justify-center gap-2 rounded-xl border bg-card py-2.5 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut size={14} />
            {open && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
});
