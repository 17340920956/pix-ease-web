import { removeBackground } from '../ai/rmbg';

interface ImageDataPayload {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function toPayload(img: ImageData): ImageDataPayload {
  return {
    data: img.data,
    width: img.width,
    height: img.height,
  };
}

function fromPayload(p: ImageDataPayload): ImageData {
  return new ImageData(
    new Uint8ClampedArray(p.data),
    p.width,
    p.height
  );
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, payload } = e.data;

  if (type === 'remove-bg') {
    try {
      const imageData = fromPayload(payload);
      const result = await removeBackground(imageData);
      if (result) {
        self.postMessage({
          type: 'remove-bg-done',
          id,
          payload: toPayload(result.imageData),
          alphaMask: result.alphaMask,
        });
      } else {
        self.postMessage({ type: 'remove-bg-error', id, error: 'Model not available' });
      }
    } catch (err: any) {
      console.error('[AI Worker] Error:', err);
      self.postMessage({ type: 'remove-bg-error', id, error: err?.message || 'Unknown error' });
    }
  }
};
