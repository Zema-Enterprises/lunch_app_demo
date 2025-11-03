declare module 'node:stream/web' {
  class TransformStream<I = unknown, O = unknown> {
    readonly readable: ReadableStream<O>;
    readonly writable: WritableStream<I>;
    constructor(...args: any[]);
  }

  export { TransformStream };
}
