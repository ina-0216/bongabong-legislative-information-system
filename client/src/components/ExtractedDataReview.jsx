import { useState } from 'react';
import {
  FileText,
} from 'lucide-react';

const CONFIDENCE_COLORS = {
  0.9: 'text-emerald-600',
  0.75: 'text-emerald-500',
  0.7: 'text-amber-500',
  0.6: 'text-amber-400',
  0.55: 'text-amber-300',
  0.5: 'text-amber-200',
};

const CONFIDENCE_LABELS = {
  0.9: 'Very High',
  0.75: 'High',
  0.7: 'Medium',
  0.6: 'Low Medium',
  0.55: 'Low',
  0.5: 'Uncertain',
};

const DEFAULT_LABELS = {
  documentType: 'Document Type',
  ordinanceNumber: 'Ordinance Number',
  seriesYear: 'Series Year',
  measureTitle: 'Measure Title',
  primaryAuthor: 'Primary Author',
  sector: 'Sector',
  explanatoryNote: 'Explanatory Note',
  enactingClause: 'Enacting Clause',
  generalProvisions: 'General Provisions',
  penaltyClause: 'Penalty Clause',
  notDetected: 'Not detected',
  extractedDataReview: 'Extracted Data Review',
  documentSource: 'Source:',
  extractedTextPreview: 'Extracted Text Preview',
  showLess: 'Show less',
  showMore: 'Show more',
  edit: 'Edit',
  extractionConfident: 'Extraction looks confident',
  extractionReview: 'Please review extracted fields',
  reintroduce: 'Start Over',
  acceptAndSave: 'Accept & Populate Form',
  accept: 'Accept',
};

