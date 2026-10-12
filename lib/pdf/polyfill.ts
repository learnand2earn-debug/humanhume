import * as nodeFs from 'node:fs';

/**
 * Polyfill for Node.js environments when running pdfjs-dist / pdf-parse.
 * Node 20 lacks DOMMatrix, ImageData, Path2D, and process.getBuiltinModule.
 */
export function ensurePdfPolyfills(): void {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;
    } as any;
  }

  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      colorSpace = 'srgb';
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
      }
    } as any;
  }

  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
    } as any;
  }

  if (typeof process !== 'undefined') {
    (process as any).getBuiltinModule = (name: string) => {
      const clean = (name || '').replace(/^node:/, '');
      if (clean === 'module') {
        return {
          createRequire: () => (modName: string) => {
            if (modName.includes('canvas')) {
              return {
                DOMMatrix: globalThis.DOMMatrix,
                ImageData: globalThis.ImageData,
                Path2D: globalThis.Path2D,
                createCanvas: () => ({ getContext: () => ({}) }),
              };
            }
            return {};
          },
        };
      }
      if (clean === 'fs') {
        return nodeFs;
      }
      return undefined;
    };
  }
}

// Auto-run on import
ensurePdfPolyfills();
