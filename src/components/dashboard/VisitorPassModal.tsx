import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Clock, Download, Loader2, MessageCircle, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { Modal, Field } from "./Modal";
import { toast } from "sonner";

const DURATIONS = ["1 Hour", "3 Hours", "6 Hours", "Overnight"];

export function hoursFor(duration: string) {
  return duration === "Overnight" ? 18 : parseInt(duration, 10);
}

type Props = { open: boolean; onClose: () => void; residentId: string; onCreated: () => void };

export function VisitorPassModal({ open, onClose, residentId, onCreated }: Props) {
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [form, setForm] = useState({ name: "", vehicle: "", purpose: "Casual", duration: "3 Hours" });
  const [expiry, setExpiry] = useState("");
  const [passId, setPassId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const passRef = useRef<HTMLDivElement>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep("form");
      setForm({ name: "", vehicle: "", purpose: "Casual", duration: "3 Hours" });
    }, 150);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loading");
    const now = new Date();
    const exp = new Date(now.getTime() + hoursFor(form.duration) * 3600_000);
    const expText = exp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const { data, error } = await supabase
      .from("visitors")
      .insert({
        resident_id: residentId,
        name: form.name.trim(),
        vehicle_number: form.vehicle.trim() || "N/A",
        purpose: form.purpose,
        duration: form.duration,
        status: "Active",
        time_in: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        entry_timestamp: now.getTime(),
        expiry_time: expText,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Couldn't issue the pass. Please try again.");
      setStep("form");
      return;
    }
    void logActivity(residentId, "Visitor Pass", `${form.purpose} QR pass issued for ${form.name}.`, "Active");
    setExpiry(expText);
    setPassId("SS-" + data.id.slice(0, 8).toUpperCase());
    setStep("success");
    onCreated();
  };

  const whatsapp = () => {
    const text = `*Visitor Pass - Smart Society*\n\n*Guest:* ${form.name}\n*Vehicle:* ${form.vehicle || "N/A"}\n*Purpose:* ${form.purpose}\n*Valid Till:* ${expiry}\n*Pass:* ${passId}\n\n_Please show this pass at the main gate._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const download = async () => {
    if (!passRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(passRef.current, { scale: 3, backgroundColor: null });
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`VisitorPass_${form.name.trim().replace(/\s+/g, "_") || "Guest"}.pdf`);
    } catch {
      toast.error("Couldn't create the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Visitor Pass">
      {step === "form" && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Guest name">
            <input required className="field" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle (optional)">
              <input className="field" placeholder="ABC-123" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
            </Field>
            <Field label="Purpose">
              <select className="field" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                {["Casual", "Delivery", "Maintenance", "Event"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Stay duration">
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setForm({ ...form, duration: d })}
                  className={`label-micro flex items-center justify-center gap-2 rounded-xl border py-2.5 ${form.duration === d ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <Clock size={12} /> {d}
                </button>
              ))}
            </div>
          </Field>
          <button type="submit" className="btn-primary mt-2 py-3.5">
            <Zap size={16} /> Generate pass
          </button>
        </form>
      )}
      {step === "loading" && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="mb-3 animate-spin text-primary" size={40} />
          <p className="text-lg font-black">Securing pass</p>
        </div>
      )}
      {step === "success" && (
        <div className="flex flex-col items-center">
          <div ref={passRef} className="w-full rounded-3xl bg-deep p-5 text-deep-foreground">
            <div className="mb-4 flex items-center justify-between border-b border-deep-foreground/10 pb-3">
              <span className="label-micro flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Verified pass
              </span>
              <span className="text-[9px] font-black opacity-40">{passId}</span>
            </div>
            <div className="mb-4 flex flex-col items-center rounded-2xl bg-card p-3">
              <QRCode value={JSON.stringify({ passId, name: form.name, expires: expiry })} size={140} />
              <span className="label-micro mt-2 text-muted-foreground">Scan at main gate</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label-micro text-primary">Guest</p>
                <p className="truncate text-sm font-black">{form.name}</p>
              </div>
              <div>
                <p className="label-micro text-primary">Expires</p>
                <p className="text-sm font-black">{expiry}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <button onClick={whatsapp} className="btn-primary">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button onClick={download} disabled={downloading} className="label-micro flex items-center justify-center gap-2 rounded-xl border py-3 disabled:opacity-50">
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
            </button>
          </div>
          <p className="label-micro mt-4 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 size={12} className="text-primary" /> Pass active
          </p>
        </div>
      )}
    </Modal>
  );
}
