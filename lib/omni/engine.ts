import {
  OmniMessage,
  OmniModelId,
  OmniToolMode,
  OmniAttachment,
} from './types';
import { OmniRepository } from './repository';
import { GroqAgent } from '../ai/groq-agent';

export class OmniEngine {
  /**
   * Main entry point to process a prompt and attachments across any model & mode.
   * Powered by real-time Groq LLM intelligence with deep reasoning and direct execution.
   */
  static async processMessage(params: {
    conversationId: string;
    prompt: string;
    model: OmniModelId;
    toolMode: OmniToolMode;
    attachments?: OmniAttachment[];
  }): Promise<OmniMessage> {
    const conv = OmniRepository.getConversation(params.conversationId);
    return await GroqAgent.processUserInput({
      ...params,
      history: conv?.messages || [],
    });
  }
}
