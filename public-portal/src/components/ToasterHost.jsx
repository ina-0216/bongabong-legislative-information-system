import { Toaster } from 'sonner';

/**
 * Isolated so the sonner runtime can load in its own chunk instead of being
 * bundled into the entry. The only caller of `toast()` in this app is
 * GuestForm, which itself lives on the lazily-loaded /document/:id route, so
 * there is no code path that can raise a toast before this has resolved.
 */
export default function ToasterHost() {
  return <Toaster position="top-right" richColors closeButton />;
}