import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { auth, call } from './firebase';

type Tab = 'overview' | 'verification' | 'reports' | 'users' | 'settings';

type Overview = {
  users: number;
  signups7d: number;
  activeMatches: number;
  pendingVerifications: number;
  openReports: number;
  dailyLikeLimit: number;
};

type VerificationItem = {
  id: string;
  uid: string;
  code: string;
  action: string;
  status: string;
  firstName: string;
  birthDate: string | null;
  photos: string[];
  videoUrl: string | null;
  ageHours: number | null;
  warning: boolean;
  overdue: boolean;
};

type ReportItem = {
  id: string;
  reporterName: string;
  targetName: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
};

type UserItem = {
  uid: string;
  firstName: string;
  phoneNumber: string | null;
  status: string;
  verified: boolean;
  premium: boolean;
};

const REJECT_OPTIONS = [
  { value: 'face_not_clear', label: 'Face not clear' },
  { value: 'does_not_match_photos', label: 'Doesn’t match photos' },
  { value: 'code_or_action_missing', label: 'Code/action missing' },
  { value: 'appears_under_18', label: 'Appears under 18' },
  { value: 'other', label: 'Other' },
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setReady(true);
  }), []);

  if (!ready) return <div className="app">Loading…</div>;
  if (!user) return <Login onError={setError} error={error} />;

  return (
    <div className="app">
      <div className="header">
        <h1>VOYC Admin</h1>
        <div className="row">
          <span className="muted">{user.email}</span>
          <button className="btn secondary" type="button" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>
      <div className="tabs">
        {(
          [
            ['overview', 'Overview'],
            ['verification', 'Verification'],
            ['reports', 'Reports'],
            ['users', 'Users'],
            ['settings', 'Settings'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' ? <OverviewPanel /> : null}
      {tab === 'verification' ? <VerificationPanel /> : null}
      {tab === 'reports' ? <ReportsPanel /> : null}
      {tab === 'users' ? <UsersPanel /> : null}
      {tab === 'settings' ? <SettingsPanel /> : null}
    </div>
  );
}

function Login({ error, onError }: { error: string; onError: (v: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      onError('Sign-in failed. Use an admin email/password account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card login stack" onSubmit={submit}>
      <h1 style={{ margin: 0, color: 'var(--plum)' }}>VOYC Admin</h1>
      <p className="muted">Sign in with an account listed in `admins/`. Run `make-admin.mjs` after creating the Auth user.</p>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="error">{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function OverviewPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    call<Record<string, never>, Overview>('adminGetOverview')({})
      .then((res) => setData(res.data))
      .catch(() => setError('Couldn’t load overview. Are you an admin?'));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading overview…</p>;

  return (
    <div className="grid">
      <div className="stat">
        <strong>{data.users}</strong>
        <span className="muted">Users</span>
      </div>
      <div className="stat">
        <strong>{data.signups7d}</strong>
        <span className="muted">Sign-ups (7d)</span>
      </div>
      <div className="stat">
        <strong>{data.activeMatches}</strong>
        <span className="muted">Active matches</span>
      </div>
      <div className="stat">
        <strong>{data.pendingVerifications}</strong>
        <span className="muted">Pending verification</span>
      </div>
      <div className="stat">
        <strong>{data.openReports}</strong>
        <span className="muted">Open reports</span>
      </div>
      <div className="stat">
        <strong>{data.dailyLikeLimit}</strong>
        <span className="muted">Daily like limit</span>
      </div>
    </div>
  );
}

function VerificationPanel() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    call<{ status?: string }, { items: VerificationItem[] }>('adminListVerifications')({ status: 'pending' })
      .then((res) => setItems(res.data.items))
      .catch(() => setError('Couldn’t load verification queue.'));

  useEffect(() => {
    void load();
  }, []);

  const decide = async (id: string, decision: 'approved' | 'rejected', reason?: string) => {
    setBusyId(id);
    try {
      await call('adminDecideVerification')({ id, decision, reason });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert('Decision failed');
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="stack">
      <div className="row">
        <button className="btn secondary" type="button" onClick={() => void load()}>
          Refresh
        </button>
        <span className="muted">{items.length} pending</span>
      </div>
      {items.length === 0 ? <p className="muted">Queue is clear.</p> : null}
      {items.map((item) => (
        <div key={item.id} className="card stack">
          <div className="row">
            <strong>
              {item.firstName}
              {item.birthDate ? ` · ${item.birthDate}` : ''}
            </strong>
            {item.overdue ? <span className="badge overdue">Overdue &gt;48h</span> : null}
            {item.warning && !item.overdue ? <span className="badge warn">&gt;24h</span> : null}
            <span className="muted">Code {item.code}</span>
          </div>
          <p className="muted">{item.action}</p>
          <div className="photos">
            {item.photos.map((url) => (
              <img key={url} src={url} alt="" />
            ))}
          </div>
          {item.videoUrl ? <video className="video" src={item.videoUrl} controls playsInline /> : <p className="error">Video unavailable</p>}
          <div className="row">
            <button className="btn" type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, 'approved')}>
              Approve
            </button>
            {REJECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="btn danger"
                type="button"
                disabled={busyId === item.id}
                onClick={() => void decide(item.id, 'rejected', opt.value)}>
                Reject: {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsPanel() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [error, setError] = useState('');

  const load = () =>
    call<{ status?: string }, { items: ReportItem[] }>('adminListReports')({ status: 'open' })
      .then((res) => setItems(res.data.items))
      .catch(() => setError('Couldn’t load reports.'));

  useEffect(() => {
    void load();
  }, []);

  const resolve = async (id: string) => {
    await call('adminResolveReport')({ id, resolution: 'dismissed' });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="stack">
      <button className="btn secondary" type="button" onClick={() => void load()}>
        Refresh
      </button>
      {items.length === 0 ? <p className="muted">No open reports.</p> : null}
      {items.map((item) => (
        <div key={item.id} className="card stack">
          <strong>
            {item.reporterName} → {item.targetName}
          </strong>
          <span className="badge">{item.reason}</span>
          {item.details ? <p>{item.details}</p> : null}
          <div className="row">
            <button className="btn secondary" type="button" onClick={() => void resolve(item.id)}>
              Dismiss
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={async () => {
                await call('adminSetUserStatus')({ uid: item.targetId, status: 'suspended' });
                await resolve(item.id);
              }}>
              Suspend target
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersPanel() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<UserItem[]>([]);
  const [error, setError] = useState('');

  const search = async () => {
    setError('');
    try {
      const res = await call<{ q: string }, { items: UserItem[] }>('adminSearchUsers')({ q });
      setItems(res.data.items);
    } catch {
      setError('Search failed');
    }
  };

  return (
    <div className="stack">
      <div className="row">
        <input placeholder="Name, +phone, or uid" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" type="button" onClick={() => void search()}>
          Search
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {items.map((item) => (
        <div key={item.uid} className="card row" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>
              {item.firstName} {item.verified ? '✓' : ''}
            </strong>
            <div className="muted">
              {item.phoneNumber ?? 'no phone'} · {item.status}
              {item.premium ? ' · premium' : ''}
            </div>
            <div className="muted">{item.uid}</div>
          </div>
          <div className="row">
            <button className="btn secondary" type="button" onClick={() => void call('adminSetUserStatus')({ uid: item.uid, status: 'active' })}>
              Activate
            </button>
            <button className="btn danger" type="button" onClick={() => void call('adminSetUserStatus')({ uid: item.uid, status: 'suspended' })}>
              Suspend
            </button>
            <button className="btn secondary" type="button" onClick={() => void call('adminRevokeVerification')({ uid: item.uid })}>
              Revoke verify
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel() {
  const [dailyLikes, setDailyLikes] = useState(25);
  const [message, setMessage] = useState('');

  useEffect(() => {
    call<Record<string, never>, { dailyLikes: number }>('adminGetSettings')({})
      .then((res) => setDailyLikes(res.data.dailyLikes))
      .catch(() => setMessage('Couldn’t load settings'));
  }, []);

  const save = async () => {
    try {
      const res = await call<{ dailyLikes: number }, { dailyLikes: number }>('adminUpdateSettings')({ dailyLikes });
      setDailyLikes(res.data.dailyLikes);
      setMessage('Saved');
    } catch {
      setMessage('Save failed');
    }
  };

  return (
    <div className="card stack">
      <label>
        Free daily like limit
        <div className="row" style={{ marginTop: 8 }}>
          <input type="number" min={1} max={500} value={dailyLikes} onChange={(e) => setDailyLikes(Number(e.target.value))} />
          <button className="btn" type="button" onClick={() => void save()}>
            Save
          </button>
        </div>
      </label>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
