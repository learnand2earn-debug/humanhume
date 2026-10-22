import {CheckerRequest, CheckerResponse} from './types';
import {clearCheckerCircuitBreaker, executeCheckerProvider} from './provider';
import {getRuntimeSecretsAndSettings, recordApiUsage} from '@/lib/db/store';

export async function runQualityAndAiCheck(req: CheckerRequest): Promise<CheckerResponse> {
  const {settings, secrets} = getRuntimeSecretsAndSettings();

  const normalizedMode = settings.processingMode === 'DEMO' ? 'DEMO' : 'LIVE';

  const res = await executeCheckerProvider(req, {
    mode: normalizedMode,
    apiUrl: secrets.checkerApiUrl || settings.checkerApiUrl,
    apiKey: secrets.checkerApiKey,
    responsePath: settings.checkerResponsePath || 'data.ai_score',
    timeoutMs: Math.min((settings.timeoutSeconds || 3) * 1000, 2500),
  });

  recordApiUsage({
    provider: res.providerName,
    requestType: 'CHECK',
    status: 'SUCCESS',
    durationMs: res.durationMs,
    tokensOrChars: req.text.length,
    traceId: req.traceId || 'HF-CHECK',
  });

  return res;
}

export async function testCheckerConnection(customUrl?: string, customKey?: string) {
  const {settings, secrets} = getRuntimeSecretsAndSettings();
  const apiUrl = customUrl ?? secrets.checkerApiUrl ?? settings.checkerApiUrl;
  const apiKey = customKey ?? secrets.checkerApiKey;

  const startTime = Date.now();

  if (settings.processingMode === 'DEMO' && !apiUrl) {
    const res = await executeCheckerProvider(
      {
        text: 'This clause sets out the clear responsibilities of both parties under the agreement.',
        documentId: 'test-doc',
        versionId: 'test-v1',
        traceId: 'HF-ADMIN-CHECK-TEST',
      },
      {
        mode: 'DEMO',
        apiUrl: '',
        apiKey: '',
        responsePath: settings.checkerResponsePath,
        timeoutMs: 2500,
      }
    );

    recordApiUsage({
      provider: res.providerName,
      requestType: 'TEST_CHECKER',
      status: 'SUCCESS',
      durationMs: res.durationMs,
      tokensOrChars: 84,
      traceId: 'HF-ADMIN-CHECK-TEST',
    });

    return {
      success: true,
      mode: 'DEMO',
      provider: res.providerName,
      responseTimeMs: res.durationMs,
      sampleScore: `${res.score}% (${res.status})`,
      message:
        'Built-In Stylometric & Readability Checker responded cleanly. Configure an external Checker URL in EXTERNAL API MODE to test third-party endpoints.',
    };
  }

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      mode: settings.processingMode,
      provider: 'Unconfigured Checker Endpoint',
      responseTimeMs: Date.now() - startTime,
      message: 'Checker API URL or API Key is empty. Save valid credentials or use BUILT-IN ENGINE.',
    };
  }

  clearCheckerCircuitBreaker(apiUrl);

  const res = await executeCheckerProvider(
    {
      text: 'This clause sets out the clear responsibilities of both parties under the agreement.',
      documentId: 'test-doc',
      versionId: 'test-v1',
      traceId: 'HF-ADMIN-CHECK-TEST',
    },
    {
      mode: 'LIVE',
      apiUrl,
      apiKey,
      responsePath: settings.checkerResponsePath,
      timeoutMs: 3000,
    }
  );

  recordApiUsage({
    provider: res.providerName,
    requestType: 'TEST_CHECKER',
    status: 'SUCCESS',
    durationMs: res.durationMs,
    tokensOrChars: 84,
    traceId: 'HF-ADMIN-CHECK-TEST',
  });

  const usedFallback = res.providerName.includes('Fallback') || res.providerName.includes('Internal');

  return {
    success: true,
    mode: 'LIVE',
    provider: res.providerName,
    responseTimeMs: res.durationMs,
    sampleScore: `${res.score}% (${res.status})`,
    message: usedFallback
      ? 'External Checker endpoint returned non-JSON/HTML or timed out — Automatic fallback to HumanFlow Stylometric Checker verified and active.'
      : 'Checker endpoint responded and returned a valid JSON score payload.',
  };
}
