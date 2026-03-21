import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import {
  Plus, LogOut, Archive, RotateCcw, Pencil, Trash2,
  ChevronDown, Search, X, SlidersHorizontal, ArrowUpDown, Timer,
} from 'lucide-react';
import {
  fetchTasks, deleteTask, archiveTask, fetchTags, clearTasksError,
} from '../features/tasks/tasksSlice';
import { logoutThunk } from '../features/auth/authSlice';
import TaskFormModal from '../components/TaskFormModal';

const PRIORITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High' };
const PRIORITY_CLASS  = { 1: 'low',  2: 'medium', 3: 'high' };
const PAGE_SIZE = 6;

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created At' },
  { value: 'dueDate',   label: 'Due Date'   },
  { value: 'priority',  label: 'Priority'   },
];

export default function TasksPage() {
  const dispatch = useDispatch();
  const { items, loading, error, tags: allTags } = useSelector((s) => s.tasks);
  const user = useSelector((s) => s.auth.user);

  // ---- UI state ----
  const [showAll,              setShowAll]              = useState(false);
  const [modalTask,            setModalTask]            = useState(undefined);
  const [dropdownOpen,         setDropdownOpen]         = useState(false);
  const [filterOpen,           setFilterOpen]           = useState(false);
  const filterPanelRef = useRef(null);
  const filterBtnRef   = useRef(null);
  const [unarchiveSuggestTask, setUnarchiveSuggestTask] = useState(null);
  const [countdown,            setCountdown]            = useState(60);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        filterOpen &&
        filterPanelRef.current && !filterPanelRef.current.contains(e.target) &&
        filterBtnRef.current  && !filterBtnRef.current.contains(e.target)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // ---- Search ----
  const [searchQuery, setSearchQuery] = useState('');

  // ---- Filters ----
  const [filterPriorities, setFilterPriorities] = useState([]); // number[]
  const [filterTags,       setFilterTags]       = useState([]); // string[]
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');

  // ---- Sort ----
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir,   setSortDir]   = useState('desc');

  // ---- Pagination ----
    const [page, setPage] = useState(1);
    


  // Reset page on any control change
  useEffect(() => { setPage(1); }, [showAll, searchQuery, filterPriorities, filterTags, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Fetch on mount + showAll toggle
  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchTasks(showAll));
  }, [showAll]);

  // 1-second ticker: countdown to next cleanup + fires refresh at 0
  const showAllRef = useRef(showAll);
  useEffect(() => { showAllRef.current = showAll; }, [showAll]);
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          dispatch(fetchTasks(showAllRef.current));
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  // ---- Pipeline ----
  const processed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = items.filter((t) => {
      // Search
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc  = t.description?.toLowerCase().includes(q);
        const inTags  = t.tags?.some((tag) => tag.name.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      // Priority filter
      if (filterPriorities.length && !filterPriorities.includes(t.priority)) return false;
      // Tag filter
      if (filterTags.length && !filterTags.every((ft) => t.tags?.some((tt) => tt.name === ft))) return false;
      // Date range
      if (filterDateFrom && new Date(t.dueDate) < new Date(filterDateFrom)) return false;
      if (filterDateTo   && new Date(t.dueDate) > new Date(filterDateTo))   return false;
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let av, bv;
      if (sortField === 'priority') { av = a.priority;           bv = b.priority; }
      else if (sortField === 'dueDate') { av = new Date(a.dueDate);   bv = new Date(b.dueDate); }
      else { av = new Date(a.createdAt); bv = new Date(b.createdAt); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return result;
  }, [items, searchQuery, filterPriorities, filterTags, filterDateFrom, filterDateTo, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startNum   = processed.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const endNum     = Math.min(safePage * PAGE_SIZE, processed.length);

  // ---- Actions ----
  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    dispatch(deleteTask(task.id));
  };

  const handleArchive = async (task) => {
    dispatch(clearTasksError());
    await dispatch(archiveTask(task.id));
    dispatch(fetchTasks(showAll));
    // If unarchiving a task whose due date has already passed, suggest updating it
    if (task.isArchived && new Date(task.dueDate) < new Date()) {
      setUnarchiveSuggestTask(task);
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await dispatch(logoutThunk());
  };

  const togglePriority = (p) =>
    setFilterPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const toggleTag = (name) =>
    setFilterTags((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  const clearFilters = () => {
    setFilterPriorities([]);
    setFilterTags([]);
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  const isFiltered = filterPriorities.length || filterTags.length || filterDateFrom || filterDateTo || searchQuery;

  const initial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="app">
      {/* ---- Navbar ---- */}
      <header style={nav.bar}>
        <div style={nav.inner}>
          <span style={nav.brand}>TaskManager</span>
          <div style={nav.right}>
            {/* Cleanup countdown */}
            <div style={nav.countdown}>
              <Timer size={13} style={{ flexShrink: 0 }} />
              Cleanup in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </div>
            <button className="btn btn-primary" onClick={() => setModalTask(null)}>
              <Plus size={16} /> New Task
            </button>
            <div style={{ position: 'relative' }}>
              <button
                style={nav.avatar}
                onClick={() => setDropdownOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {initial}
                <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.7 }} />
              </button>
              {dropdownOpen && (
                <div style={nav.dropdown}>
                  <div style={nav.dropdownUser}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{user?.fullName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{user?.email}</span>
                  </div>
                  <div style={nav.dropdownDivider} />
                  <button style={nav.dropdownItem} onClick={handleLogout}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---- Content ---- */}
      <main style={main.wrap}>

        {/* Toolbar row 1: toggle + search + filter btn + sort */}
        <div style={main.toolbar}>
          {/* Active / All toggle */}
          <div style={main.toggleGroup}>
            <button
              style={{ ...main.toggleBtn, ...(!showAll ? main.toggleActive : {}) }}
              onClick={() => setShowAll(false)}
            >Active</button>
            <button
              style={{ ...main.toggleBtn, ...(showAll ? main.toggleActive : {}) }}
              onClick={() => setShowAll(true)}
            >All Tasks</button>
          </div>

          {/* Search */}
          <div style={main.searchWrap}>
            <Search size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input
              style={main.searchInput}
              type="text"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="btn-icon" onClick={() => setSearchQuery('')} style={{ padding: '0.1rem' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle + Sort */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              ref={filterBtnRef}
              className={`btn btn-ghost${filterOpen ? ' filter-btn-active' : ''}`}
              onClick={() => setFilterOpen((o) => !o)}
              style={{ padding: '0.4rem 0.75rem', gap: '0.4rem', fontSize: '0.8rem' }}
            >
              <SlidersHorizontal size={14} />
              Filters
              {isFiltered ? <span style={main.filterBadge}>!</span> : null}
            </button>

            <select
              style={main.sortSelect}
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              className="btn btn-ghost"
              onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              style={{ padding: '0.4rem 0.6rem' }}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown size={14} style={{ transform: sortDir === 'desc' ? 'scaleY(-1)' : 'none', transition: 'transform 0.15s' }} />
            </button>
          </div>
        </div>

        {/* Content area — position:relative so filter panel can float absolutely */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >

        {/* Filter panel — floats over grid, no layout shift */}
        {filterOpen && (
          <div ref={filterPanelRef} style={main.filterPanel} onClick={(e) => e.stopPropagation()}>
            {/* Priority chips */}
            <div style={main.filterSection}>
              <span style={main.filterLabel}>Priority</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    className={`chip ${PRIORITY_CLASS[p]}`}
                    onClick={() => togglePriority(p)}
                    style={{
                      cursor: 'pointer',
                      opacity: filterPriorities.length && !filterPriorities.includes(p) ? 0.35 : 1,
                      outline: filterPriorities.includes(p) ? '2px solid var(--accent)' : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div style={main.filterSection}>
                <span style={main.filterLabel}>Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {allTags.map((t) => (
                    <button
                      key={t.id}
                      className="tag-pill"
                      onClick={() => toggleTag(t.name)}
                      style={{
                        cursor: 'pointer',
                        opacity: filterTags.length && !filterTags.includes(t.name) ? 0.35 : 1,
                        outline: filterTags.includes(t.name) ? '2px solid var(--accent)' : 'none',
                        outlineOffset: '2px',
                        background: 'none',
                        border: 'none',
                      }}
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date range */}
            <div style={main.filterSection}>
              <span style={main.filterLabel}>Due Date Range</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{ ...main.filterDate }}
                />
                <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>to</span>
                <input
                  type="datetime-local"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{ ...main.filterDate }}
                />
              </div>
            </div>

            {/* Clear */}
            {isFiltered && (
              <button
                className="btn btn-ghost"
                onClick={clearFilters}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', alignSelf: 'flex-start' }}
              >
                <X size={13} /> Clear all
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="error-banner">{error}</div>}

        {/* Loading */}
        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
            Loading…
          </p>
        )}

        {/* Empty */}
        {!loading && processed.length === 0 && (
          <div style={main.empty}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {isFiltered ? 'No tasks match your filters.' : showAll ? 'No tasks found.' : "No active tasks. You're all caught up!"}
            </p>
            {!isFiltered && (
              <button className="btn btn-primary" onClick={() => setModalTask(null)}>
                <Plus size={16} /> Create your first task
              </button>
            )}
            {isFiltered && (
              <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && pageItems.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, zIndex: 1 }}>
            <div style={grid.container}>
              {pageItems.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => setModalTask(task)}
                  onDelete={() => handleDelete(task)}
                  onArchive={() => handleArchive(task)}
                />
              ))}
            </div>

            {/* Paginator */}
            <div style={pg.bar}>
              <span style={pg.info}>
                Showing {startNum}–{endNum} of {processed.length} task{processed.length !== 1 ? 's' : ''}
              </span>
              <div style={pg.pages}>
                <button
                  style={{ ...pg.btn, ...(safePage === 1 ? pg.disabled : {}) }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >‹ Prev</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    style={{ ...pg.btn, ...(n === safePage ? pg.active : {}) }}
                    onClick={() => setPage(n)}
                  >{n}</button>
                ))}

                <button
                  style={{ ...pg.btn, ...(safePage === totalPages ? pg.disabled : {}) }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >Next ›</button>
              </div>
            </div>
          </div>
        )}

        </div>{/* end content area */}
      </main>

      {/* Modal */}
      {modalTask !== undefined && (
        <TaskFormModal task={modalTask} onClose={() => setModalTask(undefined)} />
      )}

      {/* Unarchive expired-date suggestion */}
      {unarchiveSuggestTask && (
        <ExpiredDateModal
          task={unarchiveSuggestTask}
          onEdit={() => { setUnarchiveSuggestTask(null); setModalTask(unarchiveSuggestTask); }}
          onDismiss={() => setUnarchiveSuggestTask(null)}
        />
      )}
    </div>
  );
}

/* ---- Task Card ---- */
function TaskCard({ task, onEdit, onDelete, onArchive }) {
  const localDue   = moment.utc(task.dueDate);
  const minsUntil  = moment().add(2, 'hours').diff(moment(localDue) , 'minutes');
  const isImminent = !task.isArchived && (minsUntil >= -4);

    return (
    <div style={{ ...card.base, ...(task.isArchived ? card.archived : {}) }}>
      <div style={card.topRow}>
        <span className={`chip ${PRIORITY_CLASS[task.priority] ?? 'low'}`}>
          {PRIORITY_LABEL[task.priority] ?? 'Low'}
        </span>
        {task.isArchived && <span className="chip archived">Archived</span>}
      </div>

      <h3 style={card.title}>{task.title}</h3>

      {task.description && <p style={card.desc}>{task.description}</p>}

      <p style={{ ...card.due, ...(isImminent ? card.overdue : {}) }}>
        {isImminent ? '⚠ ' : ''}Due {localDue.format('MMM D, YYYY [at] h:mm A')}
      </p>

      {task.tags?.length > 0 && (
        <div className="tag-pills-row" style={{ marginTop: '0.75rem' }}>
          {task.tags.map((t) => <span key={t.id} className="tag-pill">{t.name}</span>)}
        </div>
      )}

      <div style={card.actions}>
        <button
          className={`btn-icon ${task.isArchived ? 'accent' : 'accent'}`}
          onClick={onArchive}
          title={task.isArchived ? 'Unarchive' : 'Archive'}
        >
          {task.isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
        </button>
        <button className="btn-icon warn" onClick={onEdit} title="Edit">
          <Pencil size={15} />
        </button>
        <button className="btn-icon danger" onClick={onDelete} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ---- Expired Date Suggestion Modal ---- */
function ExpiredDateModal({ task, onEdit, onDismiss }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>Due Date Expired</h2>
          <button className="btn-icon" onClick={onDismiss} aria-label="Close"><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong> was unarchived,
          but its due date has already passed. The backend will re-archive it on the next
          cycle — update the due date to a future time to keep it active.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onDismiss}>Dismiss</button>
          <button className="btn btn-primary" onClick={onEdit}>Update Due Date</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Styles ---- */
const nav = {
  bar: { background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 },
  inner: { maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.3px' },
  right: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  countdown: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-faint)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.25rem 0.65rem', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' },
  avatar: { display: 'flex', alignItems: 'center', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)', borderRadius: '999px', padding: '0.3rem 0.75rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', gap: '2px' },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)', minWidth: '180px', padding: '0.5rem 0', zIndex: 30, animation: 'slideUp 0.15s ease' },
  dropdownUser: { padding: '0.5rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' },
  dropdownDivider: { height: '1px', background: 'var(--border)', margin: '0 0.5rem 0.35rem' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.45rem 1rem', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer', transition: 'background 0.15s' },
};

const main = {
  wrap: { maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1.5rem', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  toggleGroup: { display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' },
  toggleBtn: { padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem', borderRight: '1px solid var(--border)' },
  toggleActive: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  searchWrap: { flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', transition: 'border-color 0.15s' },
  searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', padding: 0, width: '100%' },
  filterPanel: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: 'var(--shadow-card)', animation: 'slideUp 0.15s ease' },
  filterSection: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  filterLabel: { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '60px' },
  filterDate: { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', color: 'var(--text-primary)', fontSize: '0.8rem', width: 'auto' },
  filterBadge: { background: 'var(--accent)', color: '#0d1117', borderRadius: '999px', width: '14px', height: '14px', fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  sortSelect: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem', padding: '0.4rem 0.5rem', width: 'auto' },
  empty: { textAlign: 'center', padding: '4rem 0' },
};

const grid = {
  container: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '0.75rem', flex: 1, minHeight: 0 },
};

const card = {
  base: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: '4px solid var(--accent)', borderRadius: 'var(--radius)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', transition: 'box-shadow 0.18s ease', position: 'relative', overflow: 'hidden', minHeight: 0 },
  archived: { borderTopColor: 'var(--text-faint)', opacity: 0.65 },
  topRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  title: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginTop: '0.25rem' },
  desc: { fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  due: { fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 'auto', paddingTop: '0.2rem' },
  overdue: { color: 'var(--danger)' },
  actions: { display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem' },
};

const pg = {
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 },
  info: { fontSize: '0.8rem', color: 'var(--text-faint)' },
  pages: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  btn: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.3rem 0.65rem', cursor: 'pointer', transition: 'all 0.15s' },
  active: { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--border-accent)' },
  disabled: { opacity: 0.35, cursor: 'not-allowed' },
};
