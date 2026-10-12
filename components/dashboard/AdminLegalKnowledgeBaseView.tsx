'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  Edit2,
  RefreshCw,
  Archive,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  KnowledgeCategory,
  KnowledgeConflict,
  KnowledgeStatus,
  LegalKnowledgeBaseEntry,
} from '@/lib/legal/types';

export default function AdminLegalKnowledgeBaseView() {
  const [entries, setEntries] = useState<LegalKnowledgeBaseEntry[]>([]);
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJurisdiction, setFilterJurisdiction] = useState('All');
  const [filterDocType, setFilterDocType] = useState('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // New / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<LegalKnowledgeBaseEntry> | null>(null);

  // Ingestion Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Conflict Resolution Modal
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<KnowledgeConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [kbRes, confRes] = await Promise.all([
        fetch('/api/documentation/knowledge').then((r) => r.json()),
        fetch('/api/documentation/knowledge/conflicts').then((r) => r.json()),
      ]);

      if (kbRes.entries) setEntries(kbRes.entries);
      if (confRes.conflicts) setConflicts(confRes.conflicts);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load KB data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/documentation/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', approvedBy: 'Admin' }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this knowledge entry?')) {
      try {
        await fetch(`/api/documentation/knowledge?id=${id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const method = editingEntry.id ? 'PUT' : 'POST';
      const res = await fetch('/api/documentation/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEntry),
      });
      if (res.ok) {
        setModalOpen(false);
        setEditingEntry(null);
        loadData();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleUploadImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);

      const res = await fetch('/api/documentation/knowledge/import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      setImporting(false);

      if (data.success) {
        setImportMessage(data.message);
        setImportFile(null);
        loadData();
        setTimeout(() => {
          setImportModalOpen(false);
          setImportMessage(null);
        }, 1500);
      } else {
        setImportMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setImporting(false);
      setImportMessage(`Upload failed: ${String(err)}`);
    }
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict || !resolutionNotes) return;
    try {
      await fetch('/api/documentation/knowledge/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictId: selectedConflict.id,
          resolutionNotes,
        }),
      });
      setConflictModalOpen(false);
      setSelectedConflict(null);
      setResolutionNotes('');
      loadData();
    } catch (err) {
      console.error('Resolve conflict failed:', err);
    }
  };

  // Filtered entries
  const filtered = entries.filter((e) => {
    const matchSearch =
      !searchTerm ||
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchJur = filterJurisdiction === 'All' || e.jurisdiction === filterJurisdiction || e.jurisdiction === 'All';
    const matchDoc = filterDocType === 'All' || e.document_type === filterDocType || e.document_type === 'All';
    const matchStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchCat = filterCategory === 'All' || e.category === filterCategory;
    return matchSearch && matchJur && matchDoc && matchStatus && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <span>Legal Knowledge Base Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin verification center. Only <strong>APPROVED</strong> records are utilized for automated production drafting.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <a
            href="/api/documentation/knowledge/export"
            download
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export KB</span>
          </a>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import Document</span>
          </button>

          <button
            onClick={() => {
              setEditingEntry({
                title: '',
                category: 'clause',
                jurisdiction: 'United States',
                document_type: 'All',
                content: '',
                summary: '',
                source: 'ADMIN_GUIDANCE',
                version: 'v1.0',
                status: 'Draft',
                tags: [],
              });
              setModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 hover:bg-cyan-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge Entry</span>
          </button>
        </div>
      </div>

      {/* Unresolved Conflicts Warning Banner (Section 34) */}
      {conflicts.filter((c) => !c.resolved).length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Knowledge Conflict Detected ({conflicts.filter((c) => !c.resolved).length})</span>
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Contradictory directives detected between approved entries. Production drafting requires Admin resolution before conflicting rules are utilized.
          </p>
          <div className="space-y-1.5 pt-1">
            {conflicts.filter((c) => !c.resolved).map((conf) => (
              <div
                key={conf.id}
                className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{conf.title}</span>
                  <p className="text-[11px] text-slate-400">{conf.reason}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedConflict(conf);
                    setResolutionNotes('');
                    setConflictModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold"
                >
                  Resolve Conflict
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters Bar (Section 33) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords or tags..."
            className="w-full bg-[#0a1024] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <select
          value={filterJurisdiction}
          onChange={(e) => setFilterJurisdiction(e.target.value)}
          className="bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="All">All Jurisdictions</option>
          <option value="United States">United States</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="European Union">European Union</option>
          <option value="Pakistan">Pakistan</option>
          <option value="UAE">UAE</option>
          <option value="Canada">Canada</option>
          <option value="Australia">Australia</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="All">All Categories</option>
          <option value="clause">Clause</option>
          <option value="legal_principle">Legal Principle</option>
          <option value="compliance_note">Compliance Note</option>
          <option value="approved_wording">Approved Wording</option>
          <option value="prohibited_wording">Prohibited Wording</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="All">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Knowledge Base Entries Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-slate-300 font-semibold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-3.5">Title & Source</th>
                <th className="p-3.5">Jurisdiction</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Version</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5 max-w-xs">
                    <p className="font-bold text-white truncate">{entry.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {entry.source}: {entry.summary}
                    </p>
                  </td>
                  <td className="p-3.5 font-medium text-slate-200">{entry.jurisdiction}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {entry.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{entry.version}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        entry.status === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : entry.status === 'Under Review'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                    {entry.status !== 'Approved' && (
                      <button
                        onClick={() => handleApprove(entry.id)}
                        className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold"
                        title="Approve for Production"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingEntry({ ...entry });
                        setModalOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 rounded text-rose-400 hover:text-rose-300"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Entry Modal */}
      {modalOpen && editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEntry}
            className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-white/15 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>{editingEntry.id ? 'Edit Knowledge Record' : 'Create Knowledge Record'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <input
                  required
                  type="text"
                  value={editingEntry.title || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Jurisdiction</label>
                <input
                  required
                  type="text"
                  value={editingEntry.jurisdiction || 'United States'}
                  onChange={(e) => setEditingEntry({ ...editingEntry, jurisdiction: e.target.value })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={editingEntry.category || 'clause'}
                  onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value as KnowledgeCategory })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="clause">clause</option>
                  <option value="legal_principle">legal_principle</option>
                  <option value="compliance_note">compliance_note</option>
                  <option value="approved_wording">approved_wording</option>
                  <option value="prohibited_wording">prohibited_wording</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Source Type (Section 6)</label>
                <select
                  value={editingEntry.source || 'INTERNAL_TEMPLATE'}
                  onChange={(e) => setEditingEntry({ ...editingEntry, source: e.target.value as LegalKnowledgeBaseEntry['source'] })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="AUTHORITATIVE_SOURCE">AUTHORITATIVE_SOURCE</option>
                  <option value="INTERNAL_TEMPLATE">INTERNAL_TEMPLATE</option>
                  <option value="ADMIN_GUIDANCE">ADMIN_GUIDANCE</option>
                  <option value="GENERAL_INFO">GENERAL_INFO</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Status</label>
                <select
                  value={editingEntry.status || 'Draft'}
                  onChange={(e) => setEditingEntry({ ...editingEntry, status: e.target.value as KnowledgeStatus })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Content / Wording</label>
                <textarea
                  rows={6}
                  required
                  value={editingEntry.content || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
                  className="w-full bg-[#0a1024] border border-white/15 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ingestion / Import Modal (Section 31) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadImport}
            className="glass-panel max-w-md w-full p-6 rounded-2xl border border-white/15 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Import Legal Knowledge Material</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload PDF, DOCX, TXT, or MD documents. Extracted records will be placed into <strong>Draft</strong> state for Admin Review before production use.
            </p>

            <div className="space-y-2">
              <input
                required
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 cursor-pointer"
              />
            </div>

            {importMessage && (
              <p className="text-xs text-indigo-300 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                {importMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!importFile || importing}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Upload & Extract</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Conflict Resolution Modal (Section 34) */}
      {conflictModalOpen && selectedConflict && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-amber-500/30 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Resolve Knowledge Base Conflict</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <p><strong>Conflict:</strong> {selectedConflict.title}</p>
              <p><strong>Reason:</strong> {selectedConflict.reason}</p>
              <div className="p-3 rounded-xl bg-white/[0.03] space-y-1">
                <p className="text-[11px] text-slate-400">Entry A: {selectedConflict.entryA.title} ({selectedConflict.entryA.source})</p>
                <p className="text-[11px] text-slate-400">Entry B: {selectedConflict.entryB.title} ({selectedConflict.entryB.source})</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Admin Resolution Determination</label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. For Delaware agreements, Entry A forum clause prevails; Entry B applies only to general non-US contracts..."
                className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!resolutionNotes}
                onClick={handleResolveConflict}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
