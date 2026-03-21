import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';

export default function TagInput({ value = [], onChange }) {
  const allTags = useSelector((s) => s.tasks.tags);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Close on outside click — check both the input container AND the portal panel
  useEffect(() => {
    const handler = (e) => {
      const inContainer = containerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inContainer && !inPanel) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateDropStyle = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const maxH = 200;
    // Flip upward if not enough space below
    if (spaceBelow < maxH && r.top > maxH) {
      setDropStyle({ bottom: window.innerHeight - r.top + 4, top: 'auto', left: r.left, width: r.width });
    } else {
      setDropStyle({ top: r.bottom + 4, bottom: 'auto', left: r.left, width: r.width });
    }
  };

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? allTags.filter((t) => t.name.toLowerCase().includes(trimmed))
    : allTags;
  const exactExists = allTags.some((t) => t.name.toLowerCase() === trimmed);
  const showAddNew = trimmed && !exactExists;

  const toggle = (tagName) => {
    const already = value.includes(tagName);
    onChange(already ? value.filter((n) => n !== tagName) : [...value, tagName]);
  };

  const addNew = () => {
    const name = query.trim();
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (showAddNew) addNew(); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="tag-dropdown" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search or add tag…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); updateDropStyle(); }}
        onFocus={() => { setOpen(true); updateDropStyle(); }}
        onKeyDown={handleKeyDown}
      />

      {open && (filtered.length > 0 || showAddNew) && createPortal(
        <div
          ref={panelRef}
          className="tag-dropdown-panel"
          style={{ position: 'fixed', zIndex: 9999, ...dropStyle }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {filtered.map((tag) => (
            <label key={tag.id} className="tag-dropdown-item" onMouseDown={(e) => e.preventDefault()}>
              <input
                type="checkbox"
                checked={value.includes(tag.name)}
                onChange={() => toggle(tag.name)}
              />
              {tag.name}
            </label>
          ))}
          {showAddNew && (
            <div className="tag-dropdown-item tag-add-new" onMouseDown={(e) => { e.preventDefault(); addNew(); }}>
              + Add &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Selected tag pills with remove buttons */}
      {value.length > 0 && (
        <div className="tag-pills-row">
          {value.map((name) => (
            <span key={name} className="tag-pill">
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(value.filter((n) => n !== name))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
