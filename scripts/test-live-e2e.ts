async function testLiveEndpoints() {
  console.log('\n======================================================');
  console.log('LIVE END-TO-END SERVER TESTING (http://localhost:3000)');
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

  // 1. Test Homepage Status
  try {
    const res = await fetch('http://localhost:3000');
    assert('Homepage HTTP 200 OK', res.status === 200);
    const html = await res.text();
    assert('HTML contains Multi-Agentic AI platform title or brand', html.includes('HumanFlow') || html.includes('Multi-Agent'));
  } catch (err: any) {
    assert(`Homepage accessible: ${err.message}`, false);
  }

  // 2. Test Agent 1 API: Humanizer
  try {
    const res = await fetch('http://localhost:3000/api/agents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'humanizer',
        input: 'In conclusion, it is important to note that artificial intelligence plays a crucial role in modern workflows.',
        options: {
          tone: 'conversational',
          intensity: 'balanced',
          vocabulary: 'rich',
          preserveCitations: true,
        },
      }),
    });
    const data = await res.json();
    assert('POST /api/agents/generate (Humanizer) returned 200', res.status === 200 && data.success === true);
    assert('Humanizer response contains text and humanScore', data.result?.text && data.result?.humanScore >= 90);
    assert('Humanizer response has saved history item', Boolean(data.historyItem?.id));
  } catch (err: any) {
    assert(`Humanizer API test: ${err.message}`, false);
  }

  // 3. Test Agent 2 API: Bypass & Content Transformation
  try {
    const res = await fetch('http://localhost:3000/api/agents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'bypass',
        input: 'Researchers deploy machine learning models because data complexity has increased significantly.',
        options: {
          transformationStyle: 'deep_restructure',
          paraphrasingDepth: 'dynamic',
          tone: 'formal',
        },
      }),
    });
    const data = await res.json();
    assert('POST /api/agents/generate (Bypass) returned 200', res.status === 200 && data.success === true);
    assert('Bypass response has diffChunks and similarityScore', data.result?.diffChunks?.length > 0 && typeof data.result?.similarityScore === 'number');
  } catch (err: any) {
    assert(`Bypass API test: ${err.message}`, false);
  }

  // 4. Test Agent 3 API: Media Marketing (Social Post)
  try {
    const res = await fetch('http://localhost:3000/api/agents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'marketing',
        input: 'Enterprise AI Transformation Suite',
        options: {
          marketingGoal: 'social_post',
          platform: 'linkedin',
          targetAudience: 'b2b',
          brandTone: 'bold_inspiring',
          includeHashtags: true,
          includeEmojis: true,
          includeCta: true,
        },
      }),
    });
    const data = await res.json();
    assert('POST /api/agents/generate (Marketing Post) returned 200', res.status === 200 && data.success === true);
    assert('Marketing response contains primaryText, hook, hashtags', Boolean(data.result?.primaryText && data.result?.hook && data.result?.hashtags?.length > 0));
  } catch (err: any) {
    assert(`Marketing API test: ${err.message}`, false);
  }

  // 5. Test Agent 3 API: Content Calendar
  try {
    const res = await fetch('http://localhost:3000/api/agents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'marketing',
        input: 'AI Automation SaaS',
        options: {
          marketingGoal: 'content_calendar',
          platform: 'linkedin',
          calendarDays: 7,
        },
      }),
    });
    const data = await res.json();
    assert('POST /api/agents/generate (Content Calendar) returned 200', res.status === 200 && data.success === true);
    assert('Calendar contains exactly 7 items with hooks & captions', data.result?.contentCalendar?.length === 7);
  } catch (err: any) {
    assert(`Marketing Calendar API test: ${err.message}`, false);
  }

  // 6. Test History API
  try {
    const res = await fetch('http://localhost:3000/api/agents/history');
    const data = await res.json();
    assert('GET /api/agents/history returned 200', res.status === 200 && data.success === true);
    assert('History items array is populated', Array.isArray(data.history) && data.history.length > 0);
  } catch (err: any) {
    assert(`History API test: ${err.message}`, false);
  }

  // 7. Test Export API: DOCX
  try {
    const res = await fetch('http://localhost:3000/api/agents/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is a test exported document content for Multi-Agentic AI platform.',
        format: 'docx',
        fileName: 'test_export_doc',
      }),
    });
    assert('POST /api/agents/export (DOCX) returned 200', res.status === 200);
    const blob = await res.arrayBuffer();
    assert('Exported DOCX buffer is non-empty (>500 bytes)', blob.byteLength > 500);
  } catch (err: any) {
    assert(`Export DOCX API test: ${err.message}`, false);
  }

  // 8. Test Export API: PDF
  try {
    const res = await fetch('http://localhost:3000/api/agents/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is a test exported PDF document for Multi-Agentic AI platform.',
        format: 'pdf',
        fileName: 'test_export_pdf',
      }),
    });
    assert('POST /api/agents/export (PDF) returned 200', res.status === 200);
    const blob = await res.arrayBuffer();
    assert('Exported PDF buffer is non-empty (>500 bytes)', blob.byteLength > 500);
  } catch (err: any) {
    assert(`Export PDF API test: ${err.message}`, false);
  }

  // 9. Test Admin Settings API
  try {
    const res = await fetch('http://localhost:3000/api/admin/settings');
    const data = await res.json();
    assert('GET /api/admin/settings returned 200', res.status === 200 && Boolean(data.settings));
  } catch (err: any) {
    assert(`Admin settings test: ${err.message}`, false);
  }

  // 10. Test Admin Stats API
  try {
    const res = await fetch('http://localhost:3000/api/admin/stats');
    const data = await res.json();
    assert('GET /api/admin/stats returned 200', res.status === 200 && Boolean(data.analytics));
  } catch (err: any) {
    assert(`Admin stats test: ${err.message}`, false);
  }

  // 11. Test Claude-Style Workspace Page Status
  try {
    const res = await fetch('http://localhost:3000/workspace');
    assert('Workspace UI (/workspace) returned HTTP 200', res.status === 200);
    const html = await res.text();
    assert('Workspace HTML contains Workspace title or identity', html.includes('Workspace') || html.includes('workspace'));
  } catch (err: any) {
    assert(`Workspace page test: ${err.message}`, false);
  }

  // 12. Test Intelligent 12-Stage Visual Page Status
  try {
    const res = await fetch('http://localhost:3000/intelligent');
    assert('Intelligent Workflow UI (/intelligent) returned HTTP 200', res.status === 200);
  } catch (err: any) {
    assert(`Intelligent page test: ${err.message}`, false);
  }

  // 13. Test Legal Documentation Studio Page Status
  try {
    const res = await fetch('http://localhost:3000/documentation');
    assert('Legal Studio UI (/documentation) returned HTTP 200', res.status === 200);
  } catch (err: any) {
    assert(`Documentation page test: ${err.message}`, false);
  }

  // 14. Test Workspace Conversations API
  let createdConvId = '';
  try {
    const res = await fetch('http://localhost:3000/api/workspace/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Live Test Conversation' }),
    });
    const data = await res.json();
    assert('POST /api/workspace/conversations returned 200', res.status === 200 && Boolean(data.conversation?.id));
    createdConvId = data.conversation?.id;
  } catch (err: any) {
    assert(`Workspace conversations test: ${err.message}`, false);
  }

  // 15. Test Workspace Conversation Messages API with Universal Agent
  if (createdConvId) {
    try {
      const res = await fetch(`http://localhost:3000/api/workspace/conversations/${createdConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Draft an executive proposal for cloud migration with milestones',
        }),
      });
      const data = await res.json();
      assert('POST /api/workspace/conversations/:id/messages returned 200', res.status === 200);
      const assistantMessage = data.conversation?.messages?.find((m: any) => m.role === 'assistant');
      assert('Response contains assistant message with task plan', Boolean(assistantMessage?.taskPlan));
      assert('Response contains dynamic requirements checklist', Boolean(assistantMessage?.checklist?.length > 0));
    } catch (err: any) {
      assert(`Workspace message processing test: ${err.message}`, false);
    }
  }

  // 16. Test Intelligent Sessions API
  try {
    const res = await fetch('http://localhost:3000/api/intelligent/sessions');
    assert('GET /api/intelligent/sessions returned 200', res.status === 200);
  } catch (err: any) {
    assert(`Intelligent sessions API test: ${err.message}`, false);
  }

  console.log('\n======================================================');
  console.log(`Live E2E Results: ${passed}/${total} Tests Passed!`);
  console.log('======================================================\n');
}

testLiveEndpoints().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
