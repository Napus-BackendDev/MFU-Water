// Synthetic loopback harness: real form/client, no database or external requests.
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { resolve } from 'node:path';

const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import WaterWatchForm from './src/components/KokWaterWatch/WaterWatchForm.jsx';
let notify=()=>{}; const attempts=[];
window.fetch=async (path,options)=>{
 if(path==='/api/security/csrf')return Response.json({csrfToken:'synthetic-only'});
 if(path!=='/api/samples')throw Error('External requests prohibited');
 attempts.push({key:options.headers['Idempotency-Key'],payload:options.body.get('sample')});notify();
 if(attempts.length===1)return Response.json({error:'Synthetic ambiguous failure'},{status:503});
 if(attempts.length===2)return Response.json({success:true});
 return Response.json({success:true,sample_code:'SYNTHETIC-RETRY',status:'pending_review',revision:1});
};
function Harness(){
 const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);
 const [receipt,setReceipt]=useState('');const [,tick]=useState(0);
 notify=()=>tick(n=>n+1);
 const summary={requests:attempts.length,pending,open,receipt,
 sameKey:attempts.length>0&&attempts.every(a=>a.key===attempts[0].key),
 samePayload:attempts.length>0&&attempts.every(a=>a.payload===attempts[0].payload)};
 return <><h1>Local synthetic retry check</h1><button onClick={()=>setOpen(true)}>เปิดฟอร์ม</button>
 <pre id="result">{JSON.stringify(summary)}</pre>
 {(open||pending)&&<div aria-hidden={!open} style={{display:open?undefined:'none'}}>
 <WaterWatchForm onCancel={()=>setOpen(false)} onPendingAttemptChange={setPending}
 onSubmitSuccess={sample=>{setReceipt(sample.sample_code);setOpen(false);}}/>
 </div>}</>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
`;
const bundled = await build({stdin:{contents:entry,resolveDir:resolve(import.meta.dirname,'..'),loader:'jsx'},
 bundle:true,write:false,platform:'browser',format:'esm',define:{'process.env.NODE_ENV':'"development"'}});
const script=bundled.outputFiles[0].contents;
const server=createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' blob: data:; style-src 'unsafe-inline'; script-src 'self'");
 if(req.url==='/harness.js'){res.setHeader('Content-Type','text/javascript');res.end(script);}
 else if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>Local form retry check</title><div id="root"></div><script type="module" src="/harness.js"></script>');}
 else{res.statusCode=404;res.end();}
});
server.listen(4330,'127.0.0.1',()=>console.log('Synthetic retry harness ready on loopback port 4330'));
const finish=()=>{server.closeAllConnections();server.close(()=>process.exit(0));};
const expiry=setTimeout(finish,180_000);
process.on('SIGTERM',()=>{clearTimeout(expiry);finish();});
