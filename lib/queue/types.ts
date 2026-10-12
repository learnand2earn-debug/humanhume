import { ExtractedDocument } from '../document/extractor';
import { DocumentAnalysisReport } from '../document/analyzer';
import {
  DocumentDiff,
  DocumentRecord,
  JobStatus,
  PreservationCheckResult,
  ProtectedContentMap,
  QualityCheckResult,
  StepLog,
} from '../types';

export interface PipelineContext {
  documentId: string;
  traceId: string;
  document: DocumentRecord;
  extracted?: ExtractedDocument;
  analysis?: any;
  protectedMap?: ProtectedContentMap;
  humanizedRawText?: string;
  reconciledText?: string;
  currentVersionNumber: number;
  retryCount: number;
  qualityCheck?: QualityCheckResult;
  preservationResult?: PreservationCheckResult;
  diff?: DocumentDiff;
  finalFilePath?: string;
}

export type PipelineEventCallback = (
  step: JobStatus,
  progress: number,
  details: string
) => void;
