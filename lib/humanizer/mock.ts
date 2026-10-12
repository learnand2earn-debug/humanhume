import { HumanizeRequest, HumanizeResponse } from './types';
import { AutonomousHumanizerEngine } from './engine';

export class MockHumanizer {
  static async humanize(request: HumanizeRequest): Promise<HumanizeResponse> {
    const startTime = Date.now();

    // Simulate realistic neural processing latency
    await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));

    const humanizedText = AutonomousHumanizerEngine.process(request.text);
    const durationMs = Date.now() - startTime;
    const words = humanizedText.split(/\s+/).filter(Boolean).length;

    return {
      humanizedText,
      provider: 'HumanFlow Standalone Engine (Active)',
      model: 'humanflow-legal-neural-v3',
      durationMs,
      inputTokens: Math.round(words * 1.3),
      outputTokens: Math.round(words * 1.32),
      rawResponse: { mode: 'standalone', status: 'success' },
    };
  }
}
