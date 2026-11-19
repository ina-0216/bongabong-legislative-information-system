import * as Dialog from '@radix-ui/react-dialog';
import { Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';

const DOWNLOAD_COPY = {
  en: {
    trigger: 'Download B-LIS for Android',
    title: 'Get B-LIS for Android',
    description: 'Download the public portal app or scan the code with your phone camera.',
    qrTitle: 'QR code for the B-LIS Android install page',
    scan: 'Scan to open the Android install page',
    details: 'Read ordinances, resolutions, session minutes, and public updates from your Android phone.',
    download: 'Download B-LIS for Android',
    close: 'Close download dialog',
  },
  // Follow the portal catalogue policy: keep unreviewed Tagalog copy in English.
  tl: null,
};

const getAndroidInstallUrl = (value = import.meta.env.VITE_ANDROID_DOWNLOAD_URL) => {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

export default function DownloadModal({
  installUrl = import.meta.env.VITE_ANDROID_DOWNLOAD_URL,
  triggerClassName = 'v11-btn v11-btn-primary',
  triggerText,
}) {
  const { language } = useLanguage();
  const copy = DOWNLOAD_COPY[language] ?? DOWNLOAD_COPY.en;
  const buttonText = triggerText || copy.trigger;
  const safeInstallUrl = getAndroidInstallUrl(installUrl);
  if (!safeInstallUrl) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label={buttonText}
        >
          <Download size={16} aria-hidden="true" />
          <span className="max-[480px]:sr-only">{buttonText}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[121] max-h-[90vh] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-[var(--v11-rule)] bg-[var(--v11-paper)] p-6 text-[var(--v11-ink)] shadow-xl sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-5">
            <div>
              <Dialog.Title className="font-serif text-2xl font-semibold text-[var(--v11-navy)]">
                {copy.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 max-w-prose text-sm leading-6 text-[var(--v11-ink-2)]">
                {copy.description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center border border-[var(--v11-rule)] bg-white text-[var(--v11-ink)] hover:bg-[var(--v11-blue-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v11-blue)]"
                aria-label={copy.close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid gap-6 border-t border-[var(--v11-rule)] pt-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
            <div className="flex flex-col items-center gap-3 border border-[var(--v11-rule)] bg-white p-4">
              <QRCodeSVG
                value={safeInstallUrl}
                size={184}
                level="M"
                includeMargin
                title={copy.qrTitle}
                bgColor="#ffffff"
                fgColor="#191F47"
              />
              <p className="text-center text-xs font-semibold text-[var(--v11-ink-2)]">
                {copy.scan}
              </p>
            </div>

            <div className="flex flex-col items-start gap-4">
              <p className="text-sm leading-6 text-[var(--v11-ink-2)]">
                {copy.details}
              </p>
              <a
                href={safeInstallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="v11-btn v11-btn-primary min-h-11"
              >
                <Download size={16} aria-hidden="true" />
                {copy.download}
              </a>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
