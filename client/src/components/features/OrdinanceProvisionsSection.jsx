import { useState } from 'react';
import RichTextEditor from '../ui/RichTextEditor';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@ibosys/ui';

export default function OrdinanceProvisionsSection({ form, fieldError, set }) {
  const isResolution = form.type === 'Resolution';
  const [sectionToDelete, setSectionToDelete] = useState(null);

  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;

    set('sections', (form.sections || []).filter((_, index) => index !== sectionToDelete.index));
    setSectionToDelete(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
        2. Legislative Body &amp; Provisions
      </h3>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
          Definitions of Terms (Optional)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Define words or phrases that have a specific meaning in this measure.
        </p>
        <div className="overflow-hidden rounded-lg border border-input">
          <RichTextEditor
            value={form.definitionsOfTerms || ''}
            onChange={value => set('definitionsOfTerms', value)}
            placeholder={'Example: “Municipal waters” means the waters within the municipality’s jurisdiction.'}
            minHeight={120}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
          {isResolution ? 'Preamble / Whereas Recitals *' : 'Explanatory Note / Preamble *'}
        </label>
        <textarea
          rows={4}
          spellCheck={true}
          placeholder={
            isResolution
              ? "WHEREAS, the Sangguniang Bayan recognizes the importance of...\nWHEREAS, there is an urgent need to..."
              : "State the purpose, legal basis, and necessity of this measure…"
          }
          value={form.explanatoryNote}
          onChange={e => set('explanatoryNote', e.target.value)}
          className={`w-full px-3.5 py-2.5 bg-background border rounded-md text-sm text-foreground outline-none focus:border-primary ${fieldError('explanatoryNote') ? 'border-destructive' : 'border-input'}`}
        />
        {fieldError('explanatoryNote') && (
          <span className="text-[11px] text-destructive mt-1 block">
            {isResolution ? 'Preamble / Recitals are required.' : 'Explanatory note is required.'}
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
          {isResolution ? 'Resolving Clause (Optional - default will be generated)' : 'Enacting Clause'}
        </label>
        <input
          spellCheck={true}
          placeholder={
            isResolution
              ? "NOW, THEREFORE, on motion of Hon. Councilor, seconded by the body, BE IT RESOLVED..."
              : "e.g. BE IT ORDAINED by the Sangguniang Bayan of Bongabong in session assembled:"
          }
          value={form.enactingClause}
          onChange={e => set('enactingClause', e.target.value)}
          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
          {isResolution ? 'Resolved Clauses / Action Body *' : 'General Provisions / Sections *'}
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          {isResolution
            ? 'Enter the complete resolving clauses and action text here.'
            : 'Add each numbered section separately. Section titles and text are combined when the ordinance is saved.'}
        </p>
        {isResolution ? (
          <div className={`rounded-lg overflow-hidden border ${fieldError('provisions') ? 'border-destructive' : 'border-input'}`}>
            <RichTextEditor
              value={form.provisions}
              onChange={val => set('provisions', val)}
              placeholder="RESOLVED, as it is hereby resolved, to approve the request of...\n\nRESOLVED FURTHER, that copies be furnished..."
              minHeight={160}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {(form.sections || []).map((section, index) => (
              <section key={index} className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`ordinance-section-title-${index}`} className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Section {index + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSectionToDelete({
                      index,
                      title: section.title?.trim() || `Section ${index + 1}`,
                    })}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    aria-label={`Delete section ${index + 1}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Delete section
                  </button>
                </div>
                <input
                  id={`ordinance-section-title-${index}`}
                  value={section.title}
                  onChange={event => set('sections', form.sections.map((item, sectionIndex) => (
                    sectionIndex === index ? { ...item, title: event.target.value } : item
                  )))}
                  placeholder={`Section ${index + 1}. Title.`}
                  spellCheck={true}
                  className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <div className="overflow-hidden rounded-lg border border-input">
                  <RichTextEditor
                    value={section.content}
                    onChange={content => set('sections', form.sections.map((item, sectionIndex) => (
                      sectionIndex === index ? { ...item, content } : item
                    )))}
                    placeholder="Enter the text for this section…"
                    minHeight={120}
                  />
                </div>
              </section>
            ))}
            <button
              type="button"
              onClick={() => {
                const highestNumber = (form.sections || []).reduce((highest, section) => {
                  const match = /^\s*Section\s+(\d+)/i.exec(section.title || '');
                  return match ? Math.max(highest, Number(match[1])) : highest;
                }, 0);
                set('sections', [...(form.sections || []), { title: `Section ${highestNumber + 1}.`, content: '' }]);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              <Plus size={16} aria-hidden="true" />
              Add section
            </button>
          </div>
        )}
        {fieldError('provisions') && (
          <span className="text-[11px] text-destructive mt-1 block">
            {isResolution ? 'Resolved action clauses are required.' : 'General provisions are required.'}
          </span>
        )}
      </div>

      <Modal
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        title="Delete ordinance section?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Delete <strong className="text-foreground">{sectionToDelete?.title}</strong> and its text from this ordinance?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSectionToDelete(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteSection}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-destructive rounded-md hover:bg-destructive/90"
            >
              Delete section
            </button>
          </div>
        </div>
      </Modal>

      {!isResolution && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Penalty Clause</label>
          <textarea
            rows={2}
            spellCheck={true}
            placeholder="Fines or penalties for violations (if applicable)…"
            value={form.penaltyClause}
            onChange={e => set('penaltyClause', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Plain Language Summary (Public Archive)</label>
        <textarea
          rows={2}
          spellCheck={true}
          placeholder="Simplified 2-sentence summary for Bongabong citizens to easily understand…"
          value={form.plainLanguageSummary}
          onChange={e => set('plainLanguageSummary', e.target.value)}
          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
