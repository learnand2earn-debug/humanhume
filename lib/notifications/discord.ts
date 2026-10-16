import { repository } from '../db/repository';

export type NotificationEvent =
  | 'document_uploaded'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'api_error'
  | 'checker_result'
  | 'max_retries_reached'
  | 'system_error';

export interface NotificationPayload {
  event: NotificationEvent;
  fileName: string;
  status: string;
  traceId: string;
  quality?: string;
  aiScore?: number;
  durationMs?: number;
  retries?: number;
  errorMessage?: string;
}

export class DiscordNotifier {
  private static formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '0s';
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  }

  /**
   * Dispatches a Discord notification webhook without sensitive content.
   */
  static async notify(payload: NotificationPayload): Promise<boolean> {
    const settings = repository.getSettings();
    const webhookUrl = settings.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      // Discord notifications disabled or not configured
      return false;
    }

    let title = 'HumanFlow AI Notification';
    let color = 0x3b82f6; // blue

    switch (payload.event) {
      case 'document_uploaded':
        title = '📄 Document Uploaded';
        color = 0x6366f1; // indigo
        break;
      case 'processing_started':
        title = '⚡ Pipeline Processing Started';
        color = 0x0ea5e9; // sky
        break;
      case 'processing_completed':
        title = '✨ Document Processing Completed';
        color = 0x10b981; // green
        break;
      case 'processing_failed':
        title = '🚨 Processing Failed';
        color = 0xef4444; // red
        break;
      case 'api_error':
        title = '⚠️ API Communication Warning';
        color = 0xf59e0b; // amber
        break;
      case 'checker_result':
        title = '🔍 Quality Check Completed';
        color = 0x8b5cf6; // purple
        break;
      case 'max_retries_reached':
        title = '⏳ Maximum Retries Reached';
        color = 0xf97316; // orange
        break;
      case 'system_error':
        title = '🔥 System Error';
        color = 0xdc2626; // dark red
        break;
    }

    const fields = [
      { name: 'File', value: `\`${payload.fileName}\``, inline: true },
      { name: 'Status', value: payload.status, inline: true },
      { name: 'Trace ID', value: `\`${payload.traceId}\``, inline: true },
    ];

    if (payload.quality) {
      fields.push({ name: 'Quality Status', value: payload.quality, inline: true });
    }
    if (typeof payload.aiScore === 'number') {
      fields.push({ name: 'AI Probability', value: `${payload.aiScore}%`, inline: true });
    }
    if (payload.durationMs) {
      fields.push({
        name: 'Processing Time',
        value: this.formatDuration(payload.durationMs),
        inline: true,
      });
    }
    if (typeof payload.retries === 'number') {
      fields.push({ name: 'Retries', value: String(payload.retries), inline: true });
    }
    if (payload.errorMessage) {
      fields.push({ name: 'Error Detail', value: payload.errorMessage.slice(0, 200), inline: false });
    }

    const embed = {
      title,
      color,
      fields,
      footer: { text: 'HumanFlow AI — Autonomous Document Processing' },
      timestamp: new Date().toISOString(),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }
}
