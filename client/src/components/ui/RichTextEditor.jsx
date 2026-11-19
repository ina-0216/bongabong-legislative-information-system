import { useRef, useEffect } from 'react';

const TOOLBAR = [
  { cmd: 'bold',          icon: '<b>B</b>',    title: 'Bold' },
  { cmd: 'italic',        icon: '<i>I</i>',    title: 'Italic' },
  { cmd: 'underline',     icon: '<u>U</u>',    title: 'Underline' },
  { cmd: 'insertUnorderedList', icon: '≡',     title: 'Bullet List' },
  { cmd: 'insertOrderedList',   icon: '1.',    title: 'Numbered List' },
  { cmd: 'justifyLeft',   icon: '⬅',          title: 'Align Left' },
  { cmd: 'justifyCenter', icon: '⬌',          title: 'Align Center' },
  { cmd: 'justifyRight',  icon: '⮕',          title: 'Align Right' },
];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd) => {
    try {
      document.execCommand(cmd, false, null);
    } catch (err) {
      console.warn('execCommand failed or is deprecated in this browser environment', err);
    }
    editorRef.current?.focus();
    emit();
  };

  const emit = () => {
    isInternalChange.current = true;
    onChange?.(editorRef.current?.innerHTML || '');
  };

  return (
    <div style={{
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-md, 8px)',
      overflow: 'hidden',
      background: 'var(--bg-input, #fff)',
    }}>
      <div style={{
        display: 'flex',
        gap: 2,
        padding: '6px 8px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface, #f7f7f8)',
        flexWrap: 'wrap',
      }}>
        {TOOLBAR.map(btn => (
          <button
            key={btn.cmd}
            type="button"
            title={btn.title}
            onMouseDown={e => { e.preventDefault(); exec(btn.cmd); }}
            style={{
              background: 'none',
              border: '1px solid transparent',
              borderRadius: 4,
              padding: '2px 7px',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--text-primary, #111)',
              lineHeight: 1.5,
              minWidth: 28,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover, #e5e7eb)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            dangerouslySetInnerHTML={{ __html: btn.icon }}
          />
        ))}
      </div>

      <div
        ref={editorRef}
        className="ibosys-rte-content"
        contentEditable
        spellCheck={true}
        suppressContentEditableWarning
        onInput={emit}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '12px 14px',
          outline: 'none',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary, #111)',
          overflowY: 'auto',
          maxHeight: 400,
        }}
      />

      <style>{`
        .ibosys-rte-content:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted, #aaa);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
