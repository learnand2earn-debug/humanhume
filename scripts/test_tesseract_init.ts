import { createWorker } from 'tesseract.js';

async function test() {
  console.log('Testing tesseract.js worker initialization...');
  const worker = await createWorker('eng');
  console.log('Worker initialized successfully!');
  await worker.terminate();
  console.log('Worker terminated cleanly.');
}

test().catch(console.error);
