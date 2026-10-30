export interface NativeTextUnit {
  id: string;
  text: string;
  pageNumber?: number;
}

export interface NativeApplyResult {
  buffer: Buffer;
  texts: string[];
  changedUnits: number;
  warnings: string[];
}

export interface NativeDocument {
  units: NativeTextUnit[];
  pageCount: number;
  imageCount: number;
  warnings: string[];
  apply(replacements: string[]): Promise<NativeApplyResult>;
}
