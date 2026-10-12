import fs from 'fs';
import path from 'path';
import { DocumentGenerator } from '../lib/document/generator';

async function makeDocx() {
  const text = `# Advanced Quantum Cryptography Report

According to (Vance et al., 2024), quantum key distribution increased key exchange entropy by 88.5% saving $2,400,000 across 35 secure financial nodes [1].

Furthermore, it is crucial to note that optical transmission latency was 1.2ms. In conclusion, the architecture fosters next-generation network resilience.

## References
[1] Vance, R. (2024). High-throughput Quantum Entropy. Q-Systems, 12(4), 101-118.`;

  const buf = await DocumentGenerator.generate(text, 'docx', 'Quantum_Cryptography_Report.docx');
  const outPath = path.resolve(process.cwd(), 'test_documents/Quantum_Cryptography_Report.docx');
  fs.writeFileSync(outPath, buf);
  console.log('Real DOCX created at:', outPath);
}

makeDocx();
