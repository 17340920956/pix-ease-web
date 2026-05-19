declare module 'gif.js' {
  interface GifOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: string | null;
    dither?: boolean;
    debug?: boolean;
  }

  interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options?: GifOptions);
    addFrame(element: CanvasImageSource | ImageData, options?: GifFrameOptions): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (percent: number) => void): void;
    on(event: 'abort', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
    render(): void;
    abort(): void;
    freeWorkers(): void;
  }

  export default GIF;
}