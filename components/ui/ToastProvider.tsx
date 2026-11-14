"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; pesan: string; jenis: "sukses" | "error" };
type ToastContextValue = { tampilkan: (pesan: string, jenis?: Toast["jenis"]) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tampilkan = useCallback((pesan: string, jenis: Toast["jenis"] = "sukses") => {
    const id = Date.now() + Math.random();
    setToasts((lama) => [...lama, { id, pesan, jenis }]);
    window.setTimeout(() => setToasts((lama) => lama.filter((toast) => toast.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ tampilkan }), [tampilkan]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] grid max-w-sm gap-2" aria-live="polite" aria-label="Notifikasi">
        {toasts.map((toast) => <div key={toast.id} role="status" className={`border-2 border-hitam-900 px-4 py-3 text-sm font-semibold shadow-[4px_4px_0_#141414] ${toast.jenis === "error" ? "bg-gmnimerah-50 text-gmnimerah-700" : "bg-kertas-100 text-hitam-900"}`}>{toast.pesan}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return context;
}
