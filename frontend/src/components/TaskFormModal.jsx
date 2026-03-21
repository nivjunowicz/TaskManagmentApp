import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { X } from 'lucide-react';
import { createTask, updateTask, clearTasksError } from '../features/tasks/tasksSlice';
import TagInput from './TagInput';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
];

function toInputDate(iso) {
  if (!iso) return '';
  return moment.utc(iso).format('YYYY-MM-DDTHH:mm');
}

function validate(fields) {
  const errs = {};
  if (!fields.title.trim())       errs.title = 'Title is required';
  if (!fields.description.trim()) errs.description = 'Description is required';
  if (!fields.dueDate)            errs.dueDate = 'Due date is required';
  if (!fields.priority)           errs.priority = 'Priority is required';
  return errs;
}

export default function TaskFormModal({ task, onClose }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(task);

  const handleClose = () => {
    dispatch(clearTasksError());
    onClose();
  };

  const [fields, setFields] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: task ? toInputDate(task.dueDate) : '',
    priority: task?.priority ?? 2,
    tagNames: task?.tags?.map((t) => t.name) ?? [],
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = (key) => (e) => {
    const val = e.target ? e.target.value : e; // handles TagInput (passes array directly)
    setFields((f) => ({ ...f, [key]: val }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
    setApiError('');
  };

  const setTags = (names) => {
    setFields((f) => ({ ...f, tagNames: names }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setSaving(true);
    setApiError('');

    const payload = {
      title: fields.title.trim(),
      description: fields.description.trim(),
      dueDate: fields.dueDate + ':00',
      priority: Number(fields.priority),
      tagNames: fields.tagNames,
    };

    try {
      let result;
      if (isEdit) {
        result = await dispatch(updateTask({ id: task.id, ...payload }));
      } else {
        result = await dispatch(createTask(payload));
      }

      if (result.meta.requestStatus === 'rejected') {
        setApiError(result.payload ?? 'Something went wrong');
      } else {
        handleClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn-icon" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {apiError && <div className="error-banner">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="m-title">Title</label>
            <input
              id="m-title"
              type="text"
              placeholder="Task title"
              value={fields.title}
              onChange={set('title')}
              className={fieldErrors.title ? 'error' : ''}
            />
            {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="m-desc">Description</label>
            <textarea
              id="m-desc"
              rows={2}
              placeholder="What needs to be done?"
              value={fields.description}
              onChange={set('description')}
              className={fieldErrors.description ? 'error' : ''}
              style={{ resize: 'vertical' }}
            />
            {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
          </div>

          {/* Due Date + Priority (side by side) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="m-due">Due Date &amp; Time</label>
              <input
                id="m-due"
                type="datetime-local"
                value={fields.dueDate}
                onChange={set('dueDate')}
                className={fieldErrors.dueDate ? 'error' : ''}
              />
              {fieldErrors.dueDate && <span className="field-error">{fieldErrors.dueDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="m-priority">Priority</label>
              <select
                id="m-priority"
                value={fields.priority}
                onChange={set('priority')}
                className={fieldErrors.priority ? 'error' : ''}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {fieldErrors.priority && <span className="field-error">{fieldErrors.priority}</span>}
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Tags</label>
            <TagInput value={fields.tagNames} onChange={setTags} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
