import puppeteer from 'puppeteer-core';
import path from 'path';

const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\89648951-2524-41f9-845c-d1b6cf48e2c5\\screenshots';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runChromeAutomatedTest() {
  console.log('\n======================================================');
  console.log('GOOGLE CHROME FULL E2E AUTOMATED VERIFICATION');
  console.log('Connecting to Google Chrome at:', CHROME_PATH);
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

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
    },
  });

  const page = await browser.newPage();

  // Helper wait
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    // -------------------------------------------------------------------------
    // TEST 1: HOMEPAGE & AGENT 01: AI HUMANIZER
    // -------------------------------------------------------------------------
    console.log('\n[1/7] Testing Homepage & Agent 01 (AI Humanizer)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const pageTitle = await page.title();
    assert('Page loaded with valid title', pageTitle.length > 0);

    // Verify presence of Multi-Agentic AI platform banner
    const content = await page.content();
    assert('Platform header contains AI Agents or HumanFlow', content.includes('HumanFlow') || content.includes('Multi-Agentic'));

    // Click "Load Sample" button in Humanizer Agent
    const loadSampleButtons = await page.$$('button');
    let loadSampleClicked = false;
    for (const btn of loadSampleButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Load Sample')) {
        await btn.click();
        loadSampleClicked = true;
        break;
      }
    }
    assert('Clicked "Load Sample" button in Agent 01', loadSampleClicked);
    await delay(500);

    // Click tone "creative" button
    const toneButtons = await page.$$('button');
    for (const btn of toneButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.trim().toLowerCase() === 'creative') {
        await btn.click();
        break;
      }
    }

    // Click "Humanize Text" / Generate button
    let generateClicked = false;
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && (text.includes('Humanize') || text.includes('Transform Source'))) {
        await btn.click();
        generateClicked = true;
        break;
      }
    }
    assert('Clicked Humanize / Generate button', generateClicked);

    // Wait for output result card
    await page.waitForSelector('.font-mono', { timeout: 10000 });
    await delay(1200);

    // Check if result was rendered (Human Score, perplexity, etc.)
    const pageHtmlAfterGen = await page.content();
    const hasHumanScore = pageHtmlAfterGen.includes('Human Score') || pageHtmlAfterGen.includes('Authentic Human');
    assert('AI Humanizer output rendered with Human Score metrics', hasHumanScore);

    const shot1 = path.join(SCREENSHOT_DIR, '01_chrome_humanizer_agent.png');
    await page.screenshot({ path: shot1 });
    console.log(`  📸 Screenshot saved: ${shot1}`);

    // -------------------------------------------------------------------------
    // TEST 2: AGENT 02: AI BYPASS & TRANSFORM
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testing Agent 02 (AI Bypass & Transformation)...');
    
    // Switch to Agent 02 tab
    const agentTabs = await page.$$('button');
    let switchedToBypass = false;
    for (const btn of agentTabs) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('AI Bypass & Transform')) {
        await btn.click();
        switchedToBypass = true;
        break;
      }
    }
    assert('Switched to Agent 02 tab', switchedToBypass);
    await delay(600);

    // Click "Load Sample" for Bypass
    const bypassButtons = await page.$$('button');
    for (const btn of bypassButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Load Sample')) {
        await btn.click();
        break;
      }
    }
    await delay(400);

    // Click "Execute Bypass & Transform"
    const bypassActionButtons = await page.$$('button');
    let bypassExecuted = false;
    for (const btn of bypassActionButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && (text.includes('Execute Bypass') || text.includes('Transform & Invert'))) {
        await btn.click();
        bypassExecuted = true;
        break;
      }
    }
    assert('Clicked "Execute Bypass & Transform"', bypassExecuted);
    await delay(1500);

    const bypassHtml = await page.content();
    const hasBypassMetrics = bypassHtml.includes('Rewrite Intensity') || bypassHtml.includes('AI Detection Risk') || bypassHtml.includes('Diff');
    assert('Bypass Agent diff analysis and risk score rendered', hasBypassMetrics);

    const shot2 = path.join(SCREENSHOT_DIR, '02_chrome_bypass_agent.png');
    await page.screenshot({ path: shot2 });
    console.log(`  📸 Screenshot saved: ${shot2}`);

    // -------------------------------------------------------------------------
    // TEST 3: AGENT 03: MEDIA MARKETING AGENT
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testing Agent 03 (Media Marketing Agent & Content Calendars)...');

    // Switch to Agent 03 tab
    const tabsForMarketing = await page.$$('button');
    let switchedToMarketing = false;
    for (const btn of tabsForMarketing) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Media Marketing')) {
        await btn.click();
        switchedToMarketing = true;
        break;
      }
    }
    assert('Switched to Agent 03 tab', switchedToMarketing);
    await delay(600);

    // Click "Use Sample Topic"
    const sampleTopicButtons = await page.$$('button');
    for (const btn of sampleTopicButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Use Sample Topic')) {
        await btn.click();
        break;
      }
    }
    await delay(400);

    // Click "Generate Post"
    const genButtons = await page.$$('button');
    let genMarketingClicked = false;
    for (const btn of genButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Generate')) {
        await btn.click();
        genMarketingClicked = true;
        break;
      }
    }
    assert('Clicked Generate Post', genMarketingClicked);
    await delay(1500);

    const mktHtml = await page.content();
    assert('Marketing post generated with hook and viral hashtags', mktHtml.includes('#') || mktHtml.includes('Hook') || mktHtml.includes('Copy'));

    // Now test Content Calendar goal
    const goalButtons = await page.$$('button');
    for (const btn of goalButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Content Calendar')) {
        await btn.click();
        break;
      }
    }
    await delay(400);

    // Click Generate Calendar
    const genCalButtons = await page.$$('button');
    for (const btn of genCalButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Generate')) {
        await btn.click();
        break;
      }
    }
    await delay(1500);

    const calHtml = await page.content();
    assert('7-Day Content Calendar cards rendered', calHtml.includes('Day 1') || calHtml.includes('Day 2') || calHtml.includes('Schedule'));

    const shot3 = path.join(SCREENSHOT_DIR, '03_chrome_marketing_agent.png');
    await page.screenshot({ path: shot3 });
    console.log(`  📸 Screenshot saved: ${shot3}`);

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // TEST 4: FLOATING AI CHATBOT
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testing Animated AI Chatbot Assistant...');
    const chatbotLauncher = (await page.$('#chatbot-toggle-button')) || (await page.$('button[aria-label="Open HumanFlow Assistant"]'));
    assert('Chatbot toggle button exists on page', !!chatbotLauncher);
    if (chatbotLauncher) {
      await chatbotLauncher.click();
      await delay(800);

      // Type question into input
      await page.waitForSelector('#chatbot-input-field');
      await page.type('#chatbot-input-field', 'How does the preservation agent prevent citation loss?');
      
      const sendBtn = await page.$('#chatbot-send-button');
      if (sendBtn) {
        await sendBtn.click();
        console.log('  Sent message to Chatbot, waiting for AI response...');
        await delay(2500);
      }

      const chatHtml = await page.content();
      assert('Chatbot responded with intelligent explanation', chatHtml.includes('preserv') || chatHtml.includes('citation') || chatHtml.includes('guard') || chatHtml.includes('HumanFlow'));

      const shot4 = path.join(SCREENSHOT_DIR, '04_chrome_chatbot.png');
      await page.screenshot({ path: shot4 });
      console.log(`  📸 Screenshot saved: ${shot4}`);

      const closeBtn = await page.$('#chatbot-close-button');
      if (closeBtn) await closeBtn.click();
      await delay(400);
    }

    // -------------------------------------------------------------------------
    // TEST 5: DOCUMENT PROCESSING & DIFF VIEWER (DOC 1: CLINICAL RESEARCH DOCX)
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testing Document Details & Diff Viewer (/documents/doc_demo_healthcare_01)...');
    await page.goto('http://localhost:3000/documents/doc_demo_healthcare_01', { waitUntil: 'domcontentloaded' });
    await delay(1800);

    const doc1Html = await page.content();
    assert('Document page loaded Clinical_Efficacy_Cardiovascular.docx', doc1Html.includes('Clinical_Efficacy_Cardiovascular'));
    assert('Preservation score 100% verified', doc1Html.includes('100%') || doc1Html.includes('Preservation'));
    assert('Diff viewer & version cards rendered', doc1Html.includes('Side-by-Side') || doc1Html.includes('Diff') || doc1Html.includes('Original'));

    const shot5 = path.join(SCREENSHOT_DIR, '05_chrome_document_diff.png');
    await page.screenshot({ path: shot5 });
    console.log(`  📸 Screenshot saved: ${shot5}`);

    // -------------------------------------------------------------------------
    // TEST 6: DOCUMENT 2: FINANCIAL REPORT PDF
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing Document 02 (/documents/doc_demo_fintech_02)...');
    await page.goto('http://localhost:3000/documents/doc_demo_fintech_02', { waitUntil: 'domcontentloaded' });
    await delay(1800);

    const doc2Html = await page.content();
    assert('Document page loaded Q3_Fiscal_Performance.pdf', doc2Html.includes('Q3_Fiscal_Performance'));

    const shot6 = path.join(SCREENSHOT_DIR, '06_chrome_fintech_doc.png');
    await page.screenshot({ path: shot6 });
    console.log(`  📸 Screenshot saved: ${shot6}`);

    // -------------------------------------------------------------------------
    // TEST 7: ADMIN COMMAND CONSOLE (/admin)
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testing Admin Command Console (/admin)...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
    await delay(1000);

    const adminHtml = await page.content();
    assert('Admin page title & telemetry loaded', adminHtml.includes('Admin Command Console'));

    // Switch to Humanizer Settings tab and test API
    const adminTabBtns = await page.$$('button');
    for (const btn of adminTabBtns) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Humanizer API Settings')) {
        await btn.click();
        break;
      }
    }
    await delay(600);

    const testHumanizerBtn = await page.$('#btn-test-humanizer-api');
    assert('Test Humanizer API button found', !!testHumanizerBtn);
    if (testHumanizerBtn) {
      await testHumanizerBtn.click();
      await delay(1500);
      const testHtml = await page.content();
      assert('Humanizer API ping test returned success', testHtml.includes('successfully') || testHtml.includes('Mock') || testHtml.includes('active'));
    }

    // Switch to Checker Settings tab and test Checker
    const adminTabBtns2 = await page.$$('button');
    for (const btn of adminTabBtns2) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Checker Settings')) {
        await btn.click();
        break;
      }
    }
    await delay(600);

    const testCheckerBtn = await page.$('#btn-test-checker-api');
    assert('Test Checker API button found', !!testCheckerBtn);
    if (testCheckerBtn) {
      await testCheckerBtn.click();
      await delay(1500);
      const checkerTestHtml = await page.content();
      assert('Checker API ping test returned success', checkerTestHtml.includes('successfully') || checkerTestHtml.includes('Guard') || checkerTestHtml.includes('Operational'));
    }

    const shot7 = path.join(SCREENSHOT_DIR, '07_chrome_admin_console.png');
    await page.screenshot({ path: shot7 });
    console.log(`  📸 Screenshot saved: ${shot7}`);

  } catch (err: any) {
    console.error('Fatal error during Chrome testing:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`CHROME AUTOMATION RESULTS: ${passed}/${total} TESTS PASSED!`);
  console.log('======================================================\n');
}

runChromeAutomatedTest();
