import { useId, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import MultiValueInput from '../ui/MultiValueInput';

const MAX_VISIBLE_AMENDMENT_OPTIONS = 30;

const getMeasureTermId = (candidate) => {
  const term = candidate?.termId;
  return typeof term === 'object' ? String(term?._id || '') : String(term || '');
};

const getMeasureTermLabel = (candidate) => {
  const term = candidate?.termId;
  if (!term || typeof term !== 'object') return '';
  const years = term.startYear && term.endYear ? ` (${term.startYear}-${term.endYear})` : '';
  return `${term.label || 'Legislative term'}${years}`;
};

export default function OrdinanceBasicInfoSection({
  form,
  fieldError,
  set,
  members,
  terms,
  amendmentCandidates = [],
  isEditing,
  sectorOptions,
  numberLoading = false,
  numberError = '',
  manualNumberEntry = false,
  onManualNumberEntryChange,
}) {
  const isResolution = form.type === 'Resolution';

  const [distributionError, setDistributionError] = useState('');
  const [amendmentSearch, setAmendmentSearch] = useState('');
  const [amendmentTermFilter, setAmendmentTermFilter] = useState('');
  const [amendmentPickerOpen, setAmendmentPickerOpen] = useState(false);
  const [activeAmendmentOption, setActiveAmendmentOption] = useState(0);
  const [coAuthorSearch, setCoAuthorSearch] = useState('');
  const [coAuthorTermSelection, setCoAuthorTermSelection] = useState('__default__');
  const amendmentPickerId = useId();

  const eligibleAmendments = useMemo(() => amendmentCandidates.filter(candidate => (
    candidate.type === form.type
    && !candidate.isDraft
    && candidate.status !== 'Draft'
    && !candidate.amendedByOrdinanceId
  )), [amendmentCandidates, form.type]);

  const selectedAmendment = eligibleAmendments.find(candidate => (
    String(candidate._id) === String(form.amendsOrdinanceId || '')
  ));

  const availableAmendmentTerms = useMemo(() => {
    const candidateTermIds = new Set(eligibleAmendments.map(getMeasureTermId).filter(Boolean));
    return terms
      .filter(term => candidateTermIds.has(String(term._id)))
      .sort((a, b) => (b.startYear || 0) - (a.startYear || 0));
  }, [eligibleAmendments, terms]);

  const filteredAmendments = useMemo(() => {
    const query = amendmentSearch.trim().toLocaleLowerCase();
    return eligibleAmendments.filter(candidate => {
      const candidateTermId = getMeasureTermId(candidate);
      if (amendmentTermFilter === '__unassigned__' && candidateTermId) return false;
      if (amendmentTermFilter && amendmentTermFilter !== '__unassigned__' && candidateTermId !== amendmentTermFilter) return false;
      if (!query) return true;
      const searchableText = [
        candidate.number,
        candidate.title,
        candidate.title_tl,
        getMeasureTermLabel(candidate),
        candidate.termId?.startYear,
        candidate.termId?.endYear,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchableText.includes(query);
    });
  }, [amendmentSearch, amendmentTermFilter, eligibleAmendments]);

  const visibleAmendments = filteredAmendments.slice(0, MAX_VISIBLE_AMENDMENT_OPTIONS);

  const defaultCoAuthorTerm = terms.find(term => String(term._id) === String(form.termId || ''))
    || terms.find(term => term.isCurrent);
  const defaultCoAuthorTermId = String(defaultCoAuthorTerm?._id || '');
  const activeCoAuthorTermId = coAuthorTermSelection === '__all__'
    ? ''
    : coAuthorTermSelection === '__default__'
      ? defaultCoAuthorTermId
      : coAuthorTermSelection;
  const selectedCoAuthorIds = Array.isArray(form.coAuthors) ? form.coAuthors : [];
  const selectedCoAuthors = members.filter(member => selectedCoAuthorIds.includes(member._id));
  const unavailableCoAuthorCount = selectedCoAuthorIds.filter(id => !members.some(member => member._id === id)).length;
  const filteredCoAuthors = useMemo(() => {
    const query = coAuthorSearch.trim().toLocaleLowerCase();
    return members.filter(member => {
      if (member._id === form.proponentId) return false;
      const memberTermId = String(typeof member.termId === 'object' ? member.termId?._id || '' : member.termId || '');
      if (activeCoAuthorTermId && memberTermId !== activeCoAuthorTermId) return false;
      if (!query) return true;
      const term = terms.find(candidate => String(candidate._id) === memberTermId);
      const searchableText = [
        member.name,
        member.firstName,
        member.middleName,
        member.lastName,
        member.position,
        term?.label,
        term?.startYear,
        term?.endYear,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchableText.includes(query);
    });
  }, [activeCoAuthorTermId, coAuthorSearch, form.proponentId, members, terms]);

  const selectAmendment = (candidateId) => {
    set('amendsOrdinanceId', candidateId);
    setAmendmentSearch('');
    setAmendmentTermFilter('');
    setAmendmentPickerOpen(false);
    setActiveAmendmentOption(0);
  };

  const handleAmendmentPickerKeyDown = (event) => {
    const optionCount = visibleAmendments.length + 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setAmendmentPickerOpen(true);
      setActiveAmendmentOption(index => Math.min(index + 1, optionCount - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setAmendmentPickerOpen(true);
      setActiveAmendmentOption(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && amendmentPickerOpen) {
      event.preventDefault();
      const candidate = visibleAmendments[activeAmendmentOption - 1];
      selectAmendment(candidate?._id || '');
    } else if (event.key === 'Escape') {
      setAmendmentPickerOpen(false);
    }
  };

  const handleDistributionChange = (next) => {
    const valid = next.filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(entry).trim()));
    const invalidCount = next.length - valid.length;
    setDistributionError(invalidCount ? 'Recipients must be valid email addresses.' : '');
    set('distribution', valid);
  };

  const toggleCoAuthor = (memberId) => {
    const current = Array.isArray(form.coAuthors) ? form.coAuthors : [];
    if (current.includes(memberId)) {
      set('coAuthors', current.filter(id => id !== memberId));
    } else {
      set('coAuthors', [...current, memberId]);
    }
  };

  const toggleSeconded = (memberId) => {
    const current = Array.isArray(form.secondedBy) ? form.secondedBy : [];
    if (current.includes(memberId)) {
      set('secondedBy', current.filter(id => id !== memberId));
    } else {
      set('secondedBy', [...current, memberId]);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
        1. Document Classification
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Document Type *</label>
          <select
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
            value={form.type}
            onChange={e => {
              set('type', e.target.value);
              set('number', '');
              set('amendsOrdinanceId', '');
              setAmendmentSearch('');
              setAmendmentTermFilter('');
              setAmendmentPickerOpen(false);
              setActiveAmendmentOption(0);
            }}
            disabled={isEditing}
          >
            <option value="Ordinance">Ordinance (Standard 9-Stage)</option>
            <option value="Resolution">Resolution (Standard 5-Stage)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Legislative Term</label>
          <select
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
            value={form.termId}
            onChange={e => set('termId', e.target.value)}
          >
            <option value="">Auto-assign based on filing date</option>
            {terms.map(t => (
              <option key={t._id} value={t._id}>{t.label} ({t.startYear}-{t.endYear})</option>
            ))}
          </select>
        </div>
      </div>

      {!isEditing && (
        <div>
          <label htmlFor="ord-amends" className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Amends an Earlier {form.type} (Optional)
          </label>
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAmendmentPickerOpen(false);
            }}
          >
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="ord-amends"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={amendmentPickerOpen}
                aria-controls={amendmentPickerOpen ? `${amendmentPickerId}-listbox` : undefined}
                aria-activedescendant={amendmentPickerOpen
                  ? `${amendmentPickerId}-option-${activeAmendmentOption}`
                  : undefined}
                placeholder={`Search ${form.type.toLowerCase()} by number or title`}
                value={amendmentSearch}
                onFocus={() => setAmendmentPickerOpen(true)}
                onChange={(event) => {
                  setAmendmentSearch(event.target.value);
                  setActiveAmendmentOption(0);
                  setAmendmentPickerOpen(true);
                }}
                onKeyDown={handleAmendmentPickerKeyDown}
                className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {selectedAmendment ? (
              <div className="mt-2 flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Selected earlier {form.type.toLowerCase()}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-foreground">
                    {selectedAmendment.number} — {selectedAmendment.title}
                  </p>
                  {getMeasureTermLabel(selectedAmendment) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{getMeasureTermLabel(selectedAmendment)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => selectAmendment('')}
                  aria-label={`Clear selected ${form.type.toLowerCase()} amendment`}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No earlier {form.type.toLowerCase()} selected. This will be filed as a new {form.type.toLowerCase()}.
              </p>
            )}

            {amendmentPickerOpen && (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                <div className="border-b border-border p-3">
                  <label htmlFor={`${amendmentPickerId}-term`} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Filter by legislative term
                  </label>
                  <select
                    id={`${amendmentPickerId}-term`}
                    value={amendmentTermFilter}
                    onChange={(event) => {
                      setAmendmentTermFilter(event.target.value);
                      setActiveAmendmentOption(0);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">All terms</option>
                    {availableAmendmentTerms.map(term => (
                      <option key={term._id} value={term._id}>
                        {term.label} ({term.startYear}-{term.endYear})
                      </option>
                    ))}
                    {eligibleAmendments.some(candidate => !getMeasureTermId(candidate)) && (
                      <option value="__unassigned__">No term assigned</option>
                    )}
                  </select>
                </div>

                <div id={`${amendmentPickerId}-listbox`} role="listbox" aria-label={`Eligible ${form.type.toLowerCase()} amendments`} className="max-h-72 overflow-y-auto p-1.5">
                  <button
                    id={`${amendmentPickerId}-option-0`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={!form.amendsOrdinanceId}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectAmendment('')}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-secondary/70 ${activeAmendmentOption === 0 ? 'bg-secondary/70' : ''}`}
                  >
                    <span className="font-medium text-foreground">This is a new {form.type.toLowerCase()}</span>
                    {!form.amendsOrdinanceId && <Check size={15} aria-hidden="true" className="shrink-0 text-primary" />}
                  </button>

                  {visibleAmendments.map((candidate, index) => (
                    <button
                      key={candidate._id}
                      id={`${amendmentPickerId}-option-${index + 1}`}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={String(candidate._id) === String(form.amendsOrdinanceId || '')}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => selectAmendment(candidate._id)}
                      className={`flex w-full items-start justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/70 ${activeAmendmentOption === index + 1 ? 'bg-secondary/70' : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{candidate.number}</span>
                        <span className="mt-0.5 block break-words text-xs text-muted-foreground">{candidate.title}</span>
                        {getMeasureTermLabel(candidate) && (
                          <span className="mt-1 block text-[11px] text-muted-foreground">{getMeasureTermLabel(candidate)}</span>
                        )}
                      </span>
                      {String(candidate._id) === String(form.amendsOrdinanceId || '') && (
                        <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}

                  {visibleAmendments.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No eligible {form.type.toLowerCase()}s match this search.
                    </p>
                  )}
                </div>

                {filteredAmendments.length > MAX_VISIBLE_AMENDMENT_OPTIONS && (
                  <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    Showing the {MAX_VISIBLE_AMENDMENT_OPTIONS} newest matches. Type more to narrow the list.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Select the latest filed measure being amended. Measures from earlier terms are included. Draft amendments cannot be linked.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            {form.type} Number{!isEditing && !isResolution ? ` (${manualNumberEntry ? 'Manual' : 'Automatic'})` : ''} *
          </label>
          <input
            id="ord-number"
            placeholder={numberLoading ? 'Finding next number…' : `e.g. ${isResolution ? 'RES-2026-001' : '2026-001'}`}
            value={form.number}
            onChange={e => set('number', e.target.value)}
            readOnly={!isEditing && !isResolution && !manualNumberEntry}
            className={`w-full px-3.5 py-2.5 bg-background border rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${fieldError('number') ? 'border-destructive' : 'border-input'}`}
          />
          {fieldError('number') && <span className="text-[11px] text-destructive mt-1 block">{form.type} number is required.</span>}
          {!isEditing && !isResolution && (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {manualNumberEntry
                  ? 'Use YYYY-NNN and make sure the year matches the series year. The number must be unused.'
                  : numberLoading
                    ? 'Finding the next available ordinance number…'
                    : numberError
                      ? 'Automatic numbering is unavailable. You can enter a number manually.'
                      : 'Generated as YYYY-NNN from the next available ordinance number for this series year.'}
              </p>
              <button
                type="button"
                onClick={() => onManualNumberEntryChange?.(!manualNumberEntry)}
                aria-pressed={manualNumberEntry}
                className="shrink-0 text-[11px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
              >
                {manualNumberEntry ? 'Use automatic number' : 'Enter manually'}
              </button>
            </div>
          )}
          {numberError && <span className="mt-1 block text-[11px] text-destructive">{numberError}</span>}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Series Year</label>
          <input
            type="number"
            id="ord-series-year"
            required={form.type === 'Ordinance'}
            min="1900"
            max="9999"
            step="1"
            placeholder="e.g. 2026"
            value={form.seriesYear || ''}
            onChange={e => set('seriesYear', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
          />
          {fieldError('seriesYear') && <span className="mt-1 block text-[11px] text-destructive">Enter a four-digit series year.</span>}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Sector Tag</label>
          <select
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
            value={form.sectorTag}
            onChange={e => set('sectorTag', e.target.value)}
          >
            {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Primary Author / Proponent *</label>
          <select
            id="ord-proponent"
            value={form.proponentId}
            onChange={e => set('proponentId', e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-background border rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${fieldError('proponentId') ? 'border-destructive' : 'border-input'}`}
          >
            <option value="">Select proponent councilor…</option>
            {members
              .filter(m => {
                const activeTermId = form.termId || terms.find(t => t.isCurrent)?._id;
                const matchesTerm = Boolean(activeTermId) && m.termId === activeTermId;
                const isNotViceMayor = m.position !== 'Vice Mayor';
                return matchesTerm && isNotViceMayor;
              })
              .map(m => <option key={m._id} value={m._id}>{m.name} – {m.position}</option>)}
          </select>
          {fieldError('proponentId') && <span className="text-[11px] text-destructive mt-1 block">Please select a proponent.</span>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="co-author-search" className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Co-Authors (Optional)
            </label>
            <span className="shrink-0 text-xs text-muted-foreground">
              {selectedCoAuthorIds.length} selected
            </span>
          </div>

          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="co-author-search"
              type="search"
              value={coAuthorSearch}
              onChange={event => setCoAuthorSearch(event.target.value)}
              placeholder="Search SB members by name or position"
              className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="mt-2">
            <label htmlFor="co-author-term" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Legislative term
            </label>
            <select
              id="co-author-term"
              value={coAuthorTermSelection}
              onChange={event => setCoAuthorTermSelection(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="__default__">
                {defaultCoAuthorTerm
                  ? `Measure's term — ${defaultCoAuthorTerm.label} (${defaultCoAuthorTerm.startYear}-${defaultCoAuthorTerm.endYear})`
                  : 'Measure/current term — no current term set'}
              </option>
              <option value="__all__">All terms</option>
              {terms.filter(term => String(term._id) !== defaultCoAuthorTermId).map(term => (
                <option key={term._id} value={term._id}>
                  {term.label} ({term.startYear}-{term.endYear})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Selected co-authors
            </p>
            {selectedCoAuthors.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Selected co-authors">
                {selectedCoAuthors.map(member => (
                  <li key={member._id}>
                    <button
                      type="button"
                      onClick={() => toggleCoAuthor(member._id)}
                      aria-label={`Remove ${member.name} from co-authors`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-1 pl-2.5 pr-1.5 text-xs text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="truncate">{member.name}</span>
                      <X size={13} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No co-authors selected.</p>
            )}
            {unavailableCoAuthorCount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {unavailableCoAuthorCount} selected {unavailableCoAuthorCount === 1 ? 'member is' : 'members are'} no longer active or available.
              </p>
            )}
          </div>

          <div className="mt-3 max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-input bg-background p-1.5" role="group" aria-label="Available co-authors">
            {filteredCoAuthors.map(member => {
              const checked = selectedCoAuthorIds.includes(member._id);
              const termId = String(typeof member.termId === 'object' ? member.termId?._id || '' : member.termId || '');
              const memberTerm = terms.find(term => String(term._id) === termId);
              return (
                <label key={member._id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-xs text-foreground hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCoAuthor(member._id)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{member.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {member.position}{memberTerm ? ` · ${memberTerm.label}` : ''}
                    </span>
                  </span>
                </label>
              );
            })}
            {filteredCoAuthors.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No SB members match this search and term.
              </p>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Showing active SB members for the measure's term by default. Choose All terms to include members from earlier terms.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Official Title *</label>
        <input
          id="ord-title"
          spellCheck={true}
          placeholder="Full official title of the proposed measure…"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className={`w-full px-3.5 py-2.5 bg-background border rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${fieldError('title') ? 'border-destructive' : 'border-input'}`}
        />
        {fieldError('title') && <span className="text-[11px] text-destructive mt-1 block">Title is required.</span>}
      </div>

      {/* Resolution Deliberation Details */}
      {isResolution && (
        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Resolution Motion &amp; Deliberation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Moved By</label>
              <select
                value={form.motionBy || ''}
                onChange={e => set('motionBy', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Default (Authored by Proponent)</option>
                {members.map(m => (
                  <option key={m._id} value={m._id}>{m.name} – {m.position}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Seconded By</label>
              <div className="border border-input rounded-md p-2 bg-background max-h-28 overflow-y-auto space-y-1">
                {members.map(m => {
                  const isChecked = Array.isArray(form.secondedBy) && form.secondedBy.includes(m._id);
                  return (
                    <label key={m._id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/30 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSeconded(m._id)}
                        className="accent-primary"
                      />
                      <span>{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="ord-distribution" className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Distribution / Recipients</label>
            <MultiValueInput
              id="ord-distribution"
              value={form.distribution || []}
              onChange={handleDistributionChange}
              placeholder="Enter recipient email…"
              ariaLabel="Add a distribution recipient email"
            />
            {distributionError && <span className="text-[11px] text-destructive mt-1 block">{distributionError}</span>}
          </div>
        </div>
      )}

      {/* Workflow Guidance Banner */}
      <div className="p-3 bg-muted/20 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
        <span>
          📌 <strong>Legislative Workflow Rule:</strong> Lead committee selection is performed exclusively during the <strong>Committee Assignment</strong> stage after First Reading.
        </span>
      </div>
    </div>
  );
}
