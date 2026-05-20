import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

const ICONS = {
  success: <CheckCircle2 size={14} className="text-green-400 shrink-0" />,
  error:   <XCircle     size={14} className="text-red-400 shrink-0" />,
  info:    <AlertCircle size={14} className="text-blue-400 shrink-0" />,
};

const STYLES = {
  success: 'border-green-500/30 bg-green-500/10',
  error:   'border-red-500/30 bg-red-500/10',
  info:    'border-blue-500/30 bg-blue-500/10',
};

export function Toast({ message, type = 'success', onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 3000);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm text-app
      transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      ${STYLES[type]}`}
    >
      {ICONS[type]}
      <span className="text-xs">{message}</span>
    </div>,
    document.body
  );
}

// Hook for easy use
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type = 'success') => setToast({ message, type, key: Date.now() });
  const node = toast ? <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} /> : null;
  return { show, node };
}
