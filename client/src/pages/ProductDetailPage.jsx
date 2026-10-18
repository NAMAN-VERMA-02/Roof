import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Download,
  Edit3,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { formatDate } from '../lib/dates';
import { EmptyState, Loading, Notice, StatusBadge } from '../components/UI';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [noticeType, setNoticeType] = useState(location.state?.noticeType || 'success');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', address: '', website: '' });
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  async function load() {
    const [p, r, c] = await Promise.all([
      api(`/products/${id}`),
      api(`/products/${id}/receipts`),
      api(`/products/${id}/service-centers`),
    ]);
    setProduct(p.product);
    setReceipts(r.receipts);
    setContacts(c.contacts);
  }
  useEffect(() => {
    load()
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [id]);
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      await api(`/products/${id}/receipts`, { method: 'POST', body: data });
      await load();
      setNotice('Receipt uploaded and stored privately.');
      setNoticeType('success');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setUploadBusy(false);
      event.target.value = '';
    }
  }
  async function deleteReceipt(receiptId) {
    if (!window.confirm('Delete this receipt permanently?')) return;
    try {
      await api(`/receipts/${receiptId}`, { method: 'DELETE' });
      setReceipts((v) => v.filter((r) => r.id !== receiptId));
      setNotice('Receipt deleted.');
      setNoticeType('success');
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  async function deleteContact(contactId) {
    if (!window.confirm('Remove this service contact?')) return;
    try {
      await api(`/service-centers/${contactId}`, { method: 'DELETE' });
      setContacts((v) => v.filter((c) => c.id !== contactId));
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  function openNewContact() {
    setEditingContactId(null);
    setContactForm({ name: '', phone: '', address: '', website: '' });
    setContactOpen(true);
  }
  function openEditContact(contact) {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name,
      phone: contact.phone || '',
      address: contact.address || '',
      website: contact.website || '',
    });
    setContactOpen(true);
  }
  function closeContactForm() {
    setContactOpen(false);
    setEditingContactId(null);
  }
  async function saveContact(event) {
    event.preventDefault();
    setContactBusy(true);
    setError('');
    try {
      const data = await api(
        editingContactId
          ? `/service-centers/${editingContactId}`
          : `/products/${id}/service-centers`,
        {
          method: editingContactId ? 'PATCH' : 'POST',
          body: contactForm,
        },
      );
      setContacts((v) =>
        editingContactId
          ? v.map((contact) => (contact.id === editingContactId ? data.contact : contact))
          : [data.contact, ...v],
      );
      setContactForm({ name: '', phone: '', address: '', website: '' });
      closeContactForm();
      setNotice(editingContactId ? 'Service contact updated.' : 'Service contact added.');
      setNoticeType('success');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setContactBusy(false);
    }
  }
  async function deleteProduct() {
    if (
      !window.confirm(
        `Delete ${product.name} and all its receipts and contacts? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      navigate('/products');
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  if (loading) return <Loading />;
  if (!product)
    return (
      <div className="page-stack">
        <Link to="/products" className="back-link">
          <ArrowLeft size={17} /> Back to products
        </Link>
        <Notice type="error">{error || 'Product not found.'}</Notice>
      </div>
    );
  return (
    <div className="page-stack">
      <div className="page-heading detail-heading">
        <div>
          <Link to="/products" className="back-link">
            <ArrowLeft size={17} /> Back to products
          </Link>
          <div className="eyebrow">PRODUCT DETAILS</div>
          <h1>{product.name}</h1>
          <p>
            {product.brand}
            {product.model ? ` · ${product.model}` : ''}
          </p>
        </div>
        <div className="heading-actions">
          <Link to={`/products/${id}/edit`} className="button button-secondary">
            <Edit3 size={17} /> Edit product
          </Link>
          <button className="button button-danger-soft" onClick={deleteProduct}>
            <Trash2 size={17} /> Delete
          </button>
        </div>
      </div>
      {notice && (
        <Notice type={noticeType} onClose={() => setNotice('')}>
          {notice}
        </Notice>
      )}
      {error && (
        <Notice type="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel coverage-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">COVERAGE</div>
                <h2>Warranty overview</h2>
              </div>
              <StatusBadge status={product.status} />
            </div>
            <div className="coverage-dates">
              <div>
                <span>Purchased on</span>
                <strong>{formatDate(product.purchaseDate)}</strong>
              </div>
              <div>
                <span>Warranty starts</span>
                <strong>{formatDate(product.warrantyStartDate)}</strong>
              </div>
              <div>
                <span>Coverage ends</span>
                <strong>{formatDate(product.warrantyEndDate)}</strong>
              </div>
            </div>
            <div className="coverage-foot">
              <ShieldCheck size={17} />{' '}
              {product.endDateSource === 'manual'
                ? 'End date entered from manufacturer terms.'
                : product.endDateSource === 'calculated'
                  ? 'End date calculated from start date and duration.'
                  : 'Add a duration or end date to complete warranty tracking.'}
            </div>
          </section>
          <section className="panel detail-section">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">YOUR FILES</div>
                <h2>
                  Receipts <span className="section-count">{receipts.length}</span>
                </h2>
              </div>
              <label className="button button-secondary upload-button">
                <UploadCloud size={17} /> {uploadBusy ? 'Uploading...' : 'Upload receipt'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={upload}
                  disabled={uploadBusy}
                />
              </label>
            </div>
            {receipts.length ? (
              <div className="receipt-list">
                {receipts.map((r) => (
                  <div className="receipt-row" key={r.id}>
                    <div className="file-icon">
                      <FileText size={20} />
                    </div>
                    <div className="receipt-info">
                      <strong>{r.originalName}</strong>
                      <span>
                        {Math.max(1, Math.round(r.size / 1024))} KB ·{' '}
                        {new Date(r.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <button
                      className="icon-action"
                      onClick={() => setPreview(r)}
                      title="Preview receipt"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                    <a
                      className="icon-action"
                      href={`/api/receipts/${r.id}/file?download=1`}
                      title="Download receipt"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      className="icon-action danger"
                      onClick={() => deleteReceipt(r.id)}
                      title="Delete receipt"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No receipts yet"
                text="Upload your invoice or receipt here so it is easy to find later."
              />
            )}
          </section>
          <section className="panel detail-section">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">HELP WHEN YOU NEED IT</div>
                <h2>
                  Service contacts <span className="section-count">{contacts.length}</span>
                </h2>
              </div>
              <button className="button button-secondary" onClick={openNewContact}>
                <Plus size={17} /> Add contact
              </button>
            </div>
            {contactOpen && (
              <form className="contact-form" onSubmit={saveContact}>
                <div className="contact-form-title">
                  {editingContactId ? 'Edit service contact' : 'New service contact'}
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>
                      Service center name <b>*</b>
                    </span>
                    <input
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                      minLength={2}
                      placeholder="e.g. Brand service center"
                    />
                  </label>
                  <label className="field">
                    <span>Phone</span>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="Contact number"
                    />
                  </label>
                  <label className="field">
                    <span>Address</span>
                    <input
                      value={contactForm.address}
                      onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                      placeholder="Location or address"
                    />
                  </label>
                  <label className="field">
                    <span>Website</span>
                    <input
                      type="url"
                      value={contactForm.website}
                      onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="button button-primary" disabled={contactBusy}>
                    {contactBusy ? 'Saving...' : editingContactId ? 'Save changes' : 'Save contact'}
                  </button>
                  <button type="button" className="button button-ghost" onClick={closeContactForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {contacts.length ? (
              <div className="contact-list">
                {contacts.map((c) => (
                  <div className="contact-card" key={c.id}>
                    <div className="contact-card-top">
                      <strong>{c.name}</strong>
                      <div className="contact-card-actions">
                        <button
                          className="icon-action"
                          title="Edit contact"
                          onClick={() => openEditContact(c)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="icon-action danger"
                          title="Remove contact"
                          onClick={() => deleteContact(c.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`}>
                        <Phone size={15} />
                        {c.phone}
                      </a>
                    )}
                    {c.address && (
                      <div>
                        <MapPin size={15} />
                        {c.address}
                      </div>
                    )}
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer">
                        <Globe2 size={15} />
                        Visit website <ArrowUpRight size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !contactOpen && (
                <EmptyState
                  icon={Phone}
                  title="No service contacts"
                  text="Add a support number or website for this product."
                />
              )
            )}
          </section>
        </div>
        <aside className="detail-aside">
          <div className="panel info-card">
            <div className="eyebrow">PRODUCT INFO</div>
            <InfoRow label="Brand" value={product.brand} />
            <InfoRow label="Model" value={product.model} />
            <InfoRow label="Category" value={product.category} />
            <InfoRow label="Serial number" value={product.serialNumber} />
            <InfoRow
              label="Warranty length"
              value={product.warrantyMonths ? `${product.warrantyMonths} months` : ''}
            />
            {product.terms && (
              <div className="info-block">
                <span>Warranty terms</span>
                <p>{product.terms}</p>
              </div>
            )}
            {product.notes && (
              <div className="info-block">
                <span>Your notes</span>
                <p>{product.notes}</p>
              </div>
            )}
          </div>
          <div className="aside-promo">
            <CalendarDays size={22} />
            <h3>Never miss a date</h3>
            <p>Roof can email you before this coverage runs out.</p>
            <Link to="/reminders">
              Reminder settings <ArrowUpRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
      {preview && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPreview(null)}>
          <div
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${preview.originalName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <strong>{preview.originalName}</strong>
              <div>
                <a href={`/api/receipts/${preview.id}/file?download=1`} title="Download">
                  <Download size={19} />
                </a>
                <button onClick={() => setPreview(null)} aria-label="Close">
                  <X size={21} />
                </button>
              </div>
            </div>
            <iframe
              title={`Receipt ${preview.originalName}`}
              src={`/api/receipts/${preview.id}/file`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value || 'Not added'}</strong>
    </div>
  );
}
