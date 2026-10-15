/**
 * scripts/test-world-file-forge.ts
 * Rigorous test suite for OmniFileGenerator ("Dunya Ki Her File")
 */

import { OmniFileGenerator } from '../lib/omni/file-generator';

async function runForgeTests() {
  console.log('====================================================');
  console.log('🛠️ OMNI FILE FORGE UNIT TEST SUITE');
  console.log('Testing native compilation of all major formats & custom extensions');
  console.log('====================================================\n');

  const testMatrix = [
    { format: 'xlsx', name: 'financial_ledger', content: 'Quarterly Revenue, Costs, Margin\nQ1 2026, 450000, 310000\nQ2 2026, 620000, 390000' },
    { format: 'svg', name: 'vector_logo', content: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#6366f1"/></svg>' },
    { format: 'html', name: 'dashboard_app', content: '<!DOCTYPE html><html><body><h1>Universal App</h1></body></html>' },
    { format: 'zip', name: 'project_bundle', content: 'Multi file archive bundle specification' },
    { format: 'py', name: 'automation', content: 'import os\nprint("Omni Engine Running")' },
    { format: 'docx', name: 'corporate_policy', content: '# Corporate AI Ethics Policy\n\n1. Transparency\n2. Safety' },
    { format: 'pdf', name: 'whitepaper', content: '# Autonomous Agents Whitepaper\n\nExecutive briefing on multimodal agents.' },
    { format: 'tsx', name: 'ReactCard', content: 'export const Card = () => <div>Interactive Card</div>;' },
    { format: 'dockerfile', name: 'Dockerfile', content: 'FROM node:22-alpine\nWORKDIR /app\nCMD ["npm", "start"]' },
    { format: 'tf', name: 'infrastructure', content: 'resource "aws_s3_bucket" "b" { bucket = "omni-files" }' },
    { format: 'custom_ext', name: 'arbitrary_data', content: 'Custom raw compiled output stream' }
  ];

  let passed = 0;

  for (const t of testMatrix) {
    try {
      const res = await OmniFileGenerator.generateFile({
        fileName: t.name,
        fileType: t.format,
        content: t.content,
        title: `Test ${t.format.toUpperCase()}`
      });

      if (!res.id || !res.downloadUrl || res.sizeBytes <= 0) {
        throw new Error(`Generation output invalid: ${JSON.stringify(res)}`);
      }

      // Verify cached buffer retrieval
      const cached = OmniFileGenerator.getCachedFile(res.id);
      if (!cached || cached.buffer.length <= 0) {
        throw new Error(`File buffer not cached in memory for id ${res.id}`);
      }

      console.log(`✅ [${res.fileType.toUpperCase()}] ${res.fileName} (${(res.sizeBytes / 1024).toFixed(2)} KB) - Mime: ${res.mimeType}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [${t.format.toUpperCase()}] Failed: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(`FORGE TEST SUMMARY: ${passed}/${testMatrix.length} Passed`);
  console.log('====================================================');

  if (passed !== testMatrix.length) {
    process.exit(1);
  }
}

runForgeTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
