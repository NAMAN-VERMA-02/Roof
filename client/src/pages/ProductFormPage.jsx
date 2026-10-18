import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileUp,
  Info,
  PackagePlus,
  Save,
  X,
} from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { calculatedEnd, formatDate } from '../lib/dates';
import { Loading, Notice } from '../components/UI';

const blank = {
  name: '',
  brand: '',
  model: '',
  category: '',
  serialNumber: '',
  purchaseDate: '',
  warrantyStartDate: '',
  warrantyMonths: '',
  manualEndDate: '',
  terms: '',
  notes: '',
};

export default function ProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!editing) return;
    api(`/products/${id}`)
      .then(({ product }) =>
        setForm({
          name: product.name || '',
          brand: product.brand || '',
          model: product.model || '',
          category: product.category || '',
          serialNumber: product.serialNumber || '',
          purchaseDate: product.purchaseDate || '',
          warrantyStartDate: product.warrantyStartDate || '',
          warrantyMonths: product.warrantyMonths || '',
          manualEndDate: product.endDateSource === 'manual' ? product.warrantyEndDate : '',
          terms: product.terms || '',
          notes: product.notes || '',
        }),
      )
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const preview = useMemo(
    () =>
      form.manualEndDate ||
      calculatedEnd(form.warrantyStartDate || form.purchaseDate, form.warrantyMonths),
    [form],
  );

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        ...form,
        warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
      };
      const { product } = await api(editing ? `/products/${id}` : '/products', {
        method: editing ? 'PATCH' : 'POST',
        body,
      });
      if (file) {
        const upload = new FormData();
        upload.append('file', file);
        try {
          await api(`/products/${product.id}/receipts`, { method: 'POST', body: upload });
        } catch (uploadError) {
          navigate(`/products/${product.id}`, {
            state: {
              notice: `Product saved, but the receipt was not uploaded: ${friendlyError(uploadError)}`,
              noticeType: 'error',
            },
          });
          return;
        }
      }
      navigate(`/products/${product.id}`, {
        state: {
          notice: editing ? 'Product updated successfully.' : 'Product added to your vault.',
        },
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  return (
    <div className="page-stack">
      <div className="page-heading form-heading">
        <div>
          <Link to={editing ? `/products/${id}` : '/products'} className="back-link">
            <ArrowLeft size={17} /> Back to {editing ? 'product' : 'products'}
          </Link>
          <div className="eyebrow">{editing ? 'UPDATE DETAILS' : 'A NEW ADDITION'}</div>
          <h1>{editing ? 'Edit product' : 'Add a product'}</h1>
          <p>Keep the details that matter, right where you can find them.</p>
        </div>
      </div>
      {error && (
        <Notice type="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      <form onSubmit={submit} className="form-layout">
        <div className="form-main">
          <section className="panel form-section">
            <div className="section-heading">
              <span className="section-icon">
                <PackagePlus size={20} />
              </span>
              <div>
                <h2>Product details</h2>
                <p>Start with the basics about your purchase.</p>
              </div>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>
                  Product name <b>*</b>
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder="e.g. MacBook Air"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </label>
              <label className="field">
                <span>
                  Brand <b>*</b>
                </span>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={update}
                  placeholder="e.g. Apple"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label className="field">
                <span>Model</span>
                <input
                  name="model"
                  value={form.model}
                  onChange={update}
                  placeholder="e.g. M3 13-inch"
                  maxLength={100}
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select name="category" value={form.category} onChange={update}>
                  <option value="">Select category</option>
                  <option>Electronics</option>
                  <option>Appliances</option>
                  <option>Home & Living</option>
                  <option>Furniture</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="field full">
                <span>Serial number</span>
                <input
                  name="serialNumber"
                  value={form.serialNumber}
                  onChange={update}
                  placeholder="Optional but helpful for support"
                  maxLength={120}
                />
              </label>
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-heading">
              <span className="section-icon">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2>Warranty information</h2>
                <p>We'll keep track of the date for you.</p>
              </div>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>
                  Purchase date <b>*</b>
                </span>
                <input
                  type="date"
                  name="purchaseDate"
                  value={form.purchaseDate}
                  onChange={update}
                  required
                />
              </label>
              <label className="field">
                <span>Warranty start date</span>
                <input
                  type="date"
                  name="warrantyStartDate"
                  value={form.warrantyStartDate}
                  onChange={update}
                />
                <small>Leave blank to use the purchase date.</small>
              </label>
              <label className="field">
                <span>Warranty duration (months)</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  name="warrantyMonths"
                  value={form.warrantyMonths}
                  onChange={update}
                  placeholder="e.g. 12"
                />
              </label>
              <label className="field">
                <span>Manufacturer end date</span>
                <input
                  type="date"
                  name="manualEndDate"
                  value={form.manualEndDate}
                  onChange={update}
                />
                <small>Overrides the calculated date if provided.</small>
              </label>
              <label className="field full">
                <span>Warranty terms</span>
                <textarea
                  name="terms"
                  value={form.terms}
                  onChange={update}
                  placeholder="What is included or excluded?"
                  rows={3}
                  maxLength={2000}
                />
              </label>
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-heading">
              <span className="section-icon">
                <FileUp size={20} />
              </span>
              <div>
                <h2>Receipt & notes</h2>
                <p>Add proof of purchase now or anytime later.</p>
              </div>
            </div>
            <label className="upload-zone">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span className="upload-icon">
                <FileUp size={24} />
              </span>
              <strong>{file ? file.name : 'Choose a receipt file'}</strong>
              <span>PDF, PNG or JPEG · Up to 10 MB</span>
            </label>
            {file && (
              <button type="button" className="remove-file" onClick={() => setFile(null)}>
                <X size={15} /> Remove file
              </button>
            )}
            <label className="field">
              <span>Private notes</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={update}
                placeholder="Anything else worth remembering?"
                rows={3}
                maxLength={2000}
              />
            </label>
          </section>
        </div>
        <aside className="form-aside">
          <div className="panel preview-card">
            <div className="eyebrow">AT A GLANCE</div>
            <h3>Warranty preview</h3>
            <div className="preview-row">
              <span>Product</span>
              <strong>{form.name || 'Your product'}</strong>
            </div>
            <div className="preview-row">
              <span>Purchase date</span>
              <strong>{formatDate(form.purchaseDate)}</strong>
            </div>
            <div className="preview-row">
              <span>Coverage ends</span>
              <strong>{formatDate(preview)}</strong>
            </div>
            <div className="preview-note">
              <Info size={17} />
              <span>
                {preview
                  ? 'Based on the dates entered. Manufacturer terms always take precedence.'
                  : 'Add a duration or manufacturer end date to track coverage.'}
              </span>
            </div>
          </div>
          <button type="submit" className="button button-primary save-button" disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : editing ? 'Save changes' : 'Save product'}{' '}
            <ArrowRight size={17} />
          </button>
          <Link
            className="button button-ghost cancel-button"
            to={editing ? `/products/${id}` : '/products'}
          >
            Cancel
          </Link>
        </aside>
      </form>
    </div>
  );
}
