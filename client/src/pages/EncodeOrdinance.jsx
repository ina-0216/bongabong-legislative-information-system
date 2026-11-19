import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { normalizeArray } from '../utils/normalizeResponse';
import { Save, ArrowLeft, FileText, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SECTORS } from '../constants/committees';
import OrdinanceBasicInfoSection from '../components/features/OrdinanceBasicInfoSection';
import OrdinanceProvisionsSection from '../components/features/OrdinanceProvisionsSection';
import SpellCheckModal from '../components/features/SpellCheckModal';
import { useSpellCheck } from '../hooks/useSpellCheck';
import FileUpload from '../components/ui/FileUpload';
import ExtractedDataReview from '../components/ExtractedDataReview';

export const IMPORT_DOCUMENT_SIZE_COPY = 'Maximum size: PDF 100 MiB; DOCX 15 MiB.';

const plainTextFromHtml = (html = '') => String(html)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const serializeSections = (sections = []) => sections
  .map(({ title = '', content = '' }) => {
    const contentText = plainTextFromHtml(content);
    if (!contentText) return '';

    const sectionTitle = String(title).trim();
    const titleText = plainTextFromHtml(sectionTitle);
    const heading = sectionTitle && !contentText.startsWith(titleText)
      ? `<p><strong>${escapeHtml(sectionTitle)}</strong></p>`
      : '';
    return `${heading}${content}`;
  })
  .filter(Boolean)
  .join('<p><br></p>');

const mergeLegacySectionsIntoProvisions = (provisions = '', sections = []) => {
  let body = provisions || '';
  let bodyText = plainTextFromHtml(body);

  sections.forEach(({ title = '', content = '' }) => {
    const sectionText = plainTextFromHtml(content);
    const sectionTitle = String(title).trim();
    const titleText = plainTextFromHtml(sectionTitle);
    const contentAlreadyPresent = sectionText.length > 24 && bodyText.includes(sectionText);
    const titleAlreadyPresent = titleText && bodyText.includes(titleText);
    if (contentAlreadyPresent && (!sectionTitle || titleAlreadyPresent)) return;

    const titleIsInContent = sectionTitle && sectionText.startsWith(plainTextFromHtml(sectionTitle));
    const heading = sectionTitle && !titleAlreadyPresent && !titleIsInContent
      ? `<p><strong>${escapeHtml(sectionTitle)}</strong></p>`
      : '';

    const appendedContent = contentAlreadyPresent ? '' : content;
    if (!heading && !appendedContent) return;
    body = `${body}${body ? '<p><br></p>' : ''}${heading}${appendedContent}`;
    bodyText = plainTextFromHtml(body);
  });

  return body;
};

// eslint-disable-next-line react-refresh/only-export-components
export function prepareOrdinancePayload(form, { isEditing, asDraft }) {
  const payload = { ...form, isDraft: asDraft };
  if (isEditing || asDraft) delete payload.amendsOrdinanceId;
  if (isEditing) delete payload.type;

  Object.keys(payload).forEach((key) => {
    if ((!isEditing || ['termId', 'proponentId', 'number', 'title'].includes(key))
      && (payload[key] === '' || payload[key] === null || payload[key] === undefined)) {
      delete payload[key];
    }
  });

  // Effectivity Date is not editable in either form. Ignore stale values from
  // local drafts and omit the blank state from edit requests as well.
  delete payload.effectivityDate;
  return payload;
}

const sectionsForEditor = (provisions = '', sections = []) => {
  const mergedProvisions = mergeLegacySectionsIntoProvisions(provisions, sections);
  const savedSections = Array.isArray(sections)
    ? sections
      .filter(section => section && typeof section === 'object')
      .map(({ title = '', content = '' }) => ({ title: String(title), content: String(content) }))
    : [];

  // Use structured records when they fully represent the saved legal body.
  // Older records may contain extra text in `provisions`, so keep the merged
  // body intact in one editor card when the sources differ.
  if (savedSections.length && plainTextFromHtml(serializeSections(savedSections)) === plainTextFromHtml(mergedProvisions)) {
    return savedSections;
  }

  return mergedProvisions
    ? [{ title: '', content: mergedProvisions }]
    : [{ title: 'Section 1.', content: '' }];
};

