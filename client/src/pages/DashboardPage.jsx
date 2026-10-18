import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Archive,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { formatDate } from '../lib/dates';
import { EmptyState, Loading, Notice, StatusBadge } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/dashboard/summary')
      .then(setData)
      .catch((err) => setError(friendlyError(err)));
  }, []);
  const counts = data?.counts;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR HOME BASE</div>
          <h1>
            Good to see you, {user?.name?.split(' ')[0]} <span className="heading-wave">✦</span>
          </h1>
          <p>A clear view of what you own and what is coming up.</p>
        </div>
        <Link className="button button-primary" to="/products/new">
          <Plus size={18} /> Add product
        </Link>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="hero-card">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <ShieldCheck size={16} /> YOUR PURCHASE PEACE OF MIND
                </div>
                <h2>
                  Good things deserve
                  <br />a little <em>looking after.</em>
                </h2>
                <p>Keep every warranty, document and support contact in one reliable place.</p>
                <Link to="/products" className="hero-link">
                  Explore your products <ArrowRight size={17} />
                </Link>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="hero-ring ring-one" />
                <div className="hero-ring ring-two" />
                <div className="hero-ticket ticket-back">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="hero-ticket ticket-front">
                  <div className="ticket-check">
                    <CheckCircle2 size={27} />
                  </div>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="hero-art-spark spark-one">✦</div>
                <div className="hero-art-spark spark-two">✦</div>
              </div>
            </div>
            <div className="stats-grid">
              <Stat
                icon={Archive}
                label="Total products"
                value={counts.total}
                note="In your vault"
                tone="navy"
              />
              <Stat
                icon={ShieldCheck}
                label="Active warranties"
                value={counts.active}
                note="Safely covered"
                tone="blue"
              />
              <Stat
                icon={CalendarClock}
                label="Expiring soon"
                value={counts.expiring}
                note="Within 30 days"
                tone="amber"
              />
              <Stat
                icon={FileText}
                label="Documents saved"
                value={counts.documents}
                note="Ready when needed"
                tone="teal"
              />
            </div>
            <div className="dashboard-columns">
              <section className="panel upcoming-panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">STAY AHEAD</div>
                    <h2>Upcoming expiries</h2>
                  </div>
                  <Link to="/products?status=expiring" className="text-link">
                    View all <ArrowUpRight size={17} />
                  </Link>
                </div>
                {data.upcoming.length ? (
                  <div className="upcoming-list">
                    {data.upcoming.map((product) => (
                      <Link
                        className="upcoming-row"
                        to={`/products/${product.id}`}
                        key={product.id}
                      >
                        <div className="product-avatar">
                          <Archive size={20} />
                        </div>
                        <div className="upcoming-main">
                          <strong>{product.name}</strong>
                          <span>{product.brand}</span>
                        </div>
                        <div className="upcoming-date">
                          <strong>{formatDate(product.warrantyEndDate)}</strong>
                          <StatusBadge status={product.status} />
                        </div>
                        <ArrowRight size={18} className="row-arrow" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock3}
                    title="Nothing on the horizon"
                    text="Add a product to start tracking upcoming warranty dates."
                    action={
                      <Link to="/products/new" className="button button-secondary">
                        Add your first product
                      </Link>
                    }
                  />
                )}
              </section>
              <section className="panel guidance-panel">
                <div className="eyebrow">A LITTLE MORE ORGANIZED</div>
                <h2>Make the most of Roof</h2>
                <div className="guidance-item">
                  <span>
                    <FileText size={19} />
                  </span>
                  <div>
                    <strong>Keep the proof</strong>
                    <p>
                      Save bills and warranty cards so proof is always easy to find when you need
                      service.
                    </p>
                  </div>
                </div>
                <div className="guidance-item">
                  <span>
                    <BellRing size={19} />
                  </span>
                  <div>
                    <strong>Set your reminders</strong>
                    <p>Choose when an email should reach you before coverage ends.</p>
                  </div>
                </div>
                <Link to="/documents" className="guidance-link">
                  Open document vault <ArrowRight size={16} />
                </Link>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={21} />
      </div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