export default function ExtractedDataReview({
  textPreview,
  candidates,
  overallConfidence,
  sourceType,
  onAccept,
  onReject,
}) {
  const [showFullText, setShowFullText] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [editingField, setEditingField] = useState(null);

  const getColorClass = (confidence) => {
    return CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS['0.5'];
  };

  const getConfidenceLabel = (confidence) =>
    CONFIDENCE_LABELS[confidence] || 'Review';

  const fieldComponents = [
    { name: 'type', label: DEFAULT_LABELS.documentType, field: candidates.type },
    { name: 'number', label: DEFAULT_LABELS.ordinanceNumber, field: candidates.number },
    { name: 'seriesYear', label: DEFAULT_LABELS.seriesYear, field: candidates.seriesYear },
    { name: 'title', label: DEFAULT_LABELS.measureTitle, field: candidates.title },
    { name: 'proponent', label: DEFAULT_LABELS.primaryAuthor, field: candidates.proponent },
    { name: 'sectorTag', label: DEFAULT_LABELS.sector, field: candidates.sectorTag },
    { name: 'explanatoryNote', label: DEFAULT_LABELS.explanatoryNote, field: candidates.explanatoryNote },
    { name: 'enactingClause', label: DEFAULT_LABELS.enactingClause, field: candidates.enactingClause },
    { name: 'provisions', label: DEFAULT_LABELS.generalProvisions, field: candidates.provisions },
    { name: 'penaltyClause', label: DEFAULT_LABELS.penaltyClause, field: candidates.penaltyClause },
  ];
  const hasReviewableValue = fieldComponents.some(({ name, field }) =>
    Boolean(editedFields[name] ?? field?.value)
  );

  const confidenceSummary = overallConfidence >= 0.75 ? (
    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
      <p className="font-medium text-emerald-600">{DEFAULT_LABELS.extractionConfident}</p>
      <p className="text-emerald-500">{overallConfidence.toFixed(1)} / 1.0</p>
    </div>
  ) : (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
      <p className="font-medium text-amber-600">{DEFAULT_LABELS.extractionReview}</p>
      <p className="text-amber-500">{overallConfidence.toFixed(1)} / 1.0</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">
                {DEFAULT_LABELS.extractedDataReview}
              </h3>
              <p className="text-sm text-muted-foreground">
                {DEFAULT_LABELS.documentSource} {sourceType.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-4 space-y-4">
          {/* Confidence summary */}
          {confidenceSummary}

          {/* Extracted text preview */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">{DEFAULT_LABELS.extractedTextPreview}</p>
            <textarea
              rows={3}
              readOnly
              value={textPreview || ''}
              className={`w-full px-3 py-2 rounded-md border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${showFullText ? 'min-h-[200px]' : ''}`}
              onClick={() => setShowFullText(!showFullText)}
            />
            {showFullText && (
              <textarea
                rows={10}
                readOnly
              value={textPreview || ''}
                className={`w-full px-3 py-2 rounded-md border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20`}
            />
            )}
            <button
              className="mt-2 text-xs text-primary hover:underline transition-colors"
              onClick={() => setShowFullText(!showFullText)}
            >
              {showFullText ? DEFAULT_LABELS.showLess : DEFAULT_LABELS.showMore}
            </button>
          </div>

          {/* Field-by-field review */}
          <div className="space-y-3">
            {fieldComponents.map((comp) => {
              const field = comp.field;
              if (!field) return null;

              const value = editedFields[comp.name] ?? field.value ?? '';
              const isEditing = editingField === comp.name;
              const multiline = ['explanatoryNote', 'enactingClause', 'provisions', 'penaltyClause'].includes(comp.name);

              return (
                <div key={comp.name} className="border rounded-lg p-3 mb-2 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="font-medium text-sm">{comp.label}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${getColorClass(field.confidence)}`}>
                        {getConfidenceLabel(field.confidence)}
                      </span>
                      <button
                        type="button"
                        className="text-primary hover:underline text-sm"
                        onClick={() => {
                          if (isEditing) setEditingField(null);
                          else {
                            setEditedFields((current) => ({ ...current, [comp.name]: value }));
                            setEditingField(comp.name);
                          }
                        }}
                      >
                        {isEditing ? 'Done' : DEFAULT_LABELS.edit}
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    multiline ? (
                      <textarea
                        aria-label={`Edit ${comp.label}`}
                        value={value}
                        onChange={(event) => setEditedFields((current) => ({ ...current, [comp.name]: event.target.value }))}
                        rows={comp.name === 'provisions' ? 8 : 4}
                        className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      />
                    ) : (
                      <input
                        aria-label={`Edit ${comp.label}`}
                        value={value}
                        onChange={(event) => setEditedFields((current) => ({ ...current, [comp.name]: event.target.value }))}
                        className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      />
                    )
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{value || DEFAULT_LABELS.notDetected}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-3 justify-end">
            {/* Reject button */}
            <button
              type="button"
              onClick={onReject}
              disabled={!candidates.title?.value && !candidates.number?.value}
              className="px-4 py-2 text-sm font-medium text-destructive bg-destructive/5 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              {DEFAULT_LABELS.reintroduce}
            </button>

            {/* Accept button */}
            <button
              type="button"
              onClick={() => {
                const finalData = {
                  type: (editedFields.type ?? candidates.type?.value)?.trim() || undefined,
                  number: (editedFields.number ?? candidates.number?.value)?.trim() || undefined,
                  seriesYear: Number(editedFields.seriesYear ?? candidates.seriesYear?.value) || undefined,
                  title: (editedFields.title ?? candidates.title?.value)?.trim() || undefined,
                  proponent: (editedFields.proponent ?? candidates.proponent?.value)?.trim() || undefined,
                  sectorTag: (editedFields.sectorTag ?? candidates.sectorTag?.value)?.trim() || undefined,
                  explanatoryNote: (editedFields.explanatoryNote ?? candidates.explanatoryNote?.value)?.trim() || undefined,
                  enactingClause: (editedFields.enactingClause ?? candidates.enactingClause?.value)?.trim() || undefined,
                  provisions: (editedFields.provisions ?? candidates.provisions?.value)?.trim() || undefined,
                  penaltyClause: (editedFields.penaltyClause ?? candidates.penaltyClause?.value)?.trim() || undefined,
                  // Mark that this data was auto-extracted
                  _extractedAt: new Date().toISOString(),
                };
                onAccept(finalData);
              }}
              disabled={!hasReviewableValue}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {hasReviewableValue
                ? DEFAULT_LABELS.acceptAndSave
                : DEFAULT_LABELS.accept
            }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