const sectionHeadingPattern = /^\s*(?:SECTION|SEC\.?)\s+(\d+[A-Z]?)\s*[.:)\-–—]?\s*(.*)$/i;

const textToEditorHtml = (value = '') => String(value)
  .split(/\n\s*\n/)
  .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
  .filter(Boolean)
  .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
  .join('');

/**
 * Convert the extractor's plain-text legal body into the structured section
 * records used by the ordinance form. Text before the first numbered section
 * (usually the enacting clause) is intentionally excluded because it has its
 * own form field.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const parseExtractedOrdinanceSections = (provisions = '') => {
  const lines = String(provisions || '').replace(/\r\n?/g, '\n').split('\n');
  const sections = [];
  let current = null;

  const saveCurrent = () => {
    if (!current) return;
    sections.push({ ...current, content: textToEditorHtml(current.content) });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = sectionHeadingPattern.exec(line);

    if (match && sections.length < 40) {
      saveCurrent();

      const number = match[1];
      const headingText = match[2].trim();
      const titleAndBody = headingText.match(/^(.{1,120}?[.!?:])(?:\s+(.+))?$/);
      const startsLikeBody = /^(?:this|the|it|all|any|a|an|every|there|shall|must|may|is|are|will)\b/i.test(headingText);
      const hasTitle = Boolean(headingText) && !startsLikeBody && (titleAndBody || headingText.length <= 80);
      const titleText = hasTitle ? (titleAndBody?.[1] || headingText) : '';
      const inlineBody = titleAndBody?.[2] || (!hasTitle ? headingText : '');

      current = {
        title: `Section ${number}.${titleText ? ` ${titleText}` : ''}`,
        content: inlineBody,
      };
      continue;
    }

    if (current && line) {
      current.content = `${current.content}${current.content ? '\n' : ''}${line}`;
    } else if (current && !line && current.content && !current.content.endsWith('\n')) {
      current.content += '\n\n';
    }
  }

  saveCurrent();
  if (sections.length) return sections;

  return [{ title: '', content: textToEditorHtml(String(provisions || '').trim()) }];
};

// eslint-disable-next-line react-refresh/only-export-components
export const mergeExtractedDataIntoForm = (previous, data, manuallyEditedFields = new Set(), matchProponent = () => '') => {
  const next = { ...previous };
  const canSet = (field) => !manuallyEditedFields.has(field);
  const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

  if (hasValue(data.type) && canSet('type') && (!previous.type || previous.type === 'Ordinance')) {
    next.type = data.type;
  }
  // The number generator fills this field automatically. An extracted number
  // replaces that generated default unless the author has edited the number.
  if (hasValue(data.number) && canSet('number')) next.number = data.number;
  if (hasValue(data.seriesYear) && canSet('seriesYear')) {
    const seriesYear = Number(data.seriesYear);
    const currentYear = new Date().getFullYear();
    if (Number.isInteger(seriesYear) && (!previous.seriesYear || Number(previous.seriesYear) === currentYear)) {
      next.seriesYear = seriesYear;
    }
  }
  if (hasValue(data.sectorTag) && canSet('sectorTag') && (!previous.sectorTag || previous.sectorTag === 'General')) {
    next.sectorTag = data.sectorTag;
  }

  for (const field of ['title', 'explanatoryNote', 'enactingClause', 'penaltyClause']) {
    if (hasValue(data[field]) && canSet(field) && !previous[field]) next[field] = data[field];
  }

  if (hasValue(data.provisions) && canSet('provisions') && canSet('sections') && !previous.provisions) {
    if (next.type === 'Ordinance') {
      next.sections = parseExtractedOrdinanceSections(data.provisions);
      next.provisions = serializeSections(next.sections);
    } else {
      next.provisions = data.provisions;
    }
  }

  if (hasValue(data.proponent) && canSet('proponentId') && !previous.proponentId) {
    const memberId = matchProponent(data.proponent);
    if (memberId) next.proponentId = memberId;
  }

  return next;
};

export default function EncodeOrdinance() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [members, setMembers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [amendmentCandidates, setAmendmentCandidates] = useState([]);
  const [form, setForm] = useState({
    type: 'Ordinance',
    number: '',
    title: '',
    title_tl: '',
    amendsOrdinanceId: '',
    proponentId: '',
    termId: '',
    sectorTag: 'General',
    seriesYear: new Date().getFullYear(),
    coAuthors: [],
    motionBy: '',
    secondedBy: [],
    adoptionResult: '',
    adoptionDate: '',
    distribution: [],
    explanatoryNote: '',
    definitionsOfTerms: '',
    enactingClause: '',
    provisions: '',
    penaltyClause: '',
    effectivityDate: '',
    plainLanguageSummary: '',
    plainLanguageSummary_tl: '',
    sections: [{ title: 'Section 1.', content: '' }],
    isDraft: false,
  });
  const [loading, setLoading] = useState(false);
  const [numberLoading, setNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState('');
  const [manualNumberEntry, setManualNumberEntry] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingAction, setPendingAction] = useState('save');
  const [spellModal, setSpellModal] = useState({ isOpen: false, issues: [] });
  // Document-import state: the extraction payload is held while the user
  // reviews it in the modal, and only merged into the form on acceptance.
  const [extraction, setExtraction] = useState(null);
  const [manuallyEditedFields, setManuallyEditedFields] = useState(() => new Set());
  const [numberIsProtected, setNumberIsProtected] = useState(false);
  const { checkFields } = useSpellCheck();

  // Auto-save logic
  useEffect(() => {
    if (id) return; // Don't auto-save edits, only drafts
    const saved = localStorage.getItem('ordinance_draft');
    if (saved) {
      try {
        const { form: savedForm, sections: savedSections = [] } = JSON.parse(saved);
        if (savedForm) {
          const sections = savedForm.type === 'Resolution'
            ? []
            : sectionsForEditor(savedForm.provisions, savedForm.sections?.length ? savedForm.sections : savedSections);
          setForm({
            ...savedForm,
            sections,
            provisions: savedForm.type === 'Resolution' ? savedForm.provisions : serializeSections(sections),
          });
        }
      } catch {
        localStorage.removeItem('ordinance_draft');
      }
    }
  }, [id]);

  useEffect(() => {
    if (id || form.type !== 'Ordinance') {
      setNumberLoading(false);
      setNumberError('');
      return undefined;
    }
    if (!/^\d{4}$/.test(String(form.seriesYear || ''))) {
      setNumberLoading(false);
      setNumberError('Enter a four-digit series year to generate an ordinance number.');
      return undefined;
    }
    if (numberIsProtected) {
      setNumberLoading(false);
      setNumberError('');
      return undefined;
    }

    let current = true;
    setNumberLoading(true);
    setNumberError('');
    api.getNextOrdinanceNumber(form.seriesYear)
      .then((result) => {
        if (current) setForm((previous) => ({ ...previous, number: result.number }));
      })
      .catch((error) => {
        if (current) setNumberError(error.message || 'Could not generate the next ordinance number. Try again.');
      })
      .finally(() => {
        if (current) setNumberLoading(false);
      });

    return () => { current = false; };
  }, [id, form.type, form.seriesYear, numberIsProtected]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('ordinance_draft', JSON.stringify({ form }));
    }
  }, [form, id]);

  const fieldError = (key) => submitted && !form[key]?.toString().trim();

  useEffect(() => {
    api.getSBMembers('limit=0').then(res => setMembers(normalizeArray(res))).catch(() => {});
    api.getTerms().then(res => setTerms(normalizeArray(res))).catch(() => {});
    api.getOrdinances('limit=9999&page=1&isDraft=false')
      .then(res => setAmendmentCandidates(normalizeArray(res)))
      .catch(() => setAmendmentCandidates([]));
    if (id) {
      setLoading(true);
      api.getOrdinance(id).then(o => {
        setForm({
          type: o.type || 'Ordinance',
          number: o.number || '',
          title: o.title || '',
          title_tl: o.title_tl || '',
          amendsOrdinanceId: o.amendsOrdinanceId?._id || o.amendsOrdinanceId || '',
          proponentId: o.proponentId?._id || o.proponentId || '',
          termId: o.termId?._id || o.termId || '',
          sectorTag: o.sectorTag || 'General',
          seriesYear: o.seriesYear || (o.createdAt ? new Date(o.createdAt).getFullYear() : new Date().getFullYear()),
          coAuthors: Array.isArray(o.coAuthors) ? o.coAuthors.map(c => c._id || c) : [],
          motionBy: o.motionBy?._id || o.motionBy || '',
          secondedBy: Array.isArray(o.secondedBy) ? o.secondedBy.map(s => s._id || s) : [],
          adoptionResult: o.adoptionResult || '',
          adoptionDate: o.adoptionDate ? o.adoptionDate.split('T')[0] : '',
          distribution: Array.isArray(o.distribution) ? o.distribution : [],
          explanatoryNote: o.explanatoryNote || '',
          definitionsOfTerms: o.definitionsOfTerms || '',
          enactingClause: o.enactingClause || '',
          sections: o.type === 'Resolution' ? [] : sectionsForEditor(o.provisions, o.sections),
          provisions: o.type === 'Resolution'
            ? mergeLegacySectionsIntoProvisions(o.provisions, o.sections)
            : serializeSections(sectionsForEditor(o.provisions, o.sections)),
          penaltyClause: o.penaltyClause || '',
          effectivityDate: o.effectivityDate ? o.effectivityDate.split('T')[0] : '',
          plainLanguageSummary: o.plainLanguageSummary || '',
          plainLanguageSummary_tl: o.plainLanguageSummary_tl || '',
          isDraft: o.isDraft || o.status === 'Draft' || false,
        });
      }).catch(err => toast.error(err.message)).finally(() => setLoading(false));
    }
  }, [id]);

  const set = (k, v) => {
    if (k === 'type') {
      setManualNumberEntry(false);
      setNumberIsProtected(false);
    }
    if (k === 'number') setNumberIsProtected(Boolean(v));
    setManuallyEditedFields((current) => {
      const next = new Set(current);
      next.add(k);
      if (k === 'sections') next.add('provisions');
      return next;
    });
    setForm(p => {
      if (k === 'sections') return { ...p, sections: v, provisions: serializeSections(v) };
      if (k === 'type' && v === 'Ordinance') {
        const sections = p.sections?.length ? p.sections : sectionsForEditor(p.provisions);
        return { ...p, type: v, sections, provisions: serializeSections(sections) };
      }
      return { ...p, [k]: v };
    });
    if (submitted) setSubmitted(false);
  };

  const handleManualNumberEntryChange = (enabled) => {
    setManualNumberEntry(enabled);
    setNumberIsProtected(enabled);
  };

  /**
   * Finds the current-term member whose name matches the extracted proponent.
   *
   * The extractor can only report a name — it does not know the council
   * roster. Matching here lets the import set the proponent dropdown, and
   * leaves it blank when the name does not match anyone so the user picks
   * manually rather than the wrong councilor being filed.
   */
  const matchProponentToMember = (name) => {
    if (!name) return '';
    const normalized = name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';

    const activeTermId = form.termId || terms.find(t => t.isCurrent)?._id;
    const pool = members.filter((member) => {
      if (!activeTermId) return true;
      return member.termId === activeTermId;
    });

    const match = pool.find((member) => {
      const memberName = (member.name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
      if (!memberName) return false;
      return memberName === normalized || memberName.includes(normalized) || normalized.includes(memberName);
    });

    return match?._id || '';
  };

  /**
   * Merges the reviewed extraction into the form.
   *
   * Only fields the user actually accepted are written, and a field the user
   * has already filled in by hand is never overwritten.
   */
  const applyExtraction = (data) => {
    if (data.number) setNumberIsProtected(true);
    setForm((previous) => mergeExtractedDataIntoForm(
      previous,
      data,
      manuallyEditedFields,
      matchProponentToMember
    ));
    setManuallyEditedFields((current) => {
      const next = new Set(current);
      for (const [field, value] of Object.entries(data)) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          next.add(field === 'proponent' ? 'proponentId' : field);
        }
      }
      if (data.provisions) next.add('sections');
      return next;
    });

    setExtraction(null);
    toast.success('Document imported. Review the populated fields before saving.');
  };

  const handleExtractionComplete = (payload) => {
    setExtraction(payload);
  };

  const handleExtractionError = (message) => {
    toast.error(message || 'Could not read the uploaded document.');
  };

  const handleInitiateSubmit = async (e, action = 'save') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!id && form.type === 'Ordinance' && (numberLoading || numberError)) {
      toast.error(numberLoading ? 'Wait for the ordinance number to finish generating.' : numberError);
      return;
    }
    setSubmitted(true);
    setPendingAction(action);

    const savingDraft = action === 'draft' || (action === 'save' && id && form.isDraft);
    const required = savingDraft
      ? ['number', 'title', 'proponentId']
      : ['number', 'title', 'proponentId', 'explanatoryNote', 'provisions'];
    if (form.type === 'Ordinance') required.push('seriesYear');

    const hasErrors = required.some(k => !form[k]?.toString().trim());
    if (hasErrors) {
      toast.error(
        savingDraft
          ? 'Please enter Number, Series Year, Title, and Proponent to save draft.'
          : 'Please fill in all required fields, including the four-digit Series Year.'
      );
      return;
    }

    // Run spell-check across all text fields before saving
    toast.loading('Checking spelling…', { id: 'spell-check' });
    const spellFields = [
      { label: 'Title', value: form.title },
      { label: 'Title (Filipino)', value: form.title_tl },
      { label: 'Explanatory Note / Preamble', value: form.explanatoryNote },
      { label: 'Definitions of Terms', value: form.definitionsOfTerms },
      { label: 'Enacting Clause', value: form.enactingClause },
      { label: 'General Provisions / Resolved Clauses', value: form.provisions },
      { label: 'Penalty Clause', value: form.penaltyClause },
      { label: 'Plain Language Summary', value: form.plainLanguageSummary },
    ];
    const issues = await checkFields(spellFields);
    toast.dismiss('spell-check');
    if (issues.length === 0) {
      executeSubmit(action);
    } else {
      setSpellModal({ isOpen: true, issues });
    }
  };

  const executeSubmit = async (action = pendingAction) => {
    setLoading(true);
    try {
      const asDraft = action === 'draft' || (action === 'save' && id && form.isDraft);
      const payload = prepareOrdinancePayload(form, { isEditing: Boolean(id), asDraft });

      if (form.type === 'Ordinance') {
        payload.sections = (form.sections || []).map(({ title = '', content = '' }) => ({ title, content }));
        payload.provisions = serializeSections(payload.sections);
      } else {
        payload.sections = [];
      }

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'coAuthors' || key === 'secondedBy' || key === 'distribution' || key === 'sections') {
          body.append(key, JSON.stringify(value));
        } else {
          body.append(key, value);
        }
      });
      const ord = id
        ? await api.updateOrdinance(id, body)
        : await api.createOrdinance(body);

      if (!id) localStorage.removeItem('ordinance_draft');
      toast.success(
        id
          ? `${form.type} updated successfully!`
          : asDraft
            ? `${form.type} draft saved successfully!`
            : `${form.type} filed into First Reading successfully!`
      );
      navigate(`/ordinances/${ord._id}`);
    } catch (err) {
      if (!id && form.type === 'Ordinance' && /already assigned|already exists/i.test(err.message || '')) {
        try {
          const nextNumber = await api.getNextOrdinanceNumber(form.seriesYear);
          setForm((previous) => ({ ...previous, number: nextNumber.number }));
          toast.error(`That number was just used. The form now has ${nextNumber.number}; review it and submit again.`);
          return;
        } catch {
          // Keep the original server message if refreshing the suggestion fails.
        }
      }
      toast.error(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto space-y-6 min-w-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/ordinances')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Repository
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {id ? `Edit ${form.type}` : `Author ${form.type}`}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fill in official legislative parameters and structured provisions. Lead committee is assigned at Committee Assignment stage.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleInitiateSubmit(e, 'save')} className="space-y-6">
        <OrdinanceBasicInfoSection
          form={form}
          fieldError={fieldError}
          set={set}
          members={members}
          terms={terms}
          amendmentCandidates={amendmentCandidates}
          isEditing={!!id}
          sectorOptions={SECTORS}
          numberLoading={numberLoading}
          numberError={numberError}
          manualNumberEntry={manualNumberEntry}
          onManualNumberEntryChange={handleManualNumberEntryChange}
        />

        <OrdinanceProvisionsSection form={form} fieldError={fieldError} set={set} />

        {/* Document Import — auto-extract text from PDF/DOCX and populate fields */}
        <section className="bg-card border border-border rounded-xl shadow-xs p-6 space-y-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Import Document (Auto-fill Fields)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a PDF or DOCX of an existing ordinance/resolution. The system will
              extract key fields (number, title, author, explanatory note, provisions)
              and let you review before populating the form. {IMPORT_DOCUMENT_SIZE_COPY}
            </p>
          </div>
          <FileUpload
            onExtractComplete={handleExtractionComplete}
            onError={handleExtractionError}
            disabled={loading}
          />
        </section>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/ordinances')}
            className="px-4 py-2.5 text-xs font-semibold text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>

          {(!id || form.isDraft) && (
            <button
              type="button"
              disabled={loading || numberLoading || Boolean(numberError) || Boolean(form.amendsOrdinanceId)}
              onClick={(e) => handleInitiateSubmit(e, 'draft')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-background border border-border text-foreground hover:bg-muted/50 font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileText size={15} />
              Save as Draft
            </button>
          )}

          {id && form.isDraft && (
            <button
              type="button"
              disabled={loading || numberLoading || Boolean(numberError)}
              onClick={(e) => handleInitiateSubmit(e, 'file')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send size={15} /> File &amp; Introduce
            </button>
          )}

          <button
            type="submit"
            disabled={loading || numberLoading || Boolean(numberError)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {id ? <Save size={15} /> : <Send size={15} />}
            {loading ? 'Saving…' : id ? 'Save Changes' : 'File & Introduce (First Reading)'}
          </button>
        </div>
      </form>

      {/* Pre-Save Spell Check Modal */}
      <SpellCheckModal
        isOpen={spellModal.isOpen}
        issues={spellModal.issues}
        isSaving={loading}
        onClose={() => setSpellModal({ isOpen: false, issues: [] })}
        onSaveAnyway={() => {
          setSpellModal({ isOpen: false, issues: [] });
          executeSubmit(pendingAction);
        }}
      />
    {extraction ? (
      <ExtractedDataReview
        textPreview={extraction.textPreview}
        candidates={extraction.candidates}
        overallConfidence={extraction.overallConfidence}
        sourceType={extraction.sourceType}
        onAccept={applyExtraction}
        onReject={() => setExtraction(null)}
      />
    ) : null}
    </motion.div>
  );
}
