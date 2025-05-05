declare module 'potrace' {
  interface Options {
    background?: string;
    color?: string;
    threshold?: number;
    turdSize?: number;
    alphaMax?: number;
    optCurve?: boolean;
    optTolerance?: number;
    turnPolicy?: 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority';
  }

  function trace(
    buffer: Buffer | string, 
    options: Options, 
    callback: (err: Error | null, svg: string) => void
  ): void;

  function trace(
    buffer: Buffer | string,
    callback: (err: Error | null, svg: string) => void
  ): void;

  function traceFile(
    file: string, 
    options: Options, 
    callback: (err: Error | null, svg: string) => void
  ): void;

  function traceFile(
    file: string,
    callback: (err: Error | null, svg: string) => void
  ): void;

  function loadImage(
    file: string,
    callback: (err: Error | null, image: any) => void
  ): void;
}