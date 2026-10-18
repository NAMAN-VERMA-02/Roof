import { useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  Save,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { api, friendlyError } from '../lib/api';
import { Loading, Notice } from '../components/UI';
import { formatDate } from '../lib/dates';

const choices = [30, 14, 7, 3, 1, 0];
export default function RemindersPage() {
  const [preferences, setPreferences] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    Promise.all([api('/reminder-preferences'), api('/reminders/history')])
      .then(([p, h]) => {
        setPreferences(p.preferences);
        setJobs(h.jobs);
      })
      .catch((err) => setError(friendlyError(err)));
  }, []);
  function toggleOffset(day) {
    setPreferences((v) => ({
      ...v,
      offsetsDays: v.offsetsDays.includes(day)
        ? v.offsetsDays.filter((x) => x !== day)
        : [...v.offsetsDays, day].sort((a, b) => b - a),
    }));
  }
  async function save() {
    if (!preferences.offsetsDays.length) {
      setError('Choose at least one reminder time.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api('/reminder-preferences', { method: 'PUT', body: preferences });
      setPreferences(data.preferences);
      const h = await api('/reminders/history');
      setJobs(h.jobs);
      setNotice('Reminder preferences saved.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">AHEAD OF THE DATE</div>
          <h1>Reminders</h1>
          <p>A thoughtful nudge before a warranty ends.</p>
        </div>
      </div>
      {error && (
        <Notice type="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}
      {!preferences ? (
        !error && <Loading />
      ) : (
        <div className="reminders-grid">
          <div className="reminders-main">
            <div className="reminder-banner">
              <div className="reminder-banner-icon">
                <BellRing size={29} />
              </div>
              <div>
                <div className="eyebrow light">STAY IN THE KNOW</div>
                <h2>
                  Never let coverage
                  <br />
                  slip away quietly.
                </h2>
                <p>We'll send a simple email when a warranty is nearing its end.</p>
              </div>
            </div>
            <section className="panel reminder-settings">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">YOUR PREFERENCES</div>
                  <h2>Email reminders</h2>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.enabled}
                    onChange={(e) => setPreferences({ ...preferences, enabled: e.target.checked })}
                  />
                  <span className="switch-track" />
                  <span className="switch-label">{preferences.enabled ? 'On' : 'Off'}</span>
                </label>
              </div>
              <p className="settings-intro">
                Choose when Roof should email you before each warranty expires.
              </p>
              <div className={`offset-options ${!preferences.enabled ? 'disabled' : ''}`}>
                {choices.map((day) => (
                  <button
                    type="button"
                    key={day}
                    className={`offset-chip ${preferences.offsetsDays.includes(day) ? 'chosen' : ''}`}
                    disabled={!preferences.enabled}
                    onClick={() => toggleOffset(day)}
                  >
                    {preferences.offsetsDays.includes(day) && <CheckCircle2 size={17} />}
                    {day === 0 ? 'On expiry day' : `${day} day${day === 1 ? '' : 's'} before`}
                  </button>
                ))}
              </div>
              <div className="settings-foot">
                <div>
                  <ShieldCheck size={18} />
                  <span>Only products with a warranty end date can receive reminders.</span>
                </div>
                <button className="button button-primary" disabled={busy} onClick={save}>
                  <Save size={17} /> {busy ? 'Saving...' : 'Save preferences'}
                </button>
              </div>
            </section>
            <section className="panel history-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">WHAT'S COMING</div>
                  <h2>Reminder activity</h2>
                </div>
                <span className="history-count">{jobs.length} items</span>
              </div>
              {jobs.length ? (
                <div className="history-list">
                  {jobs.map((job) => (
                    <div className="history-row" key={job.id}>
                      <div className={`history-icon history-${job.status}`}>
                        {job.status === 'sent' ? (
                          <Send size={18} />
                        ) : job.status === 'failed' ? (
                          <TriangleAlert size={18} />
                        ) : (
                          <Clock3 size={18} />
                        )}
                      </div>
                      <div className="history-main">
                        <strong>{job.productId?.name || 'Removed product'}</strong>
                        <span>
                          {job.offsetDays === 0
                            ? 'Expiry day'
                            : `${job.offsetDays} day${job.offsetDays === 1 ? '' : 's'} before expiry`}{' '}
                          · {formatDate(job.warrantyEndDate)}
                        </span>
                        {job.lastError && <small>{job.lastError}</small>}
                      </div>
                      <span className={`history-state history-state-${job.status}`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="history-empty">
                  <Mail size={24} />
                  <strong>No reminders scheduled yet</strong>
                  <span>Add a product with a warranty date to see activity here.</span>
                </div>
              )}
            </section>
          </div>
          <aside className="reminders-aside">
            <div className="panel how-card">
              <div className="eyebrow">HOW IT WORKS</div>
              <div className="how-step">
                <span>01</span>
                <div>
                  <strong>Add a warranty date</strong>
                  <p>Save the product and when its coverage ends.</p>
                </div>
              </div>
              <div className="how-step">
                <span>02</span>
                <div>
                  <strong>Choose your timing</strong>
                  <p>Pick one or more days before expiry.</p>
                </div>
              </div>
              <div className="how-step">
                <span>03</span>
                <div>
                  <strong>Get an email</strong>
                  <p>Roof sends a reminder to your account email.</p>
                </div>
              </div>
            </div>
            <div className="aside-note">
              <Mail size={19} />
              <p>
                Delivery needs an email provider configured on the server. Your reminder history
                shows failed attempts so nothing is silently marked as sent.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
