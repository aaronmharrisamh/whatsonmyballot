export const COLLECTION_FORMAT='whatsonmyballot-collection';
export const SCHEMA_VERSION='1.0.0';
export const LIMITS=Object.freeze({fileBytes:25_000_000,expandedBytes:100_000_000});
export const COLORS=Object.freeze(['blue','green','red','yellow','orange','gray']);
export const MEDIA_TYPES=Object.freeze(['application/pdf','image/png','image/jpeg','image/webp','text/markdown','text/plain']);
export const ERROR_CATALOG=Object.freeze({
 'JSN-E01':{message:'The file could not be read as JSON.',hint:'Choose one .json file and correct its JSON syntax.'},
 'JSN-E02':{message:'The collection format or schema version is not supported.',hint:'Use whatsonmyballot-collection with schema 1.0.0. Migration is not available yet.'},
 'JSN-E03':{message:'A required field, value, or structure is invalid.',hint:'Compare the reported path with SCHEMASAMPLE.JSON and the schema.'},
 'JSN-E04':{message:'An ID is used more than once.',hint:'Give each record a unique ID and update its references.'},
 'JSN-E05':{message:'A reference or ownership relationship is invalid.',hint:'Use an existing ID of the right record type and check parent relationships.'},
 'JSN-E06':{message:'A ballot rule or layout is invalid or unsupported.',hint:'Check contest kinds, choice limits, Yes/No answers, and page/column order.'},
 'JSN-E07':{message:'Guide content does not match its ballot or author.',hint:'Use choices from this guide’s ballot and attribute each nonempty opinion.'},
 'JSN-E08':{message:'An attachment could not be validated.',hint:'Use an allowed file type with valid gzip/base64, sizes, and SHA-256.'},
 'JSN-E09':{message:'The collection exceeds a size limit.',hint:'Keep JSON at or below 25 MB and expanded content at or below 100 MB.'}
});
export class CollectionError extends Error{
 constructor(diagnostics){super(diagnostics[0]?.message||'Invalid collection');this.name='CollectionError';this.diagnostics=diagnostics;this.code=diagnostics[0]?.code;}
}
export function diagnostic(code,{path='',recordId=null,message,hint,receivedVersion=null,...extra}={}){
 const base=ERROR_CATALOG[code];if(!base)throw Error('Unknown JSN code');
 return{code,message:message||base.message,path,recordId,expectedVersion:SCHEMA_VERSION,receivedVersion,hint:hint||base.hint,...extra};
}
export function fail(code,details){throw new CollectionError([diagnostic(code,details)]);}
export function formatErrorReport(error){
 const list=error instanceof CollectionError?error.diagnostics:[{code:'Operation failed',message:error?.message||String(error)}];
 return list.map(d=>[d.code+': '+d.message,d.path?'Path: '+d.path:'',d.recordId?'Record: '+d.recordId:'',d.expectedVersion?'Schema: expected '+d.expectedVersion+'; received '+(d.receivedVersion||'not supplied'):'',d.hint?'Fix: '+d.hint:''].filter(Boolean).join('\n')).join('\n\n');
}
