'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Download,
  Wand2,
  Check,
  Layers,
  Zap,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { TopImageModelId, GeneratedImageMeta } from '@/lib/omni/types';
import { TOP_IMAGE_MODELS } from '@/lib/omni/image-generator';
import { safeFetchJson } from '@/lib/utils/safe-json';

interface OmniImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (image: GeneratedImageMeta) => void;
}

const STYLE_PRESETS = [
  { id: 'Photorealistic DSLR', label: 'Photorealistic DSLR', icon: '📸', desc: '85mm lens, natural bokeh, lifelike textures' },
  { id: 'Cinematic Masterpiece', label: 'Cinematic Movie', icon: '🎬', desc: 'Anamorphic lens, volumetric lighting, film grain' },
  { id: 'Cyberpunk Neon', label: 'Cyberpunk Neon', icon: '🌆', desc: 'Glowing holograms, rain reflections, futuristic' },
  { id: '3D Octane Render', label: '3D Octane / Unreal 5', icon: '🧊', desc: 'Raytracing, subsurface scattering, 3D render' },
  { id: 'Anime & Ghibli', label: 'Anime & Ghibli', icon: '🌸', desc: 'Makoto Shinkai style, hand-drawn vibrant art' },
  { id: 'Minimalist Vector', label: 'Minimalist Logo', icon: '🖼️', desc: 'Clean vector contours, iconography, flat design' },
  { id: 'Vintage 35mm Film', label: 'Vintage Film', icon: '🎞️', desc: 'Analog 1980s Kodak aesthetics, nostalgic warm tones' },
];

const ASPECT_RATIOS: Array<{
  id: '1:1' | '16:9' | '9:16' | '4:3' | '21:9';
  label: string;
  dim: string;
}> = [
  { id: '1:1', label: '1:1 Square', dim: '1024×1024' },
  { id: '16:9', label: '16:9 Landscape', dim: '1792×1024' },
  { id: '9:16', label: '9:16 Portrait', dim: '1024×1792' },
  { id: '4:3', label: '4:3 Standard', dim: '1152×864' },
  { id: '21:9', label: '21:9 Ultrawide', dim: '1920×820' },
];

export default function OmniImageStudioModal({
  isOpen,
  onClose,
  onImageGenerated,
}: OmniImageStudioModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<TopImageModelId>('flux-1-pro');
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic DSLR');
  const [selectedRatio, setSelectedRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '21:9'>('16:9');
  const [quality, setQuality] = useState<'standard' | 'hd' | 'ultra-4k'>('ultra-4k');
  const [negativePrompt, setNegativePrompt] = useState('blurry, deformed, bad anatomy, low quality, artifacts, watermark');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedImageMeta | null>(null);

  if (!isOpen) return null;

  const handleEnhancePrompt = () => {
    if (!prompt.trim()) return;
    const enhancements = [
      'shot on 35mm lens, atmospheric haze, volumetric rim lighting, award-winning photography, intricate micro-textures, 8k resolution',
      'hyper-detailed cinematic composition, golden hour illumination, octane render, dynamic angle, photorealistic depth of field',
      'masterpiece, ultra-sharp focus, lifelike surface reflections, cinematic color grading, studio lighting setup',
    ];
    const picked = enhancements[Math.floor(Math.random() * enhancements.length)];
    setPrompt(`${prompt.trim()}, ${picked}`);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const res = await fetch('/api/omni/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
          style: selectedStyle,
          aspectRatio: selectedRatio,
          quality,
          negativePrompt,
        }),
      });

      const data = await res.json();
      if (data.image) {
        setGeneratedResult(data.image);
        if (onImageGenerated) {
          onImageGenerated(data.image);
        }
      }
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#080d1f] border border-cyan-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl text-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-500 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-500/25">
              <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Ultra AI Image Studio</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  Top Tier Models Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Next-generation visual synthesis powered by FLUX.1 Pro, Midjourney v6.1, DALL·E 3 HD & Imagen 3</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* 1. SELECT TOP AI MODEL */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 1. Select State-of-the-Art Architecture
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">6 High-Performance Models</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TOP_IMAGE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedModel === model.id
                      ? 'bg-[#121a3a] border-cyan-400/80 shadow-lg shadow-cyan-500/20'
                      : 'bg-[#0c1228] border-slate-800/80 hover:bg-[#101732] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Sparkles className={`w-3.5 h-3.5 ${model.iconColor}`} />
                      {model.name}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {model.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{model.description}</p>
                  <div className="text-[10px] text-cyan-400/80 font-mono mt-2 font-medium">By {model.provider}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. PROMPT INPUT & AI ENHANCER */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Visual Prompt Description
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={!prompt.trim()}
                className="text-[11px] px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Enhance Prompt</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A futuristic glass skyscraper surrounded by lush bioluminescent vertical gardens at dusk, dramatic lighting, shot on 85mm..."
              className="w-full bg-[#0d142c] border border-slate-700/80 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
            />
          </div>

          {/* 3. STYLE & AESTHETIC PRESET */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              3. Aesthetic Style Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLE_PRESETS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStyle(st.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedStyle === st.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                      : 'bg-[#0d142c] border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{st.icon}</span>
                    <span className="font-semibold truncate">{st.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{st.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. ASPECT RATIO & QUALITY TIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                4. Aspect Ratio & Framing
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatio(ratio.id)}
                    className={`py-2 px-2 rounded-xl border text-center text-xs transition-all ${
                      selectedRatio === ratio.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-[#0d142c] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">{ratio.id}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ratio.dim}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                5. Render Quality Tier
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'standard', label: 'Standard', desc: 'Fast' },
                  { id: 'hd', label: 'HD 2K', desc: 'Detailed' },
                  { id: 'ultra-4k', label: 'Ultra 4K/8K', desc: 'Cinema Pro' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuality(q.id as any)}
                    className={`py-2 px-2 rounded-xl border text-center text-xs transition-all ${
                      quality === q.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-[#0d142c] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">{q.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{q.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GENERATED RESULT PREVIEW */}
          {generatedResult && (
            <div className="p-4 rounded-3xl bg-[#0c142c] border border-cyan-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Synthesized with {generatedResult.modelName}</span>
                </div>
                <a
                  href={generatedResult.imageUrl}
                  download={`omniflow_${generatedResult.id}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" /> Download Full Resolution
                </a>
              </div>

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-slate-800 shadow-2xl">
                <img
                  src={generatedResult.imageUrl}
                  alt={generatedResult.prompt}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                <span>Prompt: {generatedResult.prompt}</span>
                <span>{generatedResult.width}×{generatedResult.height} • {generatedResult.style}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-500 font-mono hidden sm:block">
            Safety filters active • Safe creative art & photorealism verified
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-white font-bold text-xs shadow-xl shadow-purple-500/25 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing ({selectedModel})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Masterpiece</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
