import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const Icon = { success: CheckCircle2, info: Info, error: AlertTriangle };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 text-sm shadow-xl backdrop-blur"
              >
                <I size={18} className={t.kind === 'error' ? 'text-rose-400' : t.kind === 'info' ? 'text-sky-400' : 'text-emerald-400'} />
                <span className="flex-1">{t.message}</span>
                <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="text-muted hover:text-txt">
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function SectionTitle({ icon, title, description, right }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</div>}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted/70">{icon}</div>
      <div className="font-medium text-txt/80">{title}</div>
      {hint && <div className="max-w-sm text-xs">{hint}</div>}
    </div>
  );
}
