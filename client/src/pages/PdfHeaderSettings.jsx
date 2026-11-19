import { useEffect, useState } from 'react';
import { ImageUp, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import PageSkeleton from '../components/ui/PageSkeleton';

const MAX_HEADER_BYTES = 10 * 1024 * 1024;

export default function PdfHeaderSettings() {
  const [settings, setSettings] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.getPdfHeaderSettings()
      .then((result) => { if (active) setSettings(result); })
      .catch((error) => toast.error(error.message || 'Could not load the PDF header.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Choose a PDF header file.');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_HEADER_BYTES) {
      toast.error('The PDF header file must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const saveHeader = async (event) => {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('header', file);
      const updated = await api.updatePdfHeaderSettings(form);
      setSettings(updated);
      setFile(null);
      toast.success('PDF header updated.');
    } catch (error) {
      toast.error(error.message || 'Could not update the PDF header.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">PDF Header Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview the header used on session minutes, ordinances, and resolutions, then upload a replacement.
        </p>
      </header>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Current PDF header</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.source === 'custom' ? 'Custom header currently in use.' : 'Built-in header currently in use.'}
          </p>
        </div>
        <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background p-4">
          {(previewUrl || settings?.dataUrl) ? (
            (file?.type || settings?.mimeType) === 'application/pdf' ? (
              <iframe
                src={previewUrl || settings.dataUrl}
                title={file ? 'Preview of the selected PDF header' : 'Current PDF header'}
                className="h-[32rem] w-full rounded-md border-0"
              />
            ) : (
            <img
              src={previewUrl || settings.dataUrl}
              alt={file ? 'Preview of the selected PDF header' : 'Current PDF header'}
              className="max-h-48 w-full object-contain"
            />
            )
          ) : (
            <p className="text-sm text-muted-foreground">No PDF header is available.</p>
          )}
        </div>

        <form onSubmit={saveHeader} className="space-y-4 border-t border-border pt-5">
          <div>
            <label htmlFor="pdf-header-file" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
              Upload a one-page PDF header
            </label>
            <input
              id="pdf-header-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={chooseFile}
              disabled={saving}
              className="w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-secondary/80"
            />
            <p className="mt-1 text-xs text-muted-foreground">One-page PDF, up to 10 MB. It will be used as the background on generated session, ordinance, and resolution PDFs.</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <ImageUp size={16} />}
              {saving ? 'Saving header…' : 'Save PDF header'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
