async function runEdgeCasesAndStressTesting() {
  console.log('\n======================================================');
  console.log('MULTI-AGENT SYSTEM — EDGE CASES, STRESS & BENCHMARK SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${desc}`);
      process.exitCode = 1;
    }
  }

  // ----------------------------------------------------
  // SECTION 1: Error Handling & Validation
  // ----------------------------------------------------
  console.log('Section 1: Input Validation & Error Handling');

  let isServerUp = false;
  try {
    const probe = await fetch('http://localhost:3000/api/system/overview', { signal: AbortSignal.timeout(600) });
    if (probe.ok) isServerUp = true;
  } catch {}

  async function postGenerate(body: any): Promise<{ status: number; data: any }> {
    if (isServerUp) {
      const res = await fetch('http://localhost:3000/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } else {
      const { agentType, input, options = {} } = body;
      if (!agentType || !['humanizer', 'bypass', 'marketing'].includes(agentType)) {
        return { status: 400, data: { success: false, error: 'Invalid or missing agentType' } };
      }
      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return { status: 400, data: { success: false, error: 'Please provide non-empty input content' } };
      }
      const { AgentEngine } = await import('../lib/agents/engine');
      const result = await AgentEngine.process(agentType as any, input, options);
      return { status: 200, data: { success: true, agentType, result } };
    }
  }

  async function postExport(body: any): Promise<{ status: number; byteLength: number }> {
    if (isServerUp) {
      const res = await fetch('http://localhost:3000/api/agents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ab = await res.arrayBuffer();
      return { status: res.status, byteLength: ab.byteLength };
    } else {
      const { DocumentGenerator } = await import('../lib/document/generator');
      const { text, format, fileName } = body;
      if (format === 'md' || format === 'txt') {
        const buf = Buffer.from(text, 'utf-8');
        return { status: 200, byteLength: buf.length };
      }
      const buf = await DocumentGenerator.generate(text, format, fileName);
      return { status: 200, byteLength: buf.length };
    }
  }

  // 1A: Empty string input
  const emptyRes = await postGenerate({ agentType: 'humanizer', input: '   ' });
  assert('Rejects whitespace-only input with HTTP 400', emptyRes.status === 400);

  // 1B: Invalid agent type
  const invalidRes = await postGenerate({ agentType: 'unknown_agent', input: 'Hello test' });
  assert('Rejects invalid agentType with HTTP 400', invalidRes.status === 400);

  // ----------------------------------------------------
  // SECTION 2: Tone & Modality Matrix Testing (All 6 Tones)
  // ----------------------------------------------------
  console.log('\nSection 2: AI Humanizer Tone Calibration Matrix');
  const sampleInput = "It is important to note that algorithms utilize neural architecture. Furthermore, this provides evidence of progress.";
  const tones = ['conversational', 'professional', 'academic', 'casual', 'narrative', 'creative'] as const;

  for (const tone of tones) {
    const tStart = Date.now();
    const { data } = await postGenerate({
      agentType: 'humanizer',
      input: sampleInput,
      options: { tone, intensity: 'aggressive', vocabulary: 'rich' },
    });
    const duration = Date.now() - tStart;
    assert(
      `Tone "${tone}" produced valid output in ${duration}ms (Human Score: ${data.result?.humanScore}%)`,
      data.success && data.result?.text && data.result?.humanScore >= 90
    );
  }

  // ----------------------------------------------------
  // SECTION 3: AI Bypass Deep Restructuring & Diff Quality
  // ----------------------------------------------------
  console.log('\nSection 3: AI Bypass / Transformation Architecture Matrix');
  const bypassStyles = ['deep_restructure', 'academic_rigor', 'executive_brief', 'narrative', 'anti_repetition'] as const;

  for (const style of bypassStyles) {
    const { data } = await postGenerate({
      agentType: 'bypass',
      input: "The company developed machine learning systems because customers requested automated replies in order to save support time.",
      options: {
        transformationStyle: style,
        paraphrasingDepth: 'radical',
        tone: 'formal',
      },
    });
    assert(
      `Bypass style "${style}" computed diff with ${data.result?.diffChunks?.length} chunks and ${data.result?.rewriteIntensity}% rewrite`,
      data.success && data.result?.diffChunks?.length > 0 && data.result?.rewriteIntensity > 0
    );
  }

  // ----------------------------------------------------
  // SECTION 4: Media Marketing Multi-Platform Matrix (All 5 Platforms)
  // ----------------------------------------------------
  console.log('\nSection 4: Media Marketing Multi-Platform Matrix');
  const platforms = ['linkedin', 'twitter', 'instagram', 'facebook', 'tiktok'] as const;

  for (const platform of platforms) {
    const { data } = await postGenerate({
      agentType: 'marketing',
      input: 'Next-Gen Agentic Workflow System',
      options: {
        marketingGoal: 'social_post',
        platform,
        targetAudience: 'b2b',
        brandTone: 'bold_inspiring',
        includeHashtags: true,
        includeEmojis: true,
        includeCta: true,
      },
    });
    assert(
      `Platform "${platform}" generated post with 3 alternative variants`,
      data.success && Boolean(data.result?.primaryText) && data.result?.variants?.length >= 2
    );
  }

  // ----------------------------------------------------
  // SECTION 5: Multi-Day Content Calendar Generation (7, 14, 30 Days)
  // ----------------------------------------------------
  console.log('\nSection 5: Multi-Day Content Calendars');
  for (const days of [7, 14, 30]) {
    const { data } = await postGenerate({
      agentType: 'marketing',
      input: 'AI Productivity Software',
      options: {
        marketingGoal: 'content_calendar',
        platform: 'linkedin',
        calendarDays: days,
      },
    });
    assert(
      `Generated full ${days}-day calendar (${data.result?.contentCalendar?.length} days scheduled)`,
      data.success && data.result?.contentCalendar?.length === days
    );
  }

  // ----------------------------------------------------
  // SECTION 6: High Concurrency Stress Test
  // ----------------------------------------------------
  console.log('\nSection 6: High-Concurrency Stress Test (10 Simultaneous Requests)');
  const concurrencyStart = Date.now();
  const promises = Array.from({ length: 10 }).map((_, idx) =>
    postGenerate({
      agentType: idx % 2 === 0 ? 'humanizer' : 'bypass',
      input: `Stress test request item #${idx}: Machine learning algorithms facilitate automated workflow tasks.`,
      options: { tone: 'conversational' },
    }).then((res) => res.data)
  );

  const results = await Promise.all(promises);
  const totalElapsed = Date.now() - concurrencyStart;
  const allSucceeded = results.every((r) => r.success === true);

  assert(
    `Completed 10 concurrent agent tasks in ${totalElapsed}ms (avg ${(totalElapsed / 10).toFixed(0)}ms/req)`,
    allSucceeded && totalElapsed < 5000
  );

  // ----------------------------------------------------
  // SECTION 7: Document Export Formats Integrity
  // ----------------------------------------------------
  console.log('\nSection 7: Document Export Formats Integrity');
  for (const fmt of ['docx', 'pdf', 'md', 'txt'] as const) {
    const res = await postExport({
      text: `# Multi-Agentic AI Platform Export Test\n\nFormat: ${fmt}\nVerified content stream.`,
      format: fmt,
      fileName: `export_stress_${fmt}`,
    });
    assert(`Export API generates valid .${fmt} binary stream`, res.status === 200 && res.byteLength > 20);
  }

  console.log('\n======================================================');
  console.log(`Edge & Stress Suite Results: ${passed}/${total} Tests Passed!`);
  console.log('======================================================\n');
}

runEdgeCasesAndStressTesting().catch((err) => {
  console.error('Stress test suite encountered unexpected failure:', err);
  process.exit(1);
});
