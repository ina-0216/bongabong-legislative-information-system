import { Suspense, lazy } from 'react';

/**
 * Mounts the toast host without pulling sonner into the entry chunk.
 *
 * The only caller of toast() is GuestForm, which lives on the lazily-loaded
 * /document/:id route, so nothing can raise a notification before this
 * resolves. Keeping the lazy() call in its own module also keeps main.jsx a
 * plain entry file.
 */
const ToasterHost = lazy(() => import('./ToasterHost'));

// Warm the chunk during module evaluation rather than on first render. Both
// imports share one specifier, so the module is emitted as a single chunk.
import('./ToasterHost').catch(() => {});

export default function DeferredToaster() {
  return (
    <Suspense fallback={null}>
      <ToasterHost />
    </Suspense>
  );
}