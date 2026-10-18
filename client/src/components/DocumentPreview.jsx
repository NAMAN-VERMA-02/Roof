import { Download, X } from 'lucide-react';

export default function DocumentPreview({ document, onClose }) {
  if (!document) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${document.originalName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <strong>{document.originalName}</strong>
          <div>
            <a href={`/api/documents/${document.id}/file?download=1`} title="Download document">
              <Download size={19} />
            </a>
            <button onClick={onClose} aria-label="Close preview">
              <X size={21} />
            </button>
          </div>
        </div>
        <iframe
          title={`Document ${document.originalName}`}
          src={`/api/documents/${document.id}/file`}
        />
      </div>
    </div>
  );
}
