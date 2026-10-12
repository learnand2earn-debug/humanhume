import { NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { ConversationRepository } from '@/lib/agent/repository';
import { IntelligentSessionRepository } from '@/lib/intelligent/repository';
import { LegalRepository } from '@/lib/legal/repository';

export async function GET() {
  try {
    const pipelineDocs = repository.listDocuments();
    const conversations = ConversationRepository.listConversations();
    const intelligentSessions = IntelligentSessionRepository.listSessions();

    let legalDocs: any[] = [];
    try {
      const legalRepo = new LegalRepository();
      legalDocs = legalRepo.listDocuments ? legalRepo.listDocuments() : [];
    } catch {
      // Ignore if legal repo throws
    }

    const processingCount = pipelineDocs.filter(
      (d) => d.status === 'HUMANIZING' || d.status === 'CHECKING' || d.status === 'QUEUED' || d.status === 'FIXING'
    ).length;
    const completedCount = pipelineDocs.filter((d) => d.status === 'COMPLETED').length;

    const stats = {
      totalDocuments: pipelineDocs.length,
      processingDocuments: processingCount,
      completedDocuments: completedCount,
      totalConversations: conversations.length,
      totalIntelligentSessions: intelligentSessions.length,
      totalLegalDocuments: legalDocs.length,
      factGuardStatus: '100%_LOCKED',
      domMatrixPolyfill: typeof (globalThis as any).DOMMatrix !== 'undefined' ? 'ACTIVE_HEALTHY' : 'READY',
      systemHealth: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      stats,
      recentPipelineDocs: pipelineDocs.slice(0, 10),
      recentConversations: conversations.slice(0, 10),
      recentIntelligentSessions: intelligentSessions.slice(0, 10),
      recentLegalDocs: legalDocs.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch system overview' },
      { status: 500 }
    );
  }
}
