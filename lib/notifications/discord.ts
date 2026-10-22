import {getRuntimeSecretsAndSettings, addSystemLog} from '@/lib/db/store';

export interface DiscordNotificationPayload {
  eventTitle:
    | 'Document Uploaded'
    | 'Processing Started'
    | 'Document Completed'
    | 'Processing Failed'
    | 'API Error'
    | 'Checker Result'
    | 'Maximum Retries Reached'
    | 'Document Draft Started'
    | 'Draft Completed'
    | 'Humanization Completed'
    | 'Legal Check Completed'
    | 'Final Document Completed'
    | 'Needs Legal Review';
  fileName: string;
  documentId: string;
  documentType?: string;
  status: string;
  quality?: string;
  processingTime?: string;
  retries?: number;
  warningsCount?: number;
  traceId: string;
}

/**
 * Optional Discord webhook notification dispatcher.
 * Silently skips if Discord is not yet configured or disabled, keeping the platform
 * 100% ready-to-use with built-in In-App and Browser Notifications.
 * Never sends private document contents to Discord.
 */
export async function sendDiscordWebhookNotification(
  payload: DiscordNotificationPayload
): Promise<boolean> {
  const {settings, secrets} = getRuntimeSecretsAndSettings();
  const webhookUrl = (secrets.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL || '').trim();

  // If Discord is disabled or no webhook URL is added yet, skip silently without log noise
  if (!settings.discordNotificationsEnabled || !webhookUrl) {
    return false;
  }

  const formattedMessage = [
    `**HumanFlow AI**`,
    ``,
    `**${payload.eventTitle}**`,
    ``,
    `**File / Document:**`,
    `${payload.fileName}`,
    payload.documentType ? `\n**Document Type:**\n${payload.documentType}` : '',
    ``,
    `**Status:**`,
    `${payload.status}`,
    payload.quality ? `\n**Quality:**\n${payload.quality}` : '',
    payload.processingTime ? `\n**Processing Time:**\n${payload.processingTime}` : '',
    typeof payload.retries === 'number' ? `\n**Retries:**\n${payload.retries}` : '',
    typeof payload.warningsCount === 'number' ? `\n**Warnings:**\n${payload.warningsCount}` : '',
    ``,
    `**Trace ID:** \`${payload.traceId}\``,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        username: 'HumanFlow AI',
        content: formattedMessage,
      }),
    });

    if (res.ok) {
      addSystemLog({
        traceId: payload.traceId,
        level: 'INFO',
        stage: 'DISCORD_WEBHOOK',
        documentId: payload.documentId,
        message: `Discord notification delivered: ${payload.eventTitle}`,
      });
    }
    return res.ok;
  } catch {
    return false;
  }
}
