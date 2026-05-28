import { removeBackground, preload } from '@imgly/background-removal';

let modelReady = false;
let preloadPromise: Promise<void> | null = null;

export async function initBackgroundRemoval(): Promise<void> {
  if (modelReady) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = preload({
    model: 'isnet',
  })
    .then(() => {
      modelReady = true;
    })
    .catch((err) => {
      console.warn('[bg-removal] preload failed:', err?.message || err);
      preloadPromise = null;
    });

  return preloadPromise;
}

export async function removeImageBackground(source: string | Blob): Promise<Blob | null> {
  try {
    if (!modelReady) {
      await initBackgroundRemoval();
    }
    if (!modelReady) {
      console.warn('[bg-removal] model not ready, falling back');
      return null;
    }

    const result = await removeBackground(source, {
      model: 'isnet',
      output: { format: 'image/png' },
    });

    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[bg-removal] removeBackground failed:', msg);
    return null;
  }
}