import React from 'react';

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          color: '#fff',
          background: '#171a21',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {title && (
          <div
            style={{
              padding: '12px 16px',
            }}
          >
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>
        )}
        <div style={{ padding: 16, color: '#111' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: 16,
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              color: '#111',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
