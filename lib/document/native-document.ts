/**
 * Native document dispatcher.
 *
 * Picks the in-place editor for the uploaded container, humanizes the text units
 * it exposes, and writes the results back into the original file. Nothing here
 * converts, re-lays-out or re-encodes the document: images, vector art, fonts
 * and positions are copied through untouched by the adapters.
 */

import {humanizeTextChunk} from '@/lib/humanizer/client';
import {preparePdfDocument} from './native-pdf';
import {prepareOfficeDocument} from './native-office';
import type {NativeDocument, NativeTextUnit} from './native-types';

export type NativeFileType = 'PDF' | 'DOCX' | 'XLSX' | 'RTF' | 'TXT' | 'MD';

const NATIVE_EXTENSIONS: Record<string, NativeFileType> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  rtf: 'RTF',
  txt: 'TXT',
  md: 'MD',
  markdown: 'MD',
};

export function nativeFileTypeFor(fileName: string, declared?: string): NativeFileType | null {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (NATIVE_EXTENSIONS[ext]) return NATIVE_EXTENSIONS[ext];
  const upper = (declared || '').toUpperCase();
  return upper === 'PDF' || upper === 'DOCX' || upper === 'XLSX' || upper === 'RTF' || upper === 'TXT' || upper === 'MD'
    ? upper
    : null;
}

export async function prepareNativeDocument(buffer: Buffer, fileType: NativeFileType): Promise<NativeDocument> {
  return fileType === 'PDF' ? preparePdfDocument(buffer) : prepareOfficeDocument(buffer, fileType);
}

/** Figures, codes and references that must survive the humanizer verbatim. */
export function extractProtectedTokens(text: string): string[] {
  const patterns = [
    /https?:\/\/\S+/giu,
    /\b[\w.+-]+@[\w-]+\.[\w.]+\b/giu,
    /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:%|USD|PKR|INR|GBP|EUR|AED|SAR|rs\.|dollar)?\b/giu,
    /\b(?:[$€£¥]\s?\d[\d,.]*)\b/giu,
    /\b\d{4}-\d{2}-\d{2}\b/giu,
    /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/giu,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{1,2}?,?\s?\d{4}\b/giu,
    /\b(?:HF|ID|Ref|Invoice|Order|Section|Clause|Art\.|No\.)-?\d[\w./-]*/giu,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const token = match[0].trim();
      if (token.length > 1 && token.length < 120) found.add(token);
    }
  }
  return [...found];
}

/**
 * A `review` hook that refuses any candidate which dropped or rewrote a number,
 * date, URL or reference found in the original. Those units keep their original
 * wording; everything else is accepted as-is.
 */
export function protectedTokenReview(reverts: string[]): (drafts: NativeUnitDraft[]) => string[] {
  return (drafts) =>
    drafts.map((draft) => {
      const tokenSet = new Set(draft.protectedTokens);
      for (const token of extractProtectedTokens(draft.original)) tokenSet.add(token);
      const missing = [...tokenSet].filter(
        (token) => draft.original.includes(token) && !draft.candidate.includes(token)
      );
      if (missing.length > 0 && draft.candidate !== draft.original) {
        reverts.push(
          `unit ${draft.index + 1} keeps its original wording: the humanizer altered ${missing
            .slice(0, 3)
            .map((token) => `"${token.slice(0, 30)}"`)
            .join(', ')}`
        );
        return draft.original;
      }
      return draft.candidate;
    });
}

const CONCURRENCY = 4;
const MAX_UNIT_CHARS = 8000;

async function mapLimited<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, limit = CONCURRENCY): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(lanes);
  return results;
}

export interface NativeHumanizeResult {
  buffer: Buffer;
  fileType: NativeFileType;
  /** Text shown per unit after the edit (the original when the unit was refused). */
  texts: string[];
  /** Original text of every unit, with the page it belongs to. */
  units: NativeTextUnit[];
  changedUnits: number;
  totalUnits: number;
  /** Units the humanizer was allowed to touch but had to be handed back because a fact moved. */
  revertedUnits: number;
  imageCount: number;
  pageCount: number;
  warnings: string[];
  providers: string[];
}

