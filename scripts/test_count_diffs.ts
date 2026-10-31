import fs from 'fs';
import { preparePdfDocument } from '../lib/document/native-pdf';
import { runNaturalHumanizationTransform } from '../lib/humanizer/provider';

async function run() {
  const buf = fs.readFileSync('C:/Users/Admin/Desktop/Hunt.pdf');
  const doc = await preparePdfDocument(buf);
  let diffCount = 0;
  for (let i = 0; i < doc.units.length; i++) {
    const orig = doc.units[i].text;
    const trans = runNaturalHumanizationTransform(orig, 'NORMAL', false, []);
    if (orig !== trans) {
      diffCount++;
      console.log(`Diff #${diffCount} (Page ${doc.units[i].pageNumber}):\n  ORIG: "${orig.slice(0, 80)}"\n  TRAN: "${trans.slice(0, 80)}"`);
    }
  }
  console.log('Total diffs produced by local transform:', diffCount);
}

run().catch(console.error);
