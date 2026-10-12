import { AgentEngine } from '../lib/agents/engine';
import { AgentHistoryStore } from '../lib/agents/history';
import { DocumentGenerator } from '../lib/document/generator';
import {
  HumanizerResult,
  BypassResult,
  MarketingResult,
} from '../lib/agents/types';

async function runMultiAgentTests() {
  console.log('\n======================================================');
  console.log('Multi-Agentic AI System — Automated Verification Suite');
  console.log('Project Scope: Aqeel Abbas Agreement Deliverables');
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
  // TEST SUITE 1: AI Humanizer Agent
  // ----------------------------------------------------
  console.log('Test Suite 1: AI Humanizer Agent (Cadence, Burstiness & Cliché Removal)');
  const sampleAiText = "In conclusion, it is important to note that artificial intelligence plays a crucial role in modern workflows. Furthermore, this serves as a testament to ongoing innovation.";
  
  const humanizerRes = (await AgentEngine.process('humanizer', sampleAiText, {
    tone: 'conversational',
    intensity: 'balanced',
    vocabulary: 'rich',
  })) as HumanizerResult;

  assert('Transforms input text without empty output', Boolean(humanizerRes.text && humanizerRes.text.length > 20));
  assert('Human score exceeds 90%', humanizerRes.humanScore >= 90);
  assert('Calculates Perplexity & Burstiness metrics', humanizerRes.perplexity > 0 && humanizerRes.burstiness > 0);
  assert('Replaces robotic cliché phrases (in conclusion, furthermore)', !humanizerRes.text.includes('In conclusion') && !humanizerRes.text.includes('Furthermore'));

  // ----------------------------------------------------
  // TEST SUITE 2: AI Bypass & Content Transformation Agent
  // ----------------------------------------------------
  console.log('\nTest Suite 2: AI Bypass / Content Transformation Agent (Syntactic Inversion & Diff)');
  const sampleBypassText = "Organizations deploy vector databases because enterprise unstructured data has expanded rapidly.";

  const bypassRes = (await AgentEngine.process('bypass', sampleBypassText, {
    transformationStyle: 'deep_restructure',
    paraphrasingDepth: 'dynamic',
    tone: 'formal',
  })) as BypassResult;

  assert('Produces transformed text', Boolean(bypassRes.transformedText && bypassRes.transformedText.length > 20));
  assert('Computes side-by-side diff chunks with added and unchanged parts', bypassRes.diffChunks.length > 0);
  assert('Calculates rewrite intensity and low AI detection risk', bypassRes.rewriteIntensity > 0 && bypassRes.aiDetectionLikelihood <= 5);

  // ----------------------------------------------------
  // TEST SUITE 3: Media Marketing Agent
  // ----------------------------------------------------
  console.log('\nTest Suite 3: Media Marketing Agent (Multi-Platform Copy & Content Calendars)');
  const marketingTopic = "Autonomous AI Humanizer Platform";

  // 3A: LinkedIn Post
  const linkedinRes = (await AgentEngine.process('marketing', marketingTopic, {
    marketingGoal: 'social_post',
    platform: 'linkedin',
    targetAudience: 'b2b',
    brandTone: 'bold_inspiring',
    includeHashtags: true,
    includeEmojis: true,
    includeCta: true,
  })) as MarketingResult;

  assert('Generates structured LinkedIn post with hook and body', Boolean(linkedinRes.primaryText && linkedinRes.hook));
  assert('Includes relevant hashtags', linkedinRes.hashtags.length >= 2);
  assert('Produces multiple alternative angles/variants', linkedinRes.variants.length >= 2);

  // 3B: 7-Day Content Calendar
  const calendarRes = (await AgentEngine.process('marketing', marketingTopic, {
    marketingGoal: 'content_calendar',
    platform: 'linkedin',
    calendarDays: 7,
  })) as MarketingResult;

  assert('Generates exactly 7 scheduled days for content calendar', calendarRes.contentCalendar?.length === 7);
  assert('Calendar items have dayName, theme, hook, and caption', Boolean(
    calendarRes.contentCalendar?.[0]?.dayName &&
    calendarRes.contentCalendar?.[0]?.theme &&
    calendarRes.contentCalendar?.[0]?.caption
  ));

  // ----------------------------------------------------
  // TEST SUITE 4: Export Deliverables (DOCX, PDF, TXT, MD)
  // ----------------------------------------------------
  console.log('\nTest Suite 4: Document Export Engine for Generated Agent Content');
  const docxBuffer = await DocumentGenerator.generate(humanizerRes.text, 'docx', 'test_agent_export');
  assert('Exports valid DOCX binary buffer (>1KB)', docxBuffer.length > 1000);

  const pdfBuffer = await DocumentGenerator.generate(humanizerRes.text, 'pdf', 'test_agent_export');
  assert('Exports valid PDF binary buffer (>1KB)', pdfBuffer.length > 1000);

  // ----------------------------------------------------
  // TEST SUITE 5: Agent History Persistence
  // ----------------------------------------------------
  console.log('\nTest Suite 5: Agent History Store');
  const savedItem = AgentHistoryStore.add(
    'humanizer',
    'Unit Test Generation',
    sampleAiText,
    humanizerRes.text,
    humanizerRes,
    { tone: 'conversational' }
  );
  assert('Saves generation record with generated ID', Boolean(savedItem.id && savedItem.id.startsWith('hist_')));

  const allItems = AgentHistoryStore.getAll();
  assert('Retrieves saved items from history store', allItems.some((i) => i.id === savedItem.id));

  const deleted = AgentHistoryStore.delete(savedItem.id);
  assert('Deletes item from history store', deleted === true);

  console.log('\n======================================================');
  console.log(`Results: ${passed}/${total} Multi-Agentic System Tests Passed!`);
  console.log('======================================================\n');
}

runMultiAgentTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
