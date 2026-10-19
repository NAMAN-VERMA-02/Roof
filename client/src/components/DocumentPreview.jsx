import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

export default function DocumentPreview({ document, onClose }) {
  if (!document) return null;
  return <PreviewContent key={document.id} document={document} onClose={onClose} />;
}

function PreviewContent({ document, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const isPdf = document.mimeType === 'application/pdf';
  const fileUrl = `/api/documents/${document.id}/file`;

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    let task;
    async function load() {
      try {
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        task = pdfjs.getDocument({ url: fileUrl, withCredentials: true });
        const loaded = await task.promise;
        if (!cancelled) setPdf(loaded);
      } catch (loadError) {
        if (!cancelled) setError('This PDF could not be previewed. You can still download it.');
      }
    }
    load();
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [fileUrl, isPdf]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let task;
    async function render() {
      setRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        task = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await task.promise;
      } catch (renderError) {
        if (!cancelled && renderError?.name !== 'RenderingCancelledException')
          setError('This PDF could not be previewed. You can still download it.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    }
    render();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber]);

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
            <a
              href={`${fileUrl}?download=1`}
              title="Download document"
              aria-label="Download document"
            >
              <Download size={19} />
            </a>
            <button onClick={onClose} aria-label="Close preview">
              <X size={21} />
            </button>
          </div>
        </div>
        {isPdf && pdf?.numPages > 1 && (
          <div className="preview-toolbar" aria-label="PDF pages">
            <button
              type="button"
              onClick={() => setPageNumber((number) => Math.max(1, number - 1))}
              disabled={pageNumber === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              Page {pageNumber} of {pdf.numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((number) => Math.min(pdf.numPages, number + 1))}
              disabled={pageNumber === pdf.numPages}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        <div className="preview-body">
          {error ? (
            <div className="preview-message">
              {error} <a href={`${fileUrl}?download=1`}>Download document</a>
            </div>
          ) : isPdf ? (
            <>
              {!pdf && <div className="preview-message">Loading PDF preview...</div>}
              {rendering && <div className="preview-rendering">Rendering page...</div>}
              <canvas
                ref={canvasRef}
                aria-label={`Page ${pageNumber} of ${document.originalName}`}
              />
            </>
          ) : (
            <img
              src={fileUrl}
              alt={document.originalName}
              onError={() =>
                setError('This image could not be previewed. You can still download it.')
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
