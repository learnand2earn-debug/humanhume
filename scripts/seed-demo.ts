import { repository } from '../lib/db/repository';
import { storageManager } from '../lib/storage';
import { DocumentGenerator } from '../lib/document/generator';
import { DiffEngine } from '../lib/document/diff';

async function seed() {
  console.log('Seeding HumanFlow AI with realistic demo documents...');

  // Doc 1: Clinical Research Paper (.docx)
  const doc1Id = 'doc_demo_healthcare_01';
  const doc1Trace = 'HF-20261005-A7B29F';
  const doc1OriginalText = `# Clinical Efficacy of Neural Pattern Diagnostics in Cardiovascular Screening

## Abstract
Recent breakthroughs in predictive neural modeling have transformed proactive cardiology [1]. According to clinical trials conducted by (Chen et al., 2024), real-time sensor analytics improved early onset detection by 28.4% across 14,250 patient screenings between 2023-01-15 and 2024-03-30.

## Methodological Framework
The investigative cohort comprised 4,500 participants receiving standard electrocardiogram monitoring and $1,250 in complimentary baseline imaging. Furthermore, it is crucial to note that the primary metric remained diagnostic sensitivity under stress conditions. The computational pipeline leverages Bayesian regression:
$$S = \\sum_{i=1}^{n} w_i \\cdot x_i + \\epsilon$$

## Key Findings & Statistical Validation
- Patient diagnostic sensitivity achieved 96.8% (p < 0.001) as detailed in [2].
- Adverse reaction alerts declined from 14.2% down to 2.1%.
- Operational overhead per diagnostic run averaged $45.80 USD.

## Conclusion
In conclusion, the empirical evidence demonstrates a pivotal milestone for non-invasive patient care. Future investigations should delve into broader demographic stratification.

## References
[1] Chen, L., & Vance, R. (2024). Machine learning in cardiovascular triage. Journal of Cardiology, 42(3), 112-128.
[2] WHO Clinical Data Standard Guideline 2024-B.`;

  const doc1HumanizedText = `# Clinical Efficacy of Neural Pattern Diagnostics in Cardiovascular Screening

## Abstract
Recent advances in predictive neural modeling have transformed proactive cardiology [1]. According to clinical trials conducted by (Chen et al., 2024), real-time sensor analytics improved early onset detection by 28.4% across 14,250 patient screenings between 2023-01-15 and 2024-03-30.

## Methodological Framework
The investigative cohort included 4,500 participants receiving standard electrocardiogram monitoring and $1,250 in complimentary baseline imaging. Notably, the primary metric centered on diagnostic sensitivity under stress conditions. The computational pipeline relies on Bayesian regression:
$$S = \\sum_{i=1}^{n} w_i \\cdot x_i + \\epsilon$$

## Key Findings & Statistical Validation
- Patient diagnostic sensitivity achieved 96.8% (p < 0.001) as detailed in [2].
- Adverse reaction alerts dropped from 14.2% down to 2.1%.
- Operational overhead per diagnostic run averaged $45.80 USD.

## Conclusion
Ultimately, the empirical evidence demonstrates an essential milestone for non-invasive patient care. Future research will explore broader demographic cohorts to assess cross-regional utility.

## References
[1] Chen, L., & Vance, R. (2024). Machine learning in cardiovascular triage. Journal of Cardiology, 42(3), 112-128.
[2] WHO Clinical Data Standard Guideline 2024-B.`;

  // Create buffers and save files
  const doc1Buf = await DocumentGenerator.generate(doc1OriginalText, 'docx', 'Clinical_Efficacy_Cardiovascular.docx');
  const { originalPath: p1Orig, workingPath: p1Work } = await storageManager.saveOriginalFile(
    doc1Buf,
    'Clinical_Efficacy_Cardiovascular.docx',
    doc1Id
  );

  const doc1FinalBuf = await DocumentGenerator.generate(doc1HumanizedText, 'docx', 'Clinical_Efficacy_Cardiovascular.docx');
  const p1Final = await storageManager.saveVersionFile(doc1FinalBuf, doc1Id, 2, 'docx', true);
  const p1V0 = await storageManager.saveVersionFile(doc1OriginalText, doc1Id, 0, 'docx', false);

  repository.saveDocument({
    id: doc1Id,
    userId: 'default_user',
    originalName: 'Clinical_Efficacy_Cardiovascular.docx',
    fileType: 'docx',
    fileSize: doc1Buf.length,
    originalPath: p1Orig,
    workingPath: p1Work,
    status: 'COMPLETED',
    traceId: doc1Trace,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
    retryCount: 1,
    maxRetries: 3,
    preservationScore: 100,
    aiCheckScore: 5.2,
    readabilityScore: 78.4,
    bestVersionId: `v_${doc1Id}_1`,
    finalVersionId: `v_${doc1Id}_final`,
  });

  repository.saveVersion({
    id: `v_${doc1Id}_0`,
    documentId: doc1Id,
    versionNumber: 0,
    label: 'Original',
    filePath: p1V0,
    text: doc1OriginalText,
    qualityScore: 100,
    checkerScore: 82,
    preservationScore: 100,
    readabilityScore: 65,
    detectedIssues: [],
    provider: 'Original Upload',
    durationMs: 0,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  });

  repository.saveVersion({
    id: `v_${doc1Id}_final`,
    documentId: doc1Id,
    versionNumber: 2,
    label: 'Final Document',
    filePath: p1Final,
    text: doc1HumanizedText,
    qualityScore: 95,
    checkerScore: 5.2,
    preservationScore: 100,
    readabilityScore: 78.4,
    detectedIssues: [],
    provider: 'HumanFlow Pipeline Finalizer',
    durationMs: 42000,
    createdAt: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
    isFinal: true,
    isBest: true,
  });

  // Doc 2: Financial Fiscal Report (.pdf)
  const doc2Id = 'doc_demo_fintech_02';
  const doc2Trace = 'HF-20261005-B9C41E';
  const doc2OriginalText = `# Q3 Enterprise Fiscal Performance & AI Infrastructure Capitalization

## Executive Summary
During the third quarter of 2024, our revenue reached $48,500,000, representing a 19.4% year-over-year increase. Operating margins expanded by 340 basis points to 31.2%.

## Strategic Highlights
- Total subscription recurring revenue climbed to $34,200,000.
- Customer retention was sustained at 97.8% across enterprise accounts.
- Research expenditure totaled $8,900,000 as of 2024-09-30.

## Market Outlook
Management maintains full-year guidance between $190,000,000 and $195,000,000.`;

  const doc2HumanizedText = `# Q3 Enterprise Fiscal Performance & AI Infrastructure Capitalization

## Executive Summary
In the third quarter of 2024, enterprise revenue hit $48,500,000, reflecting a 19.4% rise year-over-year. Operating margins widened by 340 basis points to finish at 31.2%.

## Strategic Highlights
- Total subscription recurring revenue climbed to $34,200,000.
- Customer retention held strong at 97.8% across enterprise accounts.
- Research expenditure totaled $8,900,000 as of 2024-09-30.

## Market Outlook
Leadership affirms its full-year guidance range between $190,000,000 and $195,000,000.`;

  const doc2Buf = await DocumentGenerator.generate(doc2OriginalText, 'pdf', 'Q3_Fiscal_Performance.pdf');
  const { originalPath: p2Orig, workingPath: p2Work } = await storageManager.saveOriginalFile(
    doc2Buf,
    'Q3_Fiscal_Performance.pdf',
    doc2Id
  );

  const doc2FinalBuf = await DocumentGenerator.generate(doc2HumanizedText, 'pdf', 'Q3_Fiscal_Performance.pdf');
  const p2Final = await storageManager.saveVersionFile(doc2FinalBuf, doc2Id, 1, 'pdf', true);

  repository.saveDocument({
    id: doc2Id,
    userId: 'default_user',
    originalName: 'Q3_Fiscal_Performance.pdf',
    fileType: 'pdf',
    fileSize: doc2Buf.length,
    originalPath: p2Orig,
    workingPath: p2Work,
    status: 'COMPLETED',
    traceId: doc2Trace,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5 + 65000).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 5 + 65000).toISOString(),
    retryCount: 0,
    maxRetries: 3,
    preservationScore: 100,
    aiCheckScore: 6.8,
    readabilityScore: 81.2,
    finalVersionId: `v_${doc2Id}_final`,
  });

  repository.saveVersion({
    id: `v_${doc2Id}_final`,
    documentId: doc2Id,
    versionNumber: 1,
    label: 'Final Document',
    filePath: p2Final,
    text: doc2HumanizedText,
    qualityScore: 94,
    checkerScore: 6.8,
    preservationScore: 100,
    readabilityScore: 81.2,
    detectedIssues: [],
    provider: 'HumanFlow Pipeline Finalizer',
    durationMs: 38000,
    createdAt: new Date(Date.now() - 3600000 * 5 + 65000).toISOString(),
    isFinal: true,
  });

  console.log('Demo seed completed successfully! 2 realistic documents prepared.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
