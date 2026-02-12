// #region agent log
fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/bootstrap.ts:ENTRY',message:'Bootstrap entry reached',data:{execPath:process.execPath,cwd:process.cwd(),resourcesPath:process.resourcesPath||'N/A',platform:process.platform,versions:{electron:process.versions.electron,node:process.versions.node}},timestamp:Date.now(),runId:'pre-fix-2',hypothesisId:'A2'})}).catch((err:any)=>{console.error('[AgentLog] ENTRY failed',err?.message||String(err));});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/bootstrap.ts:FETCH_CHECK',message:'Bootstrap fetch availability',data:{fetchType:typeof fetch},timestamp:Date.now(),runId:'pre-fix-2',hypothesisId:'D2'})}).catch((err:any)=>{console.error('[AgentLog] FETCH_CHECK failed',err?.message||String(err));});
// #endregion

try {
  require('./appmain.js')
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/bootstrap.ts:IMPORT_OK',message:'Main index required successfully',data:{},timestamp:Date.now(),runId:'pre-fix-2',hypothesisId:'A2'})}).catch((err:any)=>{console.error('[AgentLog] IMPORT_OK failed',err?.message||String(err));});
  // #endregion
} catch (err: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/43e14a31-7dfc-48c4-8100-ef5dd33935d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main/bootstrap.ts:IMPORT_FAIL',message:'Main index require failed',data:{error:err?.message||String(err),code:err?.code||null,stackTop:err?.stack?String(err.stack).split('\n').slice(0,4).join(' | '):null},timestamp:Date.now(),runId:'pre-fix-2',hypothesisId:'A2'})}).catch((e:any)=>{console.error('[AgentLog] IMPORT_FAIL failed',e?.message||String(e));});
  // #endregion
  throw err
}
