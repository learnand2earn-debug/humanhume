'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Sparkles, Check, Trash2, Sliders, ExternalLink } from 'lucide-react';
import { OmniModelId, OmniUserSettings } from '@/lib/omni/types';

interface OmniSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllChats: () => void;
}

export default function OmniSettingsModal({
  isOpen,
  onClose,
  onClearAllChats,
}: OmniSettingsModalProps) {
  const [settings, setSettings] = useState<OmniUserSettings>({
    preferredModel: 'gpt-4o',
    temperature: 0.7,
    theme: 'dark',
  });
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/omni/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) {
            setSettings(data.settings);
            if (data.settings.openaiApiKey) setOpenaiKey(data.settings.openaiApiKey);
            if (data.settings.anthropicApiKey) setAnthropicKey(data.settings.anthropicApiKey);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/omni/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          openaiApiKey: openaiKey,
          anthropicApiKey: anthropicKey,
        }),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0c1020] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">System & AI Settings</h2>
              <p className="text-xs text-slate-400">Configure models, external API keys, and platform preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 py-6 max-h-[68vh] overflow-y-auto pr-1">
          {/* Default Model */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default AI Engine
            </label>
            <select
              value={settings.preferredModel}
              onChange={(e) => setSettings({ ...settings, preferredModel: e.target.value as OmniModelId })}
              className="w-full bg-[#13192e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            >
              <option value="gpt-4o">GPT-4o (Omni Intelligence - Fast & Versatile)</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Artifacts & Code Expert)</option>
              <option value="o3-mini">o3-mini (Deep Logical Reasoning)</option>
              <option value="dalle-3">DALL·E 3 (Photorealistic Image Generator)</option>
              <option value="claude-code-fixer">Claude Code & Fixer (Automated Bug Fixing)</option>
            </select>
          </div>

          {/* Mode Indicator */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-cyan-300 mb-0.5">Dual-Mode Hybrid Engine Active</p>
              OmniFlow works immediately out-of-the-box with built-in high-intelligence synthesis, file generation, and diffusion imaging. Adding external keys below enables live direct OpenAI or Anthropic cloud streaming.
            </div>
          </div>

          {/* API Keys */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" /> OpenAI API Key (Optional)
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-[#13192e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Anthropic Claude API Key (Optional)
                </label>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-[#13192e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Clear History */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Clear All Conversations</p>
                <p className="text-xs text-slate-400">Permanently delete stored chat sessions</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all chat history?')) {
                    onClearAllChats();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" /> Saved!
              </>
            ) : isSaving ? (
              'Saving...'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
