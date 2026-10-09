import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export type SOSFlow = "IDLE" | "CHOOSING" | "SENDING" | "ACTIVE";

type SOSState = {
  flow: SOSFlow;
  setFlow: (f: SOSFlow) => void;
  emerType: string;
  setEmerType: (t: string) => void;
  stepIndex: number;
  guardActive: boolean;
  isFullyReached: boolean;
  countdown: number;
  handleReset: () => void;
};

const SOSContext = createContext<SOSState | null>(null);

export function SOSProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flow, setFlow] = useState<SOSFlow>("IDLE");
  const [emerType, setEmerType] = useState("");
  const [stepIndex, setStepIndex] = useState(-1);
  const [guardActive, setGuardActive] = useState(false);
  const [isFullyReached, setIsFullyReached] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  const key = user ? `smart-society-sos-${user.id}` : null;

  useEffect(() => {
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return;
      const p = JSON.parse(saved);
      setFlow(p.flow);
      setEmerType(p.emerType);
      setStepIndex(p.stepIndex);
      setGuardActive(p.guardActive);
      setIsFullyReached(p.isFullyReached);
      setTimerRunning(p.timerRunning);
      let c = p.countdown ?? 60;
      if (p.timerRunning && p.lastSynced) c = Math.max(0, c - Math.floor((Date.now() - p.lastSynced) / 1000));
      setCountdown(c);
    } catch {
      /* ignore */
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    localStorage.setItem(
      key,
      JSON.stringify({ flow, emerType, stepIndex, guardActive, isFullyReached, countdown, timerRunning, lastSynced: Date.now() }),
    );
  }, [key, flow, emerType, stepIndex, guardActive, isFullyReached, countdown, timerRunning]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (flow === "SENDING") {
      t = setTimeout(() => {
        setFlow("ACTIVE");
        setStepIndex(0);
      }, 3000);
    } else if (flow === "ACTIVE") {
      if (stepIndex >= 0 && stepIndex < 3) {
        t = setTimeout(() => {
          const next = stepIndex + 1;
          setStepIndex(next);
          if (next === 2) setGuardActive(true);
          if (next === 3) setTimerRunning(true);
        }, 2000);
      } else if (stepIndex === 3 && countdown === 0) {
        setStepIndex(4);
        setIsFullyReached(true);
        if (user) void logActivity(user.id, "Emergency Resolved", "Security guard arrived. Emergency is now resolved.", "Completed");
      }
    }
    return () => clearTimeout(t);
  }, [flow, stepIndex, countdown, user]);

  useEffect(() => {
    if (!timerRunning) return;
    if (countdown <= 0) {
      setTimerRunning(false);
      return;
    }
    const i = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(i);
  }, [timerRunning, countdown]);

  const handleReset = useCallback(() => {
    setFlow("IDLE");
    setEmerType("");
    setStepIndex(-1);
    setGuardActive(false);
    setIsFullyReached(false);
    setCountdown(60);
    setTimerRunning(false);
  }, []);

  const value = useMemo(
    () => ({ flow, setFlow, emerType, setEmerType, stepIndex, guardActive, isFullyReached, countdown, handleReset }),
    [flow, emerType, stepIndex, guardActive, isFullyReached, countdown, handleReset],
  );

  return <SOSContext.Provider value={value}>{children}</SOSContext.Provider>;
}

export function useSOS() {
  const ctx = useContext(SOSContext);
  if (!ctx) throw new Error("useSOS must be used inside SOSProvider");
  return ctx;
}
