import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { MAX_ORDINANCE_PDF_UPLOAD_BYTES } from '@ibosys/api';
import { api } from '../../utils/api';
import { uploadOrdinancePdf } from '../../utils/cloudinaryPdfUpload';
import { useApiMutation } from '../../hooks/useApi';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
const MAX_PDF_SIZE = MAX_ORDINANCE_PDF_UPLOAD_BYTES;
const MAX_DOCX_SIZE = 15 * 1024 * 1024;

export default function FileUpload({
  onExtractComplete,
  onError,
  disabled = false,
  className = '',
}) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | extracting | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const extractMutation = useApiMutation({
    mutationFn: async (selectedFile) => {
      if (selectedFile.type === 'application/pdf') {
        const pdfUpload = await uploadOrdinancePdf(selectedFile);
        return api.extractDocumentText({ pdfUpload });
      }
      const formData = new FormData();
      formData.append('file', selectedFile);
      return api.extractDocumentText(formData);
    },
    invalidate: [],
    options: {
      onSuccess: (data) => {
        if (data.success && data.data) {
          setStatus('success');
          onExtractComplete?.(data.data);
        } else {
          setStatus('error');
          const message = data.error || 'Extraction returned no data.';
          setErrorMessage(message);
          onError?.(message);
        }
      },
      onError: (err) => {
        setStatus('error');
        const message = err.message || 'Extraction failed. Please try again.';
        setErrorMessage(message);
        onError?.(message);
      },
    },
  });

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!ALLOWED_TYPES[selectedFile.type]) {
      onError?.('Only PDF and DOCX files are allowed.');
      return;
    }

    const maxSize = selectedFile.type === 'application/pdf' ? MAX_PDF_SIZE : MAX_DOCX_SIZE;
    if (selectedFile.size > maxSize) {
      onError?.(selectedFile.type === 'application/pdf'
        ? 'PDF must be 100 MB or smaller.'
        : 'DOCX must be 15 MB or smaller.');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
  }, [onError]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleExtract = useCallback(async () => {
    if (!file) return;
    setStatus('extracting');

    try {
      await extractMutation.mutateAsync(file);
    } catch {
      // The mutation's onError handler stores and displays the useful message.
    }
  }, [file, extractMutation]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
  }, []);

  const isExtracting = status === 'extracting' || extractMutation.isPending;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop zone / file input */}
      <div
        className={`
          relative border-2 rounded-lg p-6 text-center transition-colors
          ${dragActive
            ? 'border-primary bg-primary/5'
            : file
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-dashed border-input hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || !!file}
          aria-label="Upload PDF or DOCX file"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText
              size={28}
              className={`${
                file.type === 'application/pdf' ? 'text-red-500' : 'text-blue-500'
              }`}
            />
            <div className="text-left">
              <p className="font-medium text-sm text-foreground truncate max-w-[200px]">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove file"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={36} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drag & drop a PDF or DOCX file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDFs up to 100 MB; DOCX files up to 15 MB
            </p>
          </div>
        )}
      </div>

      {/* Extract button / status */}
      {file && (
        <div className="flex items-center justify-center gap-3">
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">Text extracted successfully</span>
            </div>
          ) : status === 'error' ? (
            <div className="flex items-start gap-2 text-destructive" role="alert" aria-live="polite">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Extraction failed</p>
                <p className="mt-1 text-sm">{errorMessage || 'Please try again.'}</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || disabled}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {file.type === 'application/pdf' ? 'Uploading PDF and extracting text...' : 'Extracting text...'}
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Extract & Review Fields
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Progress indicator during extraction */}
      {isExtracting && (
        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full animate-pulse"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}
