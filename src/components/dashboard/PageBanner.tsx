import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badges?: ReactNode;
};

/** Compact header banner shared by every dashboard page. */
export const PageBanner = memo(function PageBanner({ icon: Icon, eyebrow, title, subtitle, actions, badges }: Props) {
  return (
    <section className="page-banner">
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/15">
            <Icon className="text-primary" size={20} />
          </div>
          <div className="min-w-0">
            <span className="label-micro text-primary">{eyebrow}</span>
            <h1 className="truncate text-xl font-black tracking-tight lg:text-2xl">{title}</h1>
            {subtitle && <p className="mt-0.5 line-clamp-1 text-sm font-medium opacity-60">{subtitle}</p>}
          </div>
        </div>
        {(actions || badges) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {badges}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
});

export function BannerBadge({ children }: { children: ReactNode }) {
  return (
    <span className="label-micro inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
      {children}
    </span>
  );
}

type StatProps = { label: string; value: string; sub?: string; icon: LucideIcon; tone?: string };

export const StatCard = memo(function StatCard({ label, value, sub, icon: Icon, tone = "text-emerald-500 bg-emerald-50" }: StatProps) {
  return (
    <div className="card-soft flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="label-micro truncate text-muted-foreground">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-[10px] font-bold uppercase text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
});
