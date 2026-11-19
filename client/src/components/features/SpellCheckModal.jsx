import { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { Modal } from '@ibosys/ui';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SpellCheckModal
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose(): void — user chose to go back and fix
 *  - onSaveAnyway(): void — user acknowledged and wants to save
 *  - issues: [{ word, fieldLabel, suggestions }]
 *  - isSaving: boolean
 */
export default function SpellCheckModal({ isOpen, onClose, onSaveAnyway, issues = [], isSaving }) {
  const [expanded, setExpanded] = useState(null);

  const toggle = useCallback((word) => {
    setExpanded(prev => prev === word ? null : word);
  }, []);

  const hasIssues = issues.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {hasIssues
            ? <AlertTriangle size={16} className="text-amber-500" />
            : <CheckCircle size={16} className="text-emerald-500" />}
          {hasIssues ? 'Possible Spelling Issues Found' : 'No Spelling Issues Found'}
        </span>
      }
    >
      <div className="space-y-4">
        {/* Summary banner */}
        {hasIssues ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <p className="font-semibold">
              {issues.length} possible {issues.length === 1 ? 'word' : 'words'} flagged for review.
            </p>
            <p className="text-amber-700">
              Review the list below. These may be typos, or intentional terms — only you can decide.
              You can go back to fix them, or save the document as-is.
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            <p className="font-semibold">All checked fields look clean!</p>
            <p>No potential spelling errors were detected across the document fields.</p>
          </div>
        )}

        {/* Issues list */}
        {hasIssues && (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
            {issues.map((issue) => (
              <div key={issue.word} className="bg-background">
                {/* Issue row */}
                <button
                  type="button"
                  onClick={() => toggle(issue.word)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Squiggly underline token */}
                    <span
                      className="font-mono text-sm font-semibold text-destructive shrink-0"
                      style={{ textDecoration: 'underline wavy #ef4444', textUnderlineOffset: '3px' }}
                    >
                      {issue.word}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      in <span className="font-medium text-foreground">{issue.fieldLabel}</span>
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: expanded === issue.word ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="shrink-0 ml-2 text-muted-foreground"
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                </button>

                {/* Suggestions panel */}
                <AnimatePresence initial={false}>
                  {expanded === issue.word && (
                    <motion.div
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-4 pb-3 pt-1 bg-muted/20">
                        {issue.suggestions.length > 0 ? (
                          <>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
                              Suggested corrections
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {issue.suggestions.map(s => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 text-xs bg-background border border-border rounded text-foreground font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No suggestions available.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
          >
            {hasIssues ? '← Go Back & Fix' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveAnyway}
            className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving…' : hasIssues ? 'Save Anyway' : 'Save Document'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
