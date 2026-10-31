import fs from 'fs';
import { preparePdfDocument } from '../lib/document/native-pdf';

async function test() {
  const buf = fs.readFileSync('C:/Users/Admin/Desktop/Hunt.pdf');
  const doc = await preparePdfDocument(buf);
  console.log('Total units extracted:', doc.units.length);
  for (let i = 0; i < Math.min(15, doc.units.length); i++) {
    console.log(`Unit ${i + 1} (Page ${doc.units[i].pageNumber}): "${doc.units[i].text}"`);
  }
}

test().catch(console.error);
