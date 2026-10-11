import { useEffect, useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, Bell, Check,
  ChevronDown, CircleDollarSign, Clock3, CreditCard, FileSearch,
  LayoutDashboard, LogOut, Menu, RefreshCw, Search, Settings, ShieldCheck,
  SlidersHorizontal, Sparkles, X, TrendingUp, Globe, CreditCard as CardIcon,
  Smartphone, Building2, Zap, Ban, Eye,
} from 'lucide-react';
import './App.css';
import { useAuth } from './context/AuthContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const PAYMENTS_API_URL = `${API_BASE_URL}/api/dashboard/payments`;
const PAYMENTS_RESET_API_URL = PAYMENTS_API_URL;
const BENCHMARK_API_URL = `${API_BASE_URL}/api/evaluation/benchmark`;

/* ═══════════════════════════════════════════════════════════════════════
   ROOT DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, logout, authHeaders } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeView, setActiveView] = useState('Overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [benchmark, setBenchmark] = useState(null);

  /* ── Data fetching ── */
  const fetchTransactions = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(PAYMENTS_API_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTransactions(await res.json());
      setIsOffline(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setIsOffline(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchBenchmark = async () => {
    try {
      const res = await fetch(BENCHMARK_API_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBenchmark(await res.json());
    } catch (err) {
      console.error('Benchmark error:', err);
      setBenchmark(null);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchBenchmark();
    const interval = setInterval(() => {
      fetchTransactions();
      fetchBenchmark();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Derived data ── */
  const flaggedTx  = useMemo(() => transactions.filter(tx => ['CRITICAL', 'HIGH', 'MEDIUM'].includes(tx.riskLevel)), [transactions]);
  const captured   = useMemo(() => transactions.filter(tx => ['captured', 'approved'].includes(tx.status)).length, [transactions]);
  const failed     = useMemo(() => transactions.filter(tx => tx.status === 'failed').length, [transactions]);
  const totalVol   = useMemo(() => sumPaise(transactions), [transactions]);
  const processedVol = useMemo(() => sumPaise(transactions.filter(tx => ['captured', 'approved'].includes(tx.status))), [transactions]);
  const approvalPct = transactions.length ? Math.round((captured / transactions.length) * 100) : 0;

  /* ── Metric cards ── */
  const metrics = [
    { label: 'Gross volume',    value: formatCurrency(totalVol),           change: transactions.length ? 'Live' : 'No data', note: 'current payment volume', icon: CircleDollarSign, tone: 'mint'  },
    { label: 'Transactions',    value: transactions.length.toLocaleString(), change: transactions.length ? 'Live' : 'No data', note: 'current payment count', icon: Activity,         tone: 'blue'  },
    { label: 'Approval rate',   value: `${approvalPct}%`,                  change: transactions.length ? 'Calculated' : 'No data', note: 'captured and approved payments', icon: ShieldCheck,      tone: 'amber' },
    { label: 'Review queue',    value: flaggedTx.length.toLocaleString(),   change: flaggedTx.length ? 'Needs attention' : 'All clear',
                                                                            note: `${failed} failed payments`,       icon: AlertTriangle,        tone: 'coral' },
  ];

  /* ── Nav items ── */
  const navItems = [
    { label: 'Overview',      icon: LayoutDashboard },
    { label: 'Transactions',  icon: CreditCard, count: transactions.length },
    { label: 'Review queue',  icon: FileSearch, count: flaggedTx.length, alert: flaggedTx.length > 0 },
    { label: 'Analytics',     icon: BarChart3 },
  ];

  const selectView = (view) => { setActiveView(view); setMobileNavOpen(false); };
  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };

  const resetDashboard = async () => {
    if (!window.confirm('Reset the dashboard? This permanently deletes all payment, risk, and AI investigation data.')) return;
    try {
      const response = await fetch(PAYMENTS_RESET_API_URL, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setTransactions([]);
      setSelectedTx(null);
      showNotice('Dashboard reset successfully');
    } catch (err) {
      console.error('Reset error:', err);
      showNotice('Could not reset the dashboard');
    }
  };

  const handleDecision = async (tx, action) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Block'} payment ${tx.paymentId}? This action will be recorded in the audit history.`)) return;
    try {
      const response = await fetch(`${PAYMENTS_API_URL.replace('/payments', '')}/payments/${encodeURIComponent(tx.paymentId)}/decision`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated = await response.json();
      setTransactions(current => current.map(payment => payment.paymentId === updated.paymentId ? updated : payment));
      setSelectedTx(null);
      showNotice(`Payment ${tx.paymentId} ${action === 'approve' ? 'approved' : 'blocked'} by ${user?.email || 'analyst'}`);
    } catch (err) {
      console.error('Decision error:', err);
      showNotice(`Could not ${action} payment ${tx.paymentId}`);
    }
  };
  const handleApprove = (tx) => {
    handleDecision(tx, 'approve');
  };
  const handleBlock = (tx) => {
    handleDecision(tx, 'block');
  };

  /* ── Current view renderer ── */
  const renderView = () => {
    switch (activeView) {
      case 'Transactions':
        return <TransactionsView transactions={transactions} onSelect={setSelectedTx} />;
      case 'Analytics':
        return <AnalyticsView transactions={transactions} processedVolume={processedVol} captured={captured} failed={failed} benchmark={benchmark} />;
      case 'Review queue':
        return <ReviewQueueView flaggedTx={flaggedTx} onSelect={setSelectedTx} onApprove={handleApprove} onBlock={handleBlock} onNavigate={selectView} />;
      case 'Settings':
        return <SettingsPanel notificationsEnabled={notificationsEnabled} onToggleNotifications={() => setNotificationsEnabled(p => !p)} onReset={resetDashboard} />;
      default:
        return (
          <OverviewView
            metrics={metrics}
            transactions={transactions}
            totalVol={totalVol}
            processedVol={processedVol}
            captured={captured}
            flaggedTx={flaggedTx}
            failed={failed}
            onSelectTx={setSelectedTx}
            onNavigate={selectView}
            onRunReview={() => {
              selectView('Review queue');
              showNotice(`${flaggedTx.length} transaction${flaggedTx.length !== 1 ? 's' : ''} ready for review`);
            }}
          />
        );
    }
  };

  /* ── Page heading per view ── */
  const displayName = user?.fullName?.split(' ')[0] || 'Analyst';
  const heading = {
    Overview:     { title: `Good ${timeOfDay()}, ${displayName}`, sub: 'Here is what is happening across your payment operation.' },
    Transactions: { title: 'Transactions', sub: 'Full live payment history from your storefront.' },
    Analytics:    { title: 'Analytics', sub: 'A foundation for deeper fraud and revenue reporting.' },
    'Review queue': { title: 'Review Queue', sub: 'Transactions flagged by Sentinel Risk Model v1 that need your attention.' },
    Settings:     { title: 'Settings', sub: 'Manage how Sentinel connects to your payment operation.' },
  }[activeView] || {};

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><ShieldCheck size={18} /></span>
          <span>sentinel</span>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">{user?.fullName?.[0]?.toUpperCase() || 'A'}</span>
          <span>
            <strong>{user?.fullName || 'Analyst'}</strong>
            <small>{user?.email || 'Sentinel workspace'}</small>
          </span>
          <ChevronDown size={14} />
        </div>

        <nav className="primary-nav">
          <span className="nav-label">Workspace</span>
          {navItems.map(({ label, icon: Icon, count, alert }) => (
            <button
              key={label}
              className={`nav-item ${activeView === label ? 'active' : ''}`}
              onClick={() => selectView(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {count > 0 && <em className={alert ? 'badge-alert' : ''}>{count}</em>}
            </button>
          ))}
          <span className="nav-label nav-label-spaced">Manage</span>
          <button
            className={`nav-item ${activeView === 'Settings' ? 'active' : ''}`}
            onClick={() => selectView('Settings')}
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="live-indicator"><span /> All systems operational</div>
          <div className="version">Sentinel v0.1 · {user?.role || 'ANALYST'}</div>
          <button
            className="signout-button"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(p => !p)} aria-label="Toggle navigation">
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{activeView}</strong>
          </div>
          <div className="topbar-actions">
            <div className="connection-pill"><span /> Live sync</div>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={17} />
              {flaggedTx.length > 0 && <i />}
            </button>
            <div className="user-avatar" aria-label={user?.fullName || 'User'} title={user?.email}>{user?.fullName?.[0]?.toUpperCase() || 'A'}</div>
          </div>
        </header>

        <div className="page-content">
          {/* Page heading */}
          <section className="page-heading">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <h1>{heading.title}</h1>
              <p className="page-subtitle">{heading.sub}</p>
            </div>
            <div className="heading-actions">
              <a
                href="/checkout.html"
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-button"
                style={{ textDecoration: 'none' }}
                title="Open Customer Checkout Simulator"
              >
                <CreditCard size={15} />
                Checkout Store
              </a>
              <button className="secondary-button" onClick={fetchTransactions}>
                <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
                Refresh
              </button>
              {activeView === 'Overview' && (
                <button className="primary-button" onClick={() => {
                  selectView('Review queue');
                  showNotice(`${flaggedTx.length} transaction${flaggedTx.length !== 1 ? 's' : ''} ready for review`);
                }}>
                  <Sparkles size={15} />
                  Run review
                </button>
              )}
            </div>
          </section>

          {/* View content */}
          {isLoading ? <LoadingState /> : isOffline && transactions.length === 0 ? <OfflineState onRetry={fetchTransactions} /> : renderView()}
        </div>
      </main>

      {/* Transaction drawer */}
      {selectedTx && (
        <TransactionDrawer
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onApprove={() => handleApprove(selectedTx)}
          onBlock={() => handleBlock(selectedTx)}
        />
      )}

      {/* Toast */}
      {notice && (
        <button className="toast" onClick={() => setNotice('')}>
          {notice} <X size={13} />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEW: OVERVIEW
   ═══════════════════════════════════════════════════════════════════════ */
function OverviewView({ metrics, transactions, totalVol, processedVol, captured, flaggedTx, failed, onSelectTx, onNavigate }) {
  const chartBars = useMemo(() => buildChartBars(transactions.filter(tx => tx.status === 'captured')), [transactions]);
  const criticalHigh = flaggedTx.filter(tx => ['CRITICAL', 'HIGH'].includes(tx.riskLevel)).length;
  const medium       = flaggedTx.filter(tx => tx.riskLevel === 'MEDIUM').length;
  const recentTx     = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <>
      {/* Metric cards */}
      <section className="metric-grid">
        {metrics.map(({ label, value, change, note, icon: Icon, tone }) => (
          <MetricCard key={label} label={label} value={value} change={change} note={note} icon={Icon} tone={tone} />
        ))}
      </section>

      {/* Chart + Queue summary */}
      <section className="dashboard-grid">
        {/* Performance chart */}
        <div className="panel chart-panel">
          <PanelHeader
            title="Payment performance"
            subtitle="Volume activity — last 7 days"
            action="View transactions"
            onAction={() => onNavigate('Transactions')}
          />
          <div className="chart-summary">
            <div>
              <span>Processed volume</span>
              <strong>{formatCurrency(processedVol)}</strong>
            </div>
            <div className="chart-stat">
              <ArrowUpRight size={14} />
              <span>{captured} captured payments</span>
            </div>
          </div>
          <PerformanceChart bars={chartBars} />
        </div>

        {/* Review queue summary */}
        <div className="panel queue-panel">
          <PanelHeader
            title="Review queue"
            subtitle="Transactions needing attention"
            action="View all"
            onAction={() => onNavigate('Review queue')}
          />
          <div className="queue-score">
            <div className={`score-ring ${flaggedTx.length === 0 ? 'all-clear' : ''}`}>
              <strong>{flaggedTx.length}</strong>
              <span>open cases</span>
            </div>
            <div>
              <strong className="queue-health">{flaggedTx.length ? 'Action recommended' : 'Looking good'}</strong>
              <p>Review risk signals before fulfillment.</p>
            </div>
          </div>
          <div className="queue-breakdown">
            <span>
              <i className="dot dot-coral" />
              Critical / High
              <b>{criticalHigh}</b>
            </span>
            <span>
              <i className="dot dot-amber" />
              Medium risk
              <b>{medium}</b>
            </span>
            <span>
              <i className="dot dot-green" />
              Failed payments
              <b>{failed}</b>
            </span>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="panel recent-tx-panel">
        <div className="panel-header" style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <h2>Recent transactions</h2>
            <p>Latest payment activity from your storefront</p>
          </div>
          <button className="panel-action" onClick={() => onNavigate('Transactions')}>
            View all <ArrowUpRight size={13} />
          </button>
        </div>
        <TransactionTable transactions={recentTx} onSelect={onSelectTx} compact />
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEW: TRANSACTIONS
   ═══════════════════════════════════════════════════════════════════════ */
function TransactionsView({ transactions, onSelect }) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter]   = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(tx => {
      const matchSearch = !q || [tx.paymentId, tx.customerId, tx.status, tx.riskLevel, tx.paymentMethod]
        .some(v => String(v || '').toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchRisk   = riskFilter   === 'all' || tx.riskLevel === riskFilter;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [transactions, search, statusFilter, riskFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [filtered]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleTransactions = sorted.slice((page - 1) * pageSize, page * pageSize);
  const hasActiveFilters = statusFilter !== 'all' || riskFilter !== 'all' || search !== '';

  return (
    <section className="transactions-panel panel">
      <div className="table-heading">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PanelHeader title="All transactions" subtitle={`Showing ${sorted.length} of ${transactions.length} payments`} />
        </div>
        <div className="table-actions">
          <div className="table-tools">
            {/* Search */}
            <div className="search-box">
              <Search size={15} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by ID, customer, method…"
              />
              {search && (
                <button style={{ background: 'none', border: 'none', color: '#a4adba', padding: 0 }} onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              className={`filter-button ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(p => !p)}
            >
              <SlidersHorizontal size={14} /> Filters {hasActiveFilters && '·'}
            </button>
          </div>

          <button className="secondary-button" onClick={() => exportTransactions(sorted)}>
            <ArrowUpRight size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)', background: '#fafbfc', flexWrap: 'wrap' }}>
          <select className="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="captured">Captured</option>
            <option value="approved">Approved</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
          <select className="risk-filter" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            <option value="all">All risk levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          {hasActiveFilters && (
            <button
              className="filter-button"
              onClick={() => { setSearch(''); setStatusFilter('all'); setRiskFilter('all'); setPage(1); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <TransactionTable transactions={visibleTransactions} onSelect={onSelect} />
      <div className="pagination-controls">
        <span>Page {page} of {pageCount}</span>
        <button className="filter-button" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Previous</button>
        <button className="filter-button" disabled={page === pageCount} onClick={() => setPage(current => current + 1)}>Next</button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEW: ANALYTICS
   ═══════════════════════════════════════════════════════════════════════ */
function AnalyticsView({ transactions, processedVolume, captured, failed, benchmark }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const analyticsTransactions = useMemo(() => transactions.filter(tx => {
    const date = tx.createdAt ? tx.createdAt.slice(0, 10) : '';
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }), [transactions, fromDate, toDate]);
  const riskCounts = useMemo(() => {
    const c = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    analyticsTransactions.forEach(tx => { if (tx.riskLevel && c[tx.riskLevel] !== undefined) c[tx.riskLevel]++; });
    return c;
  }, [analyticsTransactions]);

  const methodCounts = useMemo(() => {
    const c = {};
    analyticsTransactions.forEach(tx => {
      const m = tx.paymentMethod || 'card';
      c[m] = (c[m] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [analyticsTransactions]);

  const internationalCount = analyticsTransactions.filter(tx => tx.international).length;
  const riskCovered = analyticsTransactions.filter(tx => tx.riskLevel).length;
  const flagged = analyticsTransactions.filter(tx => ['MEDIUM', 'HIGH', 'CRITICAL'].includes(tx.riskLevel));
  const atRiskVolume = useMemo(() => sumPaise(flagged), [flagged]);
  const activityBars = useMemo(() => buildOutcomeBars(analyticsTransactions), [analyticsTransactions]);
  const total = analyticsTransactions.length;
  const filteredProcessedVolume = sumPaise(analyticsTransactions.filter(tx => ['captured', 'approved'].includes(tx.status)));
  const filteredCaptured = analyticsTransactions.filter(tx => ['captured', 'approved'].includes(tx.status)).length;
  const filteredFailed = analyticsTransactions.filter(tx => tx.status === 'failed').length;

  const methodIcon = (m) => {
    const lm = String(m).toLowerCase();
    if (lm.includes('card'))   return <CardIcon size={15} />;
    if (lm.includes('upi'))    return <Smartphone size={15} />;
    if (lm.includes('net'))    return <Building2 size={15} />;
    if (lm.includes('wallet')) return <Zap size={15} />;
    return <CircleDollarSign size={15} />;
  };

  return (
    <div className="analytics-layout">
      <div className="analytics-filters">
        <span>Date range</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} aria-label="Analytics start date" />
        <span>to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} aria-label="Analytics end date" />
        {(fromDate || toDate) && <button className="filter-button" onClick={() => { setFromDate(''); setToDate(''); }}>Clear</button>}
      </div>
      {/* Top stats */}
      <div className="analytics-top-grid">
        <div className="analytics-stat-card">
          <div className="stat-icon"><CircleDollarSign size={20} /></div>
          <span>Captured volume</span>
          <strong>{formatCurrency(filteredProcessedVolume)}</strong>
          <small>{filteredCaptured} successful payments recorded</small>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon"><ShieldCheck size={20} /></div>
          <span>Risk coverage</span>
          <strong>{total ? `${Math.round((riskCovered / total) * 100)}%` : '0%'}</strong>
          <small>Transactions scored by Sentinel Risk Engine</small>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon"><Globe size={20} /></div>
          <span>International transactions</span>
          <strong>{total ? `${Math.round((internationalCount / total) * 100)}%` : '0%'}</strong>
          <small>{internationalCount} cross-border payments detected</small>
        </div>
        <div className="analytics-stat-card risk-stat-card">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <span>At-risk volume</span>
          <strong>{formatCurrency(atRiskVolume)}</strong>
          <small>{flagged.length} transactions need attention</small>
        </div>
      </div>

      <div className="panel benchmark-panel">
        <PanelHeader
          title="Model Benchmark Performance"
          subtitle={benchmark?.status === 'READY' ? `${benchmark.dataset} · ${benchmark.samples} labeled transactions` : 'Live evaluation from labeled payments'}
        />
        {benchmark?.status === 'READY' ? (
          <>
            <div className="benchmark-metrics">
              <BenchmarkMetric label="Precision" value={benchmark.precision} />
              <BenchmarkMetric label="Recall" value={benchmark.recall} />
              <BenchmarkMetric label="F1 score" value={benchmark.f1Score} />
            </div>
            <div className="benchmark-footer">
              <span>TP {benchmark.truePositives}</span>
              <span>FP {benchmark.falsePositives}</span>
              <span>TN {benchmark.trueNegatives}</span>
              <span>FN {benchmark.falseNegatives}</span>
              <span>Estimated false-positive cost {formatCurrencyFromMajor(benchmark.estimatedFalsePositiveCost)}</span>
            </div>
          </>
        ) : benchmark?.status === 'NO_LABELED_PAYMENTS' ? (
          <p className="benchmark-empty">No labeled payments yet. Include <strong>is_fraud</strong>: true or false when sending test events.</p>
        ) : (
          <p className="benchmark-empty">Loading live benchmark results...</p>
        )}
      </div>

      <div className="panel activity-panel">
        <PanelHeader title="Payment activity" subtitle="Captured and failed volume across the last 7 days" />
        <div className="activity-legend">
          <span><i className="legend-dot captured-dot" />Captured</span>
          <span><i className="legend-dot failed-dot" />Failed</span>
        </div>
        <div className="activity-chart">
          <div className="activity-axis"><span>{formatCurrency(activityBars.maxTotal)}</span><span>{formatCurrency(activityBars.maxTotal / 2n)}</span><span>{formatCurrency(0n)}</span></div>
          <div className="activity-plot">
            <div className="activity-grid"><i /><i /><i /></div>
            <div className="activity-bars">
              {activityBars.days.map(day => (
                <div className="activity-day" key={day.label}>
                  <div className="activity-columns">
                    <div className="activity-bar captured-bar" style={{ height: `${day.capturedHeight}%` }} title={`Captured ${formatCurrency(day.captured)}`} />
                    <div className="activity-bar failed-bar" style={{ height: `${day.failedHeight}%` }} title={`Failed ${formatCurrency(day.failed)}`} />
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk breakdown + payment methods */}
      <div className="analytics-row">
        {/* Risk distribution */}
        <div className="panel risk-breakdown-panel">
          <PanelHeader title="Risk distribution" subtitle="Breakdown by risk level across all transactions" />
          <div className="risk-bars">
            {[
              { key: 'LOW',      label: 'Low risk',      fill: 'low',      color: 'var(--mint)'   },
              { key: 'MEDIUM',   label: 'Medium risk',   fill: 'medium',   color: 'var(--amber)'  },
              { key: 'HIGH',     label: 'High risk',     fill: 'high',     color: '#e07838'        },
              { key: 'CRITICAL', label: 'Critical risk', fill: 'critical', color: 'var(--coral)'  },
            ].map(({ key, label, fill }) => {
              const count = riskCounts[key] || 0;
              const pct   = total ? Math.round((count / total) * 100) : 0;
              return (
                <div className="risk-bar-row" key={key}>
                  <div className="risk-bar-label">
                    <span>{label}</span>
                    <b>{count} txns ({pct}%)</b>
                  </div>
                  <div className="risk-bar-track">
                    <div className={`risk-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment methods */}
        <div className="panel method-breakdown-panel">
          <PanelHeader title="Payment methods" subtitle="Volume share by method" />
          <div className="method-list">
            {methodCounts.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 16 }}>No payment data yet.</p>
            ) : (
              methodCounts.map(([method, count]) => (
                <div className="method-row" key={method}>
                  <span className="method-icon">{methodIcon(method)}</span>
                  <span className="method-name">{capitalize(method)}</span>
                  <span className="method-count">{count} txns</span>
                  <span className="method-pct">{total ? Math.round((count / total) * 100) : 0}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="analytics-row">
        <div className="panel">
          <PanelHeader title="Approval vs failure" subtitle="Payment outcome breakdown" />
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Captured payments', count: filteredCaptured, fill: 'low', pct: total ? Math.round((filteredCaptured / total) * 100) : 0 },
              { label: 'Failed payments',   count: filteredFailed,   fill: 'critical', pct: total ? Math.round((filteredFailed / total) * 100) : 0 },
            ].map(({ label, count, fill, pct }) => (
              <div className="risk-bar-row" key={label}>
                <div className="risk-bar-label">
                  <span>{label}</span>
                  <b>{count} ({pct}%)</b>
                </div>
                <div className="risk-bar-track">
                  <div className={`risk-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <PanelHeader title="Quick stats" subtitle="At-a-glance numbers" />
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total transactions',          value: total.toLocaleString()                                              },
              { label: 'Avg. transaction value',      value: total ? formatCurrency(processedVolume / BigInt(total)) : formatCurrency(0n)  },
              { label: 'Failed / total',              value: `${filteredFailed} / ${total}`                                  },
              { label: 'Flagged (MEDIUM+)',           value: analyticsTransactions.filter(t => ['MEDIUM','HIGH','CRITICAL'].includes(t.riskLevel)).length },
              { label: 'CRITICAL blocks',             value: analyticsTransactions.filter(t => t.suggestedAction === 'BLOCK').length     },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="future-note">
        <Sparkles size={18} />
        <div>
          <strong>Risk model active</strong>
          <p>Each transaction is scored in real time using amount, customer history, velocity, failure patterns, device profile, and location signals.</p>
        </div>
      </div>
    </div>
  );
}

function BenchmarkMetric({ label, value }) {
  return (
    <div className="benchmark-metric">
      <span>{label}</span>
      <strong>{value == null ? '—' : `${(Number(value) * 100).toFixed(1)}%`}</strong>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEW: REVIEW QUEUE
   ═══════════════════════════════════════════════════════════════════════ */
function ReviewQueueView({ flaggedTx, onSelect, onApprove, onBlock }) {
  const critical = flaggedTx.filter(tx => tx.riskLevel === 'CRITICAL');
  const high     = flaggedTx.filter(tx => tx.riskLevel === 'HIGH');
  const medium   = flaggedTx.filter(tx => tx.riskLevel === 'MEDIUM');

  if (flaggedTx.length === 0) {
    return (
      <div className="review-queue-layout">
        <div className="queue-empty">
          <ShieldCheck size={40} />
          <strong>All clear — no items in queue</strong>
          <p>No transactions are currently flagged as CRITICAL, HIGH, or MEDIUM risk. The risk engine is watching.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-queue-layout">
      {/* Summary bar */}
      <div className="queue-summary-bar">
        <div className="queue-stat critical-stat">
          <div className="queue-stat-icon"><AlertTriangle size={18} /></div>
          <div className="queue-stat-text">
            <span>Critical risk</span>
            <strong>{critical.length}</strong>
          </div>
        </div>
        <div className="queue-stat high-stat">
          <div className="queue-stat-icon"><Zap size={18} /></div>
          <div className="queue-stat-text">
            <span>High risk</span>
            <strong>{high.length}</strong>
          </div>
        </div>
        <div className="queue-stat medium-stat">
          <div className="queue-stat-icon"><TrendingUp size={18} /></div>
          <div className="queue-stat-text">
            <span>Medium risk</span>
            <strong>{medium.length}</strong>
          </div>
        </div>
      </div>

      {/* CRITICAL section */}
      {critical.length > 0 && (
        <QueueSection
          title="Critical Risk"
          level="critical"
          items={critical}
          onSelect={onSelect}
          onApprove={onApprove}
          onBlock={onBlock}
        />
      )}

      {/* HIGH section */}
      {high.length > 0 && (
        <QueueSection
          title="High Risk"
          level="high"
          items={high}
          onSelect={onSelect}
          onApprove={onApprove}
          onBlock={onBlock}
        />
      )}

      {/* MEDIUM section */}
      {medium.length > 0 && (
        <QueueSection
          title="Medium Risk"
          level="medium"
          items={medium}
          onSelect={onSelect}
          onApprove={onApprove}
          onBlock={onBlock}
        />
      )}
    </div>
  );
}

function QueueSection({ title, level, items, onSelect, onApprove, onBlock }) {
  return (
    <div className="queue-section">
      <div className={`queue-section-header ${level}-header`}>
        {level === 'critical' && <AlertTriangle size={14} />}
        {level === 'high'     && <Zap size={14} />}
        {level === 'medium'   && <TrendingUp size={14} />}
        {title} — {items.length} case{items.length !== 1 ? 's' : ''}
      </div>
      {items.map((tx, idx) => (
        <div
          key={tx.paymentId}
          className="queue-card"
          style={idx === items.length - 1 ? { borderRadius: '0 0 10px 10px' } : {}}
          onClick={() => onSelect(tx)}
        >
          <div className="queue-card-left">
            <div className="queue-card-top">
              <span className="queue-payment-id">{tx.paymentId}</span>
              <RiskBadge level={tx.riskLevel} score={tx.riskScore ?? 0} confidence={tx.riskConfidence} />
              <StatusBadge status={tx.status} />
              <span className="queue-amount">{formatCurrency(tx.amount)}</span>
              <span className="queue-customer">{tx.customerId || 'Unknown customer'}</span>
              {tx.suggestedAction && <ActionPill action={tx.suggestedAction} />}
            </div>
            {tx.triggeredSignals && (
              <div className="queue-signals">
                ⚡ Signals: {tx.triggeredSignals}
              </div>
            )}
            <div className="queue-ai-summary">{shortRiskReason(tx)}</div>
            {tx.evidenceSummary && (
              <div className="queue-evidence">{tx.evidenceSummary}</div>
            )}
          </div>
          <div className="queue-card-right">
            <div className="queue-time">
              <Clock3 size={12} />
              {formatTime(tx.createdAt)}
            </div>
            <div className="queue-card-actions" onClick={e => e.stopPropagation()}>
              <button className="view-btn" onClick={() => onSelect(tx)}>
                <Eye size={12} /> View
              </button>
              <button className="approve-btn" onClick={() => onApprove(tx)}>
                <Check size={12} /> Approve
              </button>
              {(tx.riskLevel === 'CRITICAL' || tx.suggestedAction === 'BLOCK') && (
                <button className="block-btn" onClick={() => onBlock(tx)}>
                  <Ban size={12} /> Block
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */
function MetricCard({ label, value, change, note, icon: Icon, tone }) {
  const isNegative = change === 'Needs attention';
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={17} /></div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <div className="metric-meta">
        <span className={isNegative ? 'negative' : 'positive'}>{change}</span>
        <small>{note}</small>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="state-panel"><RefreshCw className="spin" size={24} /><strong>Loading payment intelligence...</strong></div>;
}

function OfflineState({ onRetry }) {
  return <div className="state-panel offline-state"><AlertTriangle size={24} /><strong>Sentinel API is offline</strong><p>We could not reach the Spring Boot service. Your dashboard will recover when it reconnects.</p><button className="secondary-button" onClick={onRetry}><RefreshCw size={14} /> Retry connection</button></div>;
}

function PanelHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="panel-action" onClick={onAction}>
          {action} <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

function PerformanceChart({ bars }) {
  const maxHeight = bars.reduce((max, bar) => bar.rawAmount > max ? bar.rawAmount : max, 1n);

  return (
    <div className="chart">
      <div className="chart-y">
        <span>{formatCurrencyShort(maxHeight)}</span>
        <span>{formatCurrencyShort(maxHeight / 2n)}</span>
        <span>{formatCurrency(0n)}</span>
      </div>
      <div className="chart-area">
        <div className="grid-lines"><i /><i /><i /></div>
        <div className="bars">
          {bars.map(({ label, height, isToday }) => (
            <div className={`bar-column ${isToday ? 'today' : ''}`} key={label}>
              <div className="bar" style={{ height: `${height}%` }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionTable({ transactions, onSelect, compact }) {
  if (transactions.length === 0) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment</th><th>Customer</th><th>Amount</th>
              <th>Status</th><th>Risk</th><th>Time</th><th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7" className="empty-state">
                <Activity size={22} />
                <strong>No transactions yet</strong>
                <span>Payments processed through your storefront will appear here.</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Payment</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Risk</th>
            {!compact && <th>Action</th>}
            <th>Time</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.paymentId} onClick={() => onSelect(tx)}>
              <td>
                <span className="payment-id">{tx.paymentId}</span>
                <small>{capitalize(tx.paymentMethod) || 'Card payment'}</small>
              </td>
              <td>
                <span className="customer-cell">{tx.customerId || 'Unknown'}</span>
                {tx.ipAddress && <small>{tx.ipAddress}</small>}
              </td>
              <td><strong>{formatCurrency(tx.amount)}</strong></td>
              <td><StatusBadge status={tx.status} /></td>
              <td><RiskBadge level={tx.riskLevel || 'LOW'} score={tx.riskScore ?? 0} confidence={tx.riskConfidence} /></td>
              {!compact && (
                <td>{tx.suggestedAction ? <ActionPill action={tx.suggestedAction} /> : <span style={{ color: '#ccc' }}>—</span>}</td>
              )}
              <td>
                <span className="time-cell">
                  <Clock3 size={13} />
                  {formatTime(tx.createdAt)}
                </span>
              </td>
              <td>
                <button className="row-arrow" onClick={e => { e.stopPropagation(); onSelect(tx); }}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === 'captured' ? 'status-captured' : status === 'approved' ? 'status-approved' : status === 'failed' ? 'status-failed' : status === 'blocked' ? 'status-blocked' : 'status-pending';
  return (
    <span className={`status-badge ${cls}`}>
      <span />
      {status || 'unknown'}
    </span>
  );
}

function RiskBadge({ level, score, confidence }) {
  return (
    <span className={`risk-badge risk-${String(level).toLowerCase()}`}>
      {level} <b>{score}</b>{confidence != null && <small title="Model confidence"> · {confidence}% conf.</small>}
    </span>
  );
}

function shortRiskReason(tx) {
  const signals = String(tx.triggeredSignals || '').toLowerCase();
  const reasons = [];
  if (signals.includes('failed')) reasons.push('repeated failed attempts');
  if (signals.includes('velocity')) reasons.push('high velocity');
  if (signals.includes('ip_activity')) reasons.push('shared IP activity');
  if (signals.includes('high_value')) reasons.push('high transaction value');
  if (signals.includes('international')) reasons.push('international activity');
  return `${tx.riskLevel || 'Review'} because of ${reasons.slice(0, 3).join(', ') || 'unusual payment signals'}.`;
}

function ActionPill({ action }) {
  const cls = action === 'ALLOW' ? 'action-allow' : action === 'BLOCK' ? 'action-block' : 'action-review';
  return <span className={`action-pill ${cls}`}>{action}</span>;
}

function TransactionDrawer({ tx, onClose, onApprove, onBlock }) {
  const { authHeaders } = useAuth();
  const [auditHistory, setAuditHistory] = useState([]);

  useEffect(() => {
    if (!tx?.paymentId) return;
    fetch(`${API_BASE_URL}/api/dashboard/payments/${encodeURIComponent(tx.paymentId)}/audit`, {
      headers: authHeaders(),
    })
      .then(response => response.ok ? response.json() : [])
      .then(data => setAuditHistory(Array.isArray(data) ? data : []))
      .catch(() => setAuditHistory([]));
  }, [tx?.paymentId]);

  if (!tx) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="transaction-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Transaction detail</span>
            <h2>{tx.paymentId}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-status">
          <StatusBadge status={tx.status} />
          <RiskBadge level={tx.riskLevel || 'LOW'} score={tx.riskScore ?? 0} confidence={tx.riskConfidence} />
          {tx.suggestedAction && <ActionPill action={tx.suggestedAction} />}
        </div>

        <div className="drawer-section">
          <h3>Payment overview</h3>
          <Detail label="Payment ID"      value={tx.paymentId} mono />
          <Detail label="Order ID"        value={tx.orderId || 'N/A'} mono />
          <Detail label="Customer"        value={tx.customerId || 'N/A'} />
          <Detail label="Amount"          value={formatCurrency(tx.amount)} />
          <Detail label="Payment method"  value={capitalize(tx.paymentMethod) || 'Card'} />
          <Detail label="Processed"       value={formatTime(tx.createdAt)} />
        </div>

        <div className="drawer-section">
          <h3>Risk intelligence</h3>
          <Detail label="Risk score"   value={`${tx.riskScore ?? 0} / 100`} />
          <Detail label="Model confidence" value={`${tx.riskConfidence ?? 0}%`} />
          <Detail label="Risk level"   value={tx.riskLevel || 'LOW'} />
          <Detail label="IP address"   value={tx.ipAddress || 'Unknown'} mono />
          <Detail label="Card network" value={tx.cardNetwork || 'N/A'} />
          <Detail label="Card type"    value={tx.cardType || 'N/A'} />
          <Detail label="Issuer bank"  value={tx.issuerBank || 'N/A'} />
          <Detail label="International" value={tx.international ? 'Yes' : 'No'} />
          {tx.triggeredSignals && <Detail label="Signals" value={tx.triggeredSignals} />}
          {tx.errorReason && <Detail label="Error reason" value={tx.errorReason} />}
        </div>

        {(tx.evidenceSummary || tx.suggestedAction) && (
          <div className="investigation-note">
            <div><Sparkles size={15} /><strong>Autonomous investigation</strong></div>
            <p>{tx.evidenceSummary || 'Ingested successfully. Awaiting risk evaluation.'}</p>
          </div>
        )}

        {Array.isArray(auditHistory) && auditHistory.length > 0 && (
          <div className="drawer-section">
            <h3>Audit history</h3>
            {auditHistory.map(entry => (
              <Detail
                key={entry.id || `${entry.action}-${entry.createdAt}`}
                label={entry.action}
                value={`${entry.analystId || 'analyst'} · ${formatTime(entry.createdAt)}`}
              />
            ))}
          </div>
        )}

        <div className="drawer-actions">
          <button className="secondary-button" onClick={onClose}>Close</button>
          {tx.suggestedAction === 'BLOCK' && (
            <button className="danger-button" onClick={onBlock}>
              <Ban size={14} /> Block
            </button>
          )}
          <button className="primary-button" onClick={onApprove}>
            <Check size={14} /> Approve
          </button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
    </div>
  );
}

function SettingsPanel({ notificationsEnabled, onToggleNotifications, onReset }) {
  return (
    <div className="single-panel panel">
      <PanelHeader title="Workspace settings" subtitle="Manage how Sentinel connects to your payment operation" />
      <div className="settings-list">
        <div>
          <div className="setting-icon"><Activity size={17} /></div>
          <span>
            <strong>Live payment sync</strong>
            <small>Polling the local Spring Boot API every 3 seconds</small>
          </span>
          <b className="toggle on" />
        </div>
        <div>
          <div className="setting-icon"><Bell size={17} /></div>
          <span>
            <strong>Review notifications</strong>
            <small>{notificationsEnabled ? 'Notifications enabled for this workspace' : 'Enable alerts for new review cases'}</small>
          </span>
          <button
            className={`toggle ${notificationsEnabled ? 'on' : ''}`}
            onClick={onToggleNotifications}
            aria-label="Toggle review notifications"
          />
        </div>
        <div>
          <div className="setting-icon"><ShieldCheck size={17} /></div>
          <span>
            <strong>Risk policy</strong>
            <small>Current policy evaluates velocity, failure rate, and value thresholds</small>
          </span>
          <button className="panel-action">Configure <ArrowUpRight size={13} /></button>
        </div>
        <div>
          <div className="setting-icon"><BarChart3 size={17} /></div>
          <span>
            <strong>Analytics engine</strong>
            <small>Live risk scoring and benchmark evaluation from labeled payments</small>
          </span>
          <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600 }}>Active</span>
        </div>
        <div>
          <div className="setting-icon"><X size={17} /></div>
          <span>
            <strong>Reset dashboard data</strong>
            <small>Delete all payments, risk evaluations, and AI investigations</small>
          </span>
          <button className="danger-button" onClick={onReset}>Reset data</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/** Build real per-day chart bars from transaction data (last 7 days) */
function buildChartBars(transactions) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const buckets = days.map(d => {
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayStr = d.toISOString().slice(0, 10);
    const total = transactions
      .filter(tx => tx.createdAt && tx.createdAt.slice(0, 10) === dayStr)
      .reduce((s, tx) => s + toPaise(tx.amount), 0n);
    return { label, rawAmount: total, dayStr };
  });

  const maxAmt = buckets.reduce((max, bucket) => bucket.rawAmount > max ? bucket.rawAmount : max, 1n);
  const today = new Date().toISOString().slice(0, 10);

  return buckets.map(b => ({
    label:     b.label,
    rawAmount: b.rawAmount,
    height:    b.rawAmount === 0n ? 8 : Math.max(10, Number((b.rawAmount * 90n) / maxAmt)),
    isToday:   b.dayStr === today,
  }));
}

function buildOutcomeBars(transactions) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  }).map(date => {
    const dayStr = date.toISOString().slice(0, 10);
    const dayTransactions = transactions.filter(tx => tx.createdAt && tx.createdAt.slice(0, 10) === dayStr);
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      captured: sumPaise(dayTransactions.filter(tx => tx.status === 'captured')),
      failed: sumPaise(dayTransactions.filter(tx => tx.status === 'failed')),
    };
  });
  const maxTotal = days.reduce((max, day) => {
    const total = day.captured + day.failed;
    return total > max ? total : max;
  }, 1n);
  return {
    maxTotal,
    days: days.map(day => ({
      ...day,
      capturedHeight: Number((day.captured * 100n) / maxTotal),
      failedHeight: Number((day.failed * 100n) / maxTotal),
    })),
  };
}

function exportTransactions(transactions) {
  const headers = ['Payment ID', 'Customer', 'Amount (paise)', 'Status', 'Risk level', 'Risk score', 'Suggested action', 'Created at'];
  const rows = transactions.map(tx => [
    tx.paymentId, tx.customerId, tx.amount, tx.status,
    tx.riskLevel, tx.riskScore, tx.suggestedAction, tx.createdAt,
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `sentinel-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(amount) {
  const paise = toPaise(amount);
  const rupees = paise / 100n;
  const remainder = String(paise % 100n).padStart(2, '0');
  return `₹${formatIndianInteger(rupees)}.${remainder}`;
}

function formatCurrencyFromMajor(amount) {
  return formatCurrency(BigInt(Math.round(Number(amount ?? 0) * 100)));
}

function sumPaise(transactions) {
  return transactions.reduce((total, tx) => total + toPaise(tx.amount), 0n);
}

function toPaise(amount) {
  try {
    const value = String(amount ?? 0).trim().split('.')[0];
    const clean = value.replace(/[^\d-]/g, '') || '0';
    return BigInt(clean);
  } catch {
    return 0n;
  }
}

function formatIndianInteger(value) {
  const digits = String(value);
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const leading = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${leading},${lastThree}`;
}

function formatCurrencyShort(paise) {
  const inr = Number(paise || 0) / 100;
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(1)}L`;
  if (inr >= 1000)   return `₹${(inr / 1000).toFixed(1)}k`;
  return `₹${inr.toFixed(0)}`;
}

function formatTime(value) {
  return value
    ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Pending';
}

function capitalize(str) {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