export interface NativeUnitDraft {
  index: number;
  pageNumber?: number;
  original: string;
  candidate: string;
  protectedTokens: string[];
}

/**
 * Humanize the text of a document inside its own container.
 *
 * Every unit is checked afterwards: if the humanizer dropped or altered a
 * number, date, URL or reference, that unit keeps its original wording instead
 * of being written. Units whose replacement cannot fit the page are refused by
 * the adapter and reported.
 *
 * `review` runs before anything is written, so whatever it returns is exactly
 * what ends up inside the file.
 */
export async function humanizeNativeDocument(params: {
  buffer: Buffer;
  fileType: NativeFileType;
  traceId?: string;
  intensity?: 'LOW' | 'NORMAL';
  review?: (drafts: NativeUnitDraft[]) => string[] | Promise<string[]>;
  onProgress?: (done: number, total: number) => void;
}): Promise<NativeHumanizeResult> {
  const doc = await prepareNativeDocument(params.buffer, params.fileType);
  const providers = new Set<string>();
  const localWarnings: string[] = [];

  let replacements = await mapLimited(doc.units, async (unit, index) => {
    if (!unit.text.trim()) return unit.text;
    if (unit.text.length > MAX_UNIT_CHARS) {
      localWarnings.push(`unit ${index + 1} is longer than ${MAX_UNIT_CHARS} characters and was left unchanged`);
      return unit.text;
    }
    const protectedTokens = extractProtectedTokens(unit.text);
    try {
      const response = await humanizeTextChunk(
        {
          text: unit.text,
          intensity: params.intensity || 'NORMAL',
          isLegalClause: protectedTokens.length > 3,
          protectedTokens,
          traceId: `${params.traceId || 'HF-NATIVE'}-u${index + 1}`,
        },
        1
      );
      providers.add(response.provider);
      const candidate = (response.humanizedText || '').trim();
      if (!candidate) return unit.text;
      for (const token of protectedTokens) {
        if (!candidate.includes(token)) {
          localWarnings.push(
            `unit ${index + 1} keeps its original wording: the humanizer changed "${token.slice(0, 40)}"`
          );
          return unit.text;
        }
      }
      return candidate;
    } catch (err) {
      localWarnings.push(
        `unit ${index + 1} keeps its original wording: humanizer failed (${err instanceof Error ? err.message : 'unknown error'})`
      );
      return unit.text;
    } finally {
      params.onProgress?.(index + 1, doc.units.length);
    }
  });

  const drafts: NativeUnitDraft[] = doc.units.map((unit, index) => ({
    index,
    pageNumber: unit.pageNumber,
    original: unit.text,
    candidate: replacements[index],
    protectedTokens: extractProtectedTokens(unit.text),
  }));

  // Applied to every caller, so no pipeline can skip the guard.
  const guarded = protectedTokenReview(localWarnings)(drafts);
  const revertedUnits = guarded.reduce(
    (count, text, index) => (text !== replacements[index] ? count + 1 : count),
    0
  );
  replacements = guarded;

  if (params.review) {
    const reviewed = await params.review(
      drafts.map((draft, index) => ({...draft, candidate: guarded[index]}))
    );
    if (Array.isArray(reviewed) && reviewed.length === drafts.length) {
      replacements = reviewed.map((value, index) =>
        typeof value === 'string' && value.trim() ? value : guarded[index]
      );
    }
  }

  const applied = await doc.apply(replacements);

  return {
    buffer: applied.buffer,
    fileType: params.fileType,
    units: doc.units,
    texts: applied.texts,
    changedUnits: applied.changedUnits,
    totalUnits: doc.units.length,
    revertedUnits,
    imageCount: doc.imageCount,
    pageCount: doc.pageCount,
    warnings: [...new Set([...doc.warnings, ...applied.warnings, ...localWarnings])],
    providers: [...providers],
  };
}
