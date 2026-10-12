import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { ConversationRepository } from '@/lib/agent/repository';
import { UniversalAgentEngine } from '@/lib/agent/universal-engine';
import { storageManager } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { documentId, text, title, originalName } = body;

    let docTitle = title || 'Document Analysis';
    let docContent = text || '';
    let docFileName = originalName || 'document.txt';

    if (documentId) {
      const doc = repository.getDocument(documentId);
      if (!doc) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      docTitle = `Analysis: ${doc.originalName}`;
      docFileName = doc.originalName;

      // Try reading working text or diff safely
      try {
        if (doc.workingPath && storageManager.fileExists(doc.workingPath)) {
          const buf = await storageManager.readFile(doc.workingPath);
          docContent = buf.toString('utf-8');
        }
      } catch (err) {
        console.warn('Could not read working text directly for bridge:', err);
      }
    }

    // Create a new conversation in the Universal AI Workspace
    const conv = ConversationRepository.createConversation(docTitle);

    // Formulate a contextual prompt to initialize the agent
    const prompt = docContent
      ? `I have imported the document "${docFileName}". Here is the document content:\n\n---\n${docContent.slice(0, 8000)}\n---\n\nPlease analyze this document, extract key facts and entities, verify if citations and numbers are preserved, and propose a structured action plan.`
      : `I have imported the document record "${docFileName}". Please initialize an autonomous analysis workflow for this file.`;

    // Process user input through UniversalAgentEngine
    const updatedConv = await UniversalAgentEngine.processUserInput(
      conv.id,
      prompt,
      []
    );

    return NextResponse.json({
      success: true,
      conversationId: updatedConv.id,
      title: updatedConv.title,
    });
  } catch (err: any) {
    console.error('Failed to bridge document to workspace:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
