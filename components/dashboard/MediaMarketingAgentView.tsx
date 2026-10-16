'use client';

import React, { useState } from 'react';
import {
  MarketingGoal,
  MarketingOptions,
  MarketingResult,
  SocialPlatform,
  TargetAudience,
  BrandTone,
  ContentCalendarItem,
} from '@/lib/agents/types';
import { downloadFile } from '@/lib/agents/download';
import { safeFetchJson } from '@/lib/utils/safe-json';
import {
  Megaphone,
  Copy,
  Check,
  Download,
  Calendar,
  Sparkles,
  Sliders,
  Send,
  Video,
  Clock,
  TrendingUp,
  Tag,
  ShoppingBag,
  FileText,
  Lightbulb,
} from 'lucide-react';

interface MediaMarketingAgentViewProps {
  onGenerated?: (result: MarketingResult) => void;
  initialResult?: MarketingResult | null;
}

const SAMPLE_MARKETING_TOPIC = `Next-Gen Multi-Agentic AI platform that humanizes text, restructures academic content, and automates multi-platform marketing workflows.`;

export default function MediaMarketingAgentView({
  onGenerated,
  initialResult = null,
}: MediaMarketingAgentViewProps) {
  const [topicInput, setTopicInput] = useState('');
  const [result, setResult] = useState<MarketingResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Controls
  const [marketingGoal, setMarketingGoal] = useState<MarketingGoal>('social_post');
  const [platform, setPlatform] = useState<SocialPlatform>('linkedin');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('b2b');
  const [brandTone, setBrandTone] = useState<BrandTone>('bold_inspiring');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [calendarDays, setCalendarDays] = useState<number>(7);

  const handleGenerate = async () => {
    const input = topicInput.trim() || SAMPLE_MARKETING_TOPIC;
    setLoading(true);

    try {
      const options: MarketingOptions = {
        marketingGoal,
        platform,
        targetAudience,
        brandTone,
        includeHashtags,
        includeEmojis,
        includeCta,
        calendarDays,
      };

      const { ok, data, error } = await safeFetchJson<{
        success: boolean;
        result: MarketingResult;
        error?: string;
      }>('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'marketing',
          input,
          options,
        }),
      });

      if (ok && data?.success && data?.result) {
        setResult(data.result);
        if (onGenerated) onGenerated(data.result);
      } else {
        alert(data?.error || error || 'Failed to generate marketing content. Please try again.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (format: 'docx' | 'pdf' | 'txt' | 'md') => {
    if (!result) return;
    setDownloadingFormat(format);
    const content =
      result.contentCalendar && result.contentCalendar.length > 0
        ? result.contentCalendar
            .map(
              (c) =>
                `### Day ${c.day}: ${c.dayName} (${c.theme})\n**Platform:** ${c.platform}\n**Best Time:** ${c.bestTimeToPost}\n\n${c.caption}\n\n---\n`
            )
            .join('\n')
        : result.primaryText;

    await downloadFile(content, format, `marketing_asset_${Date.now()}`);
    setDownloadingFormat(null);
  };

  const getPlatformIcon = (p: SocialPlatform) => {
    switch (p) {
      case 'linkedin':
        return (
          <svg className="w-3.5 h-3.5 text-sky-400 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg className="w-3.5 h-3.5 text-sky-300 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-3.5 h-3.5 text-pink-400 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        );
      case 'facebook':
        return (
          <svg className="w-3.5 h-3.5 text-blue-400 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      case 'tiktok':
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Banner */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-pink-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                AGENT 03
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                Media Marketing Agent
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Generates high-converting social media posts, ad copy, campaign strategies, viral
              hashtags, and complete multi-day content calendars tailored for LinkedIn, X, Instagram,
              Facebook, and TikTok.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="glass-panel px-3.5 py-2 rounded-xl border border-pink-500/20 text-center">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Omnichannel Reach
              </div>
              <div className="text-lg font-bold font-mono text-pink-400">5+ Platforms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Selector Ribbon */}
      <div className="glass-card p-3 rounded-xl border border-white/10 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'social_post', label: 'Social Post & Captions', icon: Send },
            { id: 'ad_copy', label: 'Ad Copy (Meta/Google)', icon: Megaphone },
            { id: 'campaign_strategy', label: 'Campaign Blueprint', icon: Lightbulb },
            { id: 'content_calendar', label: '📅 Content Calendar', icon: Calendar },
            { id: 'hashtags', label: 'Viral Hashtags', icon: Tag },
            { id: 'product_description', label: 'Product Copy', icon: ShoppingBag },
          ] as const
        ).map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              onClick={() => setMarketingGoal(g.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                marketingGoal === g.id
                  ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white border border-pink-500/50 shadow-md shadow-pink-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-pink-400" />
              <span>{g.label}</span>
            </button>
          );
        })}
      </div>

      {/* Platform & Audience Controls */}
      <div className="glass-card p-4 rounded-xl border border-white/10 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-pink-400" />
          <span>Marketing Parameters & Target Persona</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Target Platform */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Primary Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'twitter', label: 'X (Twitter)' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'tiktok', label: 'TikTok' },
                  { id: 'facebook', label: 'Facebook' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                    platform === p.id
                      ? 'bg-pink-500/25 text-pink-200 border border-pink-500/50 shadow-sm shadow-pink-500/20'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {getPlatformIcon(p.id)}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
              className="w-full bg-[#0a0f24] text-xs text-white border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500 focus:outline-none"
            >
              <option value="b2b">B2B Decision Makers & Founders</option>
              <option value="entrepreneurs">Entrepreneurs & Small Business</option>
              <option value="gen_z">Gen Z & Youth Demographic</option>
              <option value="tech_pros">Tech & AI Professionals</option>
              <option value="general">Broad Consumer Market</option>
            </select>
          </div>

          {/* Brand Voice / Tone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Brand Voice & Energy
            </label>
            <select
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value as BrandTone)}
              className="w-full bg-[#0a0f24] text-xs text-white border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500 focus:outline-none"
            >
              <option value="bold_inspiring">Bold, High-Energy & Inspiring</option>
              <option value="authoritative">Authoritative Thought Leader</option>
              <option value="casual_fun">Casual, Fun & Relatable</option>
              <option value="urgent_direct">Urgent Direct-Response Copy</option>
            </select>
          </div>

          {/* Additional Options or Calendar Days */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {marketingGoal === 'content_calendar' ? 'Calendar Scope' : 'Formatting Triggers'}
            </label>
            {marketingGoal === 'content_calendar' ? (
              <div className="grid grid-cols-3 gap-1.5">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setCalendarDays(days)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      calendarDays === days
                        ? 'bg-pink-500/25 text-pink-200 border border-pink-500/50'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEmojis}
                    onChange={(e) => setIncludeEmojis(e.target.checked)}
                    className="rounded border-white/20 text-pink-500 focus:ring-0 bg-transparent"
                  />
                  <span>Viral Emojis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="rounded border-white/20 text-pink-500 focus:ring-0 bg-transparent"
                  />
                  <span>Hashtags Cloud</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCta}
                    onChange={(e) => setIncludeCta(e.target.checked)}
                    className="rounded border-white/20 text-pink-500 focus:ring-0 bg-transparent"
                  />
                  <span>High-Conversion CTA</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Field & Generator Prompt */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Product, Service, or Topic Prompt</span>
          </label>
          <button
            type="button"
            onClick={() => setTopicInput(SAMPLE_MARKETING_TOPIC)}
            className="text-xs text-pink-300 hover:text-pink-200 hover:underline"
          >
            Use Sample Topic
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="e.g. AI Content Humanizer for agencies, Launching our winter coaching cohort, Eco-friendly drinkware..."
            className="flex-1 bg-[#070b18] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all whitespace-nowrap ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-pink-500/25 hover:scale-[1.02]'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Crafting Assets...</span>
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4 text-pink-200" />
                <span>Generate Marketing Assets</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Calendar View if Content Calendar requested */}
          {result.contentCalendar && result.contentCalendar.length > 0 ? (
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-400" />
                    <span>{result.headline || 'Strategic Content Calendar'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.contentCalendar.length} scheduled posts with tailored hooks, value captions, and optimal posting times.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      copyText(
                        result.contentCalendar!
                          .map((c) => `Day ${c.day} (${c.theme}):\n${c.caption}`)
                          .join('\n\n'),
                        'all-calendar'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === 'all-calendar' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">All Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Full Calendar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    {(['docx', 'pdf', 'txt', 'md'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleDownload(fmt)}
                        disabled={downloadingFormat === fmt}
                        className="px-2 py-1.5 rounded-lg text-xs font-semibold uppercase bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                      >
                        {downloadingFormat === fmt ? '...' : `.${fmt}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Day-by-Day Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.contentCalendar.map((item) => (
                  <div
                    key={item.day}
                    className="bg-[#070b18] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-pink-500/40 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-pink-500/20 text-pink-300">
                            Day {item.day}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {item.dayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{item.bestTimeToPost}</span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="text-[11px] font-semibold text-pink-300 uppercase tracking-wide">
                          Theme: {item.theme}
                        </span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/[0.04] text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line mb-3">
                        {item.caption}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {item.hashtags.map((h, i) => (
                          <span key={i} className="text-[10px] text-slate-400">
                            #{h}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => copyText(item.caption, `day-${item.day}`)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-pink-300 hover:text-white hover:bg-pink-500/20 flex items-center gap-1 transition-colors"
                      >
                        {copiedId === `day-${item.day}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Post</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Single / Multi-variant Post View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Primary Post */}
              <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(result.platform)}
                      <span className="font-semibold text-sm text-white">
                        {result.headline || 'Primary Generated Asset'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyText(result.primaryText, 'primary')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedId === 'primary' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Content</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#070b18] border border-white/10 rounded-xl p-4 text-sm text-slate-100 whitespace-pre-line leading-relaxed font-sans">
                    {result.primaryText}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>
                      Best Time: <strong className="text-slate-200">{result.bestPostingTime}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Est. Engagement Score:{' '}
                      <strong className="text-emerald-400">{result.estimatedEngagementScore}/100</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium mr-1">Download:</span>
                    {(['docx', 'pdf', 'txt', 'md'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleDownload(fmt)}
                        disabled={downloadingFormat === fmt}
                        className="px-2 py-1 rounded-lg text-xs font-semibold uppercase bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                      >
                        {downloadingFormat === fmt ? '...' : `.${fmt}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alternative Angles & Variants */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-pink-400" />
                    <span>Alternative Angles & Hooks</span>
                  </h4>

                  <div className="space-y-3">
                    {result.variants && result.variants.length > 0 ? (
                      result.variants.map((variant, i) => (
                        <div
                          key={i}
                          className="bg-[#070b18] p-3 rounded-xl border border-white/[0.08] hover:border-pink-500/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-pink-300">
                              {variant.title}
                            </span>
                            <button
                              onClick={() => copyText(variant.text, `var-${i}`)}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Copy variant"
                            >
                              {copiedId === `var-${i}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                            {variant.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No additional variants for this mode.</p>
                    )}
                  </div>
                </div>

                {/* Hashtag Cloud */}
                {result.hashtags && result.hashtags.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                      Target Hashtags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.hashtags.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                        >
                          #{h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
