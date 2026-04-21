import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Cargando...");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return p + Math.random() * 15;
      });
    }, 150);

    const completeAfterMin = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setProgress(100);
        setStatusText("Listo");
        setTimeout(() => {
          setExiting(true);
          setTimeout(onComplete, 400);
        }, 300);
      }, remaining);
    };

    completeAfterMin();

    return () => clearInterval(progressInterval);
  }, [onComplete, minDuration]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-[#0f172a] transition-opacity duration-400",
        exiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Logo */}
      <div className={cn("flex flex-col items-center gap-6", "animate-fade-in")}>
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/30">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-14 w-14"
            >
              <path
                d="M8 20L20 8L26 14L34 6L42 14L34 22L40 28L28 40L22 34L14 42L6 34L14 26L8 20Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="24" cy="24" r="4" fill="white" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl -z-10" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">TecnoFix</h1>
          <p className="text-sm text-slate-400">Sistema de gestión de taller</p>
        </div>

        {/* Progress bar */}
        <div className="w-56 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-slate-500">{statusText}</p>
        </div>
      </div>
    </div>
  );
}
