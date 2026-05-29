import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer({ toasts, formatDate }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={15} color="var(--status-success)" />
          ) : toast.type === 'error' ? (
            <AlertCircle size={15} color="var(--status-error)" />
          ) : (
            <Info size={15} color="var(--status-info)" />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
            <span style={{ color: 'var(--color-text-primary)' }}>{toast.message}</span>
            {toast.timestamp && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', opacity: 0.8 }}>
                {formatDate(toast.timestamp)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
