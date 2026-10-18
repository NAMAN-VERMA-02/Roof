import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  FileText,
  Plus,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { documentTypes, documentTypeLabel } from '../lib/documents';
import { EmptyState, Loading, Notice } from '../components/UI';
import DocumentPreview from '../components/DocumentPreview';

export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('search') || '';
  const category = params.get('category') || 'all';
  const [search, setSearch] = useState(query);
  const [documents, setDocuments] = useState(null);
  const [products, setProducts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [productId, setProductId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('receipt');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => setSearch(query), [query]);

  useEffect(() => {
    let active = true;
    api('/products?status=all')
      .then(({ products: items }) => {
        if (active) {
          setProducts(items);
          setProductId((value) => value || items[0]?.id || '');
        }
      })
      .catch((err) => {
        if (active) setError(friendlyError(err));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api(`/documents?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`)
      .then(({ documents: items }) => {
        if (active) {
          setDocuments(items);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(friendlyError(err));
      });
    return () => {
      active = false;
    };
  }, [query, category]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== query)
        setParams((current) => {
          const next = new URLSearchParams(current);
          search ? next.set('search', search) : next.delete('search');
          return next;
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, query, setParams]);

  async function upload(event) {
    event.preventDefault();
    if (!productId || !file) return;
    setUploadBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', uploadCategory);
      form.append('note', note);
      await api(`/products/${productId}/documents`, { method: 'POST', body: form });
      const { documents: items } = await api(
        `/documents?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
      );
      setDocuments(items);
      setFile(null);
      setNote('');
      setUploadOpen(false);
      setNotice('Document saved securely. Open its product or preview it here anytime.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR DIGITAL PAPER TRAIL</div>
          <h1>Document vault</h1>
          <p>Your warranty proof, bills and manuals are one search away.</p>
        </div>
        {products.length > 0 && (
          <button
            className="button button-primary"
            onClick={() => setUploadOpen((value) => !value)}
          >
            <Plus size={18} /> Add document
          </button>
        )}
      </div>
      {error && (
        <Notice type="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && (
        <Notice type="success" onClose={() => setNotice('')}>
          {notice}
        </Notice>
      )}
      <section className="vault-hero">
        <div className="vault-hero-icon">
          <FileText size={28} />
        </div>
        <div>
          <div className="eyebrow">READY WHEN LIFE HAPPENS</div>
          <h2>Can’t find the paper warranty?</h2>
          <p>
            Save a clear scan or photo with the right product. Roof keeps it private and easy to
            retrieve when you need support.
          </p>
        </div>
      </section>
      {uploadOpen && (
        <form className="panel vault-upload" onSubmit={upload}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ADD TO YOUR VAULT</div>
              <h2>Save a document</h2>
            </div>
          </div>
          <div className="vault-upload-grid">
            <label className="field">
              <span>Product</span>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name} · {product.brand}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Document type</span>
              <select
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value)}
              >
                {documentTypes.map((type) => (
                  <option value={type.value} key={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field vault-note">
              <span>Helpful note (optional)</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="e.g. Stamped warranty card"
              />
            </label>
          </div>
          <label className="upload-zone vault-file-zone">
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
            <span className="upload-icon">
              <UploadCloud size={24} />
            </span>
            <strong>{file ? file.name : 'Choose a PDF or photo'}</strong>
            <span>PDF, PNG or JPEG · Up to 10 MB</span>
          </label>
          <div className="vault-upload-actions">
            <button className="button button-primary" disabled={uploadBusy || !productId || !file}>
              {uploadBusy ? 'Saving...' : 'Save document'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setUploadOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="panel vault-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">EVERYTHING IN ONE PLACE</div>
            <h2>
              Saved documents <span className="section-count">{documents?.length || 0}</span>
            </h2>
          </div>
        </div>
        <div className="vault-toolbar">
          <div className="search-box">
            <Search size={19} />
            <input
              aria-label="Search documents"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file, note or product..."
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={17} />
              </button>
            )}
          </div>
          <label className="field">
            <span>Type</span>
            <select
              aria-label="Filter documents by type"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value;
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  nextCategory === 'all'
                    ? next.delete('category')
                    : next.set('category', nextCategory);
                  return next;
                });
              }}
            >
              <option value="all">All types</option>
              {documentTypes.map((type) => (
                <option value={type.value} key={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {documents === null && !error ? (
          <Loading />
        ) : documents?.length ? (
          <div className="vault-list">
            {documents.map((document) => (
              <div className="vault-row" key={document.id}>
                <div className="file-icon">
                  <FileText size={21} />
                </div>
                <div className="vault-info">
                  <span className="document-kind">{documentTypeLabel(document.category)}</span>
                  <strong>{document.originalName}</strong>
                  <span>
                    {document.note ||
                      `Saved ${new Date(document.createdAt).toLocaleDateString('en-IN')}`}
                  </span>
                  <Link to={`/products/${document.productId}`}>
                    {document.productName} <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="vault-row-actions">
                  <button
                    className="icon-action"
                    onClick={() => setPreview(document)}
                    title="Preview document"
                    aria-label={`Preview ${document.originalName}`}
                  >
                    <ArrowUpRight size={19} />
                  </button>
                  <a
                    className="icon-action"
                    href={`/api/documents/${document.id}/file?download=1`}
                    title="Download document"
                    aria-label={`Download ${document.originalName}`}
                  >
                    <Download size={19} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={query || category !== 'all' ? 'No matching documents' : 'Your vault is ready'}
            text={
              query || category !== 'all'
                ? 'Try a different search or document type.'
                : 'Add a product and save a bill, warranty card or manual here.'
            }
            action={
              !products.length && (
                <Link className="button button-secondary" to="/products/new">
                  Add a product
                </Link>
              )
            }
          />
        )}
      </section>
      <DocumentPreview document={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
