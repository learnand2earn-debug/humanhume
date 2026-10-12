export type AgentType = 'humanizer' | 'bypass' | 'marketing';

export type HumanizerTone =
  | 'conversational'
  | 'professional'
  | 'academic'
  | 'casual'
  | 'narrative'
  | 'creative';

export type HumanizerIntensity = 'light' | 'balanced' | 'aggressive';
export type VocabularyStyle = 'standard' | 'rich' | 'lexical_diversity';

export interface HumanizerOptions {
  tone: HumanizerTone;
  intensity: HumanizerIntensity;
  vocabulary: VocabularyStyle;
  preserveCitations?: boolean;
  preserveQuotes?: boolean;
}

export interface HumanizerResult {
  text: string;
  originalText: string;
  humanScore: number; // e.g. 98%
  perplexity: number; // e.g. 86
  burstiness: number; // e.g. 81
  readingEase: number; // e.g. 72
  wordCount: number;
  charCount: number;
  processingTimeMs: number;
  improvementsApplied: string[];
}

export type BypassTransformationStyle =
  | 'deep_restructure'
  | 'academic_rigor'
  | 'executive_brief'
  | 'narrative'
  | 'anti_repetition';

export type ParaphrasingDepth = 'mild' | 'dynamic' | 'radical';
export type BypassTone = 'formal' | 'semi_formal' | 'persuasive' | 'objective';

export interface BypassOptions {
  transformationStyle: BypassTransformationStyle;
  paraphrasingDepth: ParaphrasingDepth;
  tone: BypassTone;
  preserveStructure?: boolean;
  protectFactualEntities?: boolean;
}

export interface BypassDiffChunk {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

export interface BypassResult {
  transformedText: string;
  originalText: string;
  diffChunks: BypassDiffChunk[];
  similarityScore: number; // e.g. 38%
  rewriteIntensity: number; // e.g. 85%
  aiDetectionLikelihood: number; // e.g. 2%
  originalWordCount: number;
  transformedWordCount: number;
  processingTimeMs: number;
  transformationHighlights: string[];
}

export type MarketingGoal =
  | 'social_post'
  | 'ad_copy'
  | 'campaign_strategy'
  | 'content_calendar'
  | 'hashtags'
  | 'product_description';

export type SocialPlatform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok';
export type TargetAudience = 'b2b' | 'gen_z' | 'entrepreneurs' | 'tech_pros' | 'general';
export type BrandTone = 'bold_inspiring' | 'authoritative' | 'casual_fun' | 'urgent_direct';

export interface MarketingOptions {
  marketingGoal: MarketingGoal;
  platform: SocialPlatform;
  targetAudience: TargetAudience;
  brandTone: BrandTone;
  includeHashtags: boolean;
  includeEmojis: boolean;
  includeCta: boolean;
  calendarDays?: number; // 7, 14, 30
  productOrTopicName?: string;
}

export interface ContentCalendarItem {
  day: number;
  dayName: string;
  platform: SocialPlatform;
  theme: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  bestTimeToPost: string;
}

export interface MarketingVariant {
  title: string;
  text: string;
  hook?: string;
}

export interface MarketingResult {
  marketingGoal: MarketingGoal;
  platform: SocialPlatform;
  primaryText: string;
  headline?: string;
  hook?: string;
  body?: string;
  callToAction?: string;
  hashtags: string[];
  variants: MarketingVariant[];
  contentCalendar?: ContentCalendarItem[];
  bestPostingTime?: string;
  estimatedEngagementScore: number;
  processingTimeMs: number;
}

export interface AgentHistoryItem {
  id: string;
  agentType: AgentType;
  title: string;
  inputPreview: string;
  outputPreview: string;
  createdAt: string;
  data: HumanizerResult | BypassResult | MarketingResult;
  options: Record<string, unknown>;
}
