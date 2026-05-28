import * as ort from 'onnxruntime-web';

let session: ort.InferenceSession | null = null;
let initPromise: Promise<boolean> | null = null;

const MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx';
const DB_NAME = 'bead-editor-models';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MODEL_KEY = 'rmbg-1.4';

const MODEL_INPUT_SIZE = 1024;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromCache(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToCache(key: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(buffer, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silently fail
  }
}

function resizeToModelInput(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;

  const canvas = new OffscreenCanvas(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const ctx = canvas.getContext('2d')!;

  const tempCanvas = new OffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  const resized = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  const tensorData = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
  for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
    tensorData[i] = resized.data[i * 4] / 255;
    tensorData[i + MODEL_INPUT_SIZE * MODEL_INPUT_SIZE] = resized.data[i * 4 + 1] / 255;
    tensorData[i + 2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE] = resized.data[i * 4 + 2] / 255;
  }

  return tensorData;
}

export async function initModel(): Promise<boolean> {
  if (session) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let buffer: ArrayBuffer | null = await getFromCache(MODEL_KEY);

      if (!buffer) {
        const response = await fetch(MODEL_URL);
        if (!response.ok) throw new Error(`Failed to fetch model: ${response.status}`);
        buffer = await response.arrayBuffer();
        await saveToCache(MODEL_KEY, buffer);
      }

      const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] = [];
      try {
        if ((navigator as any).gpu) {
          executionProviders.push('webgpu');
        }
      } catch {
        // WebGPU not available
      }
      executionProviders.push('wasm');

      session = await ort.InferenceSession.create(buffer, {
        executionProviders,
      });

      return true;
    } catch (e) {
      console.warn('[RMBG] Model initialization failed:', e);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

export async function removeBackground(imageData: ImageData): Promise<{
  imageData: ImageData;
  alphaMask: Uint8Array;
} | null> {
  if (!session) {
    const ok = await initModel();
    if (!ok) return null;
  }

  try {
    const { width, height, data } = imageData;

    const inputData = resizeToModelInput(imageData);

    const inputTensor = new ort.Tensor('float32', inputData, [
      1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE,
    ]);

    const sess = session!;
    const inputName = sess.inputNames[0];
    const outputName = sess.outputNames[0];

    const feeds: Record<string, ort.Tensor> = {};
    feeds[inputName] = inputTensor;

    const results = await sess.run(feeds);
    const outputTensor = results[outputName];
    const outputData = outputTensor.data as Float32Array;

    const alphaMask = new Uint8Array(width * height);
    const outData = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ox = Math.min(MODEL_INPUT_SIZE - 1, Math.round((x / width) * MODEL_INPUT_SIZE));
        const oy = Math.min(MODEL_INPUT_SIZE - 1, Math.round((y / height) * MODEL_INPUT_SIZE));
        const rawAlpha = outputData[oy * MODEL_INPUT_SIZE + ox];
        const alpha = Math.round(Math.max(0, Math.min(1, rawAlpha)) * 255);
        const i = (y * width + x) * 4;
        outData[i] = data[i];
        outData[i + 1] = data[i + 1];
        outData[i + 2] = data[i + 2];
        outData[i + 3] = alpha;
        alphaMask[y * width + x] = alpha;
      }
    }

    return {
      imageData: new ImageData(outData, width, height),
      alphaMask,
    };
  } catch (e) {
    console.warn('[RMBG] inference failed:', e);
    return null;
  }
}