import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant }) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="modal-backdrop flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 10000,
        backdropFilter: 'blur(8px)'
      }}
      onClick={onCancel}
    >
      <div
        className="card glass-card confirm-dialog animate-scale-up flex-column gap-md"
        style={{
          width: 400,
          maxWidth: '90vw',
          padding: '1.75rem',
          backgroundColor: '#0f172a',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--glass-shadow)',
          borderRadius: 'var(--border-radius)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-center-y" style={{ gap: 12 }}>
          <div
            className="flex-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isDanger ? 'var(--danger-bg)' : 'var(--warning-bg)',
              flexShrink: 0
            }}
          >
            <AlertTriangle
              size={20}
              style={{ color: isDanger ? 'var(--danger-color)' : 'var(--warning-color)' }}
            />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {title || 'Confirmar ação'}
            </h3>
            <p className="text-secondary text-sm" style={{ marginTop: 4, lineHeight: '1.4' }}>
              {message || 'Tem certeza que deseja continuar?'}
            </p>
          </div>
        </div>

        <div className="flex-center-y" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            {cancelLabel || 'Cancelar'}
          </button>
          <button
            className={`btn btn-sm ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={isDanger ? {
              background: 'var(--danger-color)',
              color: '#fff',
              border: 'none'
            } : {}}
          >
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
