// Dedicated generation worker: cancellation terminates this worker without touching author data.
importScripts('./vendor/pdf/pdfmake-0.3.11.min.js','./vendor/pdf/roboto-vfs.js');
self.onmessage=async({data})=>{
 try{
  self.postMessage({stage:'Laying out all ballot pages…'});
  const {ballotPdfDefinition}=await import('./pdf-layout.js');
  self.pdfMake.setUrlAccessPolicy(()=>false);
  const definition=ballotPdfDefinition(data.snapshot,data.content);
  // Table layout callbacks live in this worker; message data contains only plain content.
  for(const node of definition.content)if(node.table)node.layout={hLineWidth:i=>i===0?1:.5,vLineWidth:()=>.6,hLineColor:()=> '#a9b8c3',vLineColor:()=> '#a9b8c3',paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>3,paddingBottom:()=>3};
  const buffer=await self.pdfMake.createPdf(definition).getBuffer(),bytes=new Uint8Array(buffer);
  self.postMessage({bytes:bytes.buffer},[bytes.buffer]);
 }catch(error){self.postMessage({error:error.message||'PDF generation failed.'});}
};
