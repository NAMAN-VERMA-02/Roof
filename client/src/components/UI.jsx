import { AlertCircle, Check, CircleHelp, LoaderCircle, X } from 'lucide-react';
import { statusLabel } from '../lib/dates';

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || 'incomplete'}`}>
      <span className="status-dot" />
      {statusLabel[status] || 'Incomplete'}
    </span>
  );
}

export function EmptyState({ icon: Icon = CircleHelp, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading your space...' }) {
  return (
    <div className="loading">
      <LoaderCircle size={24} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function Notice({ type = 'success', children, onClose }) {
  return (
    <div className={`notice notice-${type}`} role="status">
      {type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
      <span>{children}</span>
      {onClose && (
        <button type="button" className="icon-button" onClick={onClose} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
