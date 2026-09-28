// Local synthetic browser harness. No API, database, credentials or real photos.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const module = readFileSync(new URL('../src/lib/evidencePhotos.js', import.meta.url));
const html = `<!doctype html><meta charset="utf-8"><title>Evidence compression check</title>
<button id="run">ทดสอบลดขนาดรูปจำลอง</button><pre id="result">พร้อมทดสอบ</pre>
<script type="module">
import { compressEvidencePhoto, createEvidenceForm, MAX_SUBMISSION_BYTES } from '/evidencePhotos.js';
document.querySelector('#run').onclick = async () => {
 const result = document.querySelector('#result'); result.textContent = 'กำลังทดสอบ';
 try {
  const canvas = document.createElement('canvas'); canvas.width = 3000; canvas.height = 2000;
  const context = canvas.getContext('2d'); const pixels = context.createImageData(3000, 2000);
  let seed = 1;
  for (let i=0;i<pixels.data.length;i+=4) {
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   pixels.data[i]=seed&255; pixels.data[i+1]=(seed>>>8)&255; pixels.data[i+2]=(seed>>>16)&255; pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const original=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));
  const compressed=await compressEvidencePhoto(original);
  const bitmap=await createImageBitmap(compressed);
  const dimensions=[bitmap.width,bitmap.height]; bitmap.close();
  const form=await createEvidenceForm({note:'ข้อมูลจำลอง'},[compressed,compressed]);
  const bytes=(await new Response(form).arrayBuffer()).byteLength;
  if (bytes>=MAX_SUBMISSION_BYTES || Math.max(...dimensions)>2048) throw Error('budget/dimensions failed');
  const small=document.createElement('canvas'); small.width=100;small.height=50;
  const png=await new Promise(resolve=>small.toBlob(resolve,'image/png'));
  const smallOutput=await compressEvidencePhoto(png);const smallBitmap=await createImageBitmap(smallOutput);
  const smallDimensions=[smallBitmap.width,smallBitmap.height];smallBitmap.close();
  if (smallDimensions.join(',')!=='100,50') throw Error('small image upscaled');
  let rejected=false;try {await compressEvidencePhoto(new Blob(['corrupt'],{type:'image/jpeg'}));}catch {rejected=true;}
  if (!rejected) throw Error('corrupt image accepted');
  result.textContent=JSON.stringify({passed:true,inputBytes:original.size,outputBytes:compressed.size,dimensions,multipartBytes:bytes,smallDimensions,corruptRejected:rejected});
 }catch(error){result.textContent=JSON.stringify({passed:false,error:error.message});}
};
</script>`;
const server = createServer((req,res) => {
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/evidencePhotos.js') {res.setHeader('Content-Type','text/javascript');res.end(module);}
  else if(req.url==='/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
  else {res.statusCode=404;res.end();}
});
server.listen(4329,'127.0.0.1');
const finish=()=>server.close(()=>process.exit(0));
setTimeout(finish,90_000);
process.on('SIGTERM',finish);
