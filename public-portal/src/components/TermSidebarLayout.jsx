import { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronsLeft, ChevronsRight, ChevronDown, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function TermSidebarLayout({
  children,
  title,
  description,
  breadcrumbs,
  terms,
  activeTermId,
  onTermChange,
}) {
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();
  
  const activeTerm = terms.find((term) => term._id === activeTermId);
  const activeLabel = activeTerm?.label || t('termAllLabel');

  const termRowClass = (id) => `v11-term${activeTermId === id ? ' active' : ''}`;

  return (
    <div className="container v11-page-pad">
      {breadcrumbs && (
        <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
          <Link to="/">Home</Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.label} className="v11-crumb-part">
              <span aria-hidden="true">/</span>
              {crumb.link ? (
                <Link to={crumb.link}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <header className="v11-page-head">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>

      {/* Mobile term filter, now a Radix Collapsible so its open state is
          managed by the primitive rather than by hand. */}
      <Collapsible.Root className="v11-term-mobile" open={mobileOpen} onOpenChange={setMobileOpen}>
        <Collapsible.Trigger className="v11-term-trigger">
          <span className="v11-term-trigger-label">
            <BookOpen size={16} aria-hidden="true" />
            <span>{t('termLabel')}</span>
            <strong>{activeLabel}</strong>
          </span>
          <ChevronDown size={18} aria-hidden="true" className="v11-term-chevron" />
        </Collapsible.Trigger>
        <Collapsible.Content className="v11-term-panel">
          <button type="button" onClick={() => onTermChange(null)} className={termRowClass(null)}>
            {t('termAllLabel')}
          </button>
          {terms.map((term) => (
            <button key={term._id} type="button" onClick={() => onTermChange(term._id)} className={termRowClass(term._id)}>
              <span>{term.label}</span>
              {term.isCurrent && <span className="v11-tag status-done">Current</span>}
            </button>
          ))}
        </Collapsible.Content>
      </Collapsible.Root>

      <div className="v11-term-layout">
        <aside className={`v11-term-aside${sidebarCollapsed ? ' collapsed' : ''}`} aria-label={t('ariaFilterByTerm')}>
          <div className="v11-term-aside-head">
            {!sidebarCollapsed && <h2>{t('termsHeading')}</h2>}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? t('ariaExpandTermList') : t('ariaCollapseTermList')}
              aria-expanded={!sidebarCollapsed}
              className="v11-term-collapse"
            >
              {sidebarCollapsed
                ? <ChevronsRight size={16} aria-hidden="true" />
                : <ChevronsLeft size={16} aria-hidden="true" />}
            </button>
          </div>

          {!sidebarCollapsed ? (
            <div className="v11-term-list">
              <button type="button" onClick={() => onTermChange(null)} className={termRowClass(null)}>
                {t('termAllLabel')}
              </button>
              {terms.map((term) => (
                <button key={term._id} type="button" onClick={() => onTermChange(term._id)} className={termRowClass(term._id)}>
                  <span>{term.label}</span>
                  {term.isCurrent && <span className="v11-tag status-done">{t('currentTermLabel')}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="v11-term-dots">
              <button type="button" onClick={() => onTermChange(null)} title={t('termAllLabel')} className={!activeTermId ? 'active' : ''}>
                {t('allShort')}
              </button>
              {terms.map((term, index) => (
                <button
                  key={term._id}
                  type="button"
                  onClick={() => onTermChange(term._id)}
                  title={term.label}
                  className={activeTermId === term._id ? 'active' : ''}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* A plain div, not <main>: App.jsx already owns the single <main>
            landmark for the page, and nesting a second one is invalid. */}
        <div className="v11-term-main">
          {children}
        </div>
      </div>
    </div>
  );
}