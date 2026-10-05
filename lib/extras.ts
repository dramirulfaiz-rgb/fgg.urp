import {groups,ProposalData} from './proposal';
export type TableBlock={id:string,type:'table',caption:string,rows:string[][]};
export type PictureBlock={id:string,type:'picture',caption:string,assetId:string};
export type ExtraBlock=TableBlock|PictureBlock;
export type Extras=Record<string,ExtraBlock[]>;
export function readExtras(data:ProposalData):Extras{try{return JSON.parse(data._extras||'{}');}catch{return {};}}
export function validateExtras(raw:string):Extras{
 if(typeof raw!=='string'||raw.length>180000)throw new Error('Tables and captions are too large. Please shorten them.');const value=JSON.parse(raw);if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Invalid proposal tables or pictures.');const allowed=new Set(groups.slice(1).flatMap(g=>g.fields.map(([k])=>k)));let total=0;
 for(const [field,blocks] of Object.entries(value)){
  if(!allowed.has(field)||!Array.isArray(blocks)||blocks.length>6)throw new Error('Use up to six tables or pictures per proposal item.');total+=blocks.length;if(total>60)throw new Error('Use up to 60 tables and pictures in one proposal.');
  for(const b of blocks){if(!b||typeof b!=='object'||typeof b.id!=='string'||b.id.length>64||typeof b.caption!=='string'||b.caption.length>2000)throw new Error('Invalid table or picture caption.');
   if(b.type==='table'){if(!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>30||!Array.isArray(b.rows[0])||b.rows[0].length<1||b.rows[0].length>8||b.rows.some((r:unknown)=>!Array.isArray(r)||r.length!==b.rows[0].length||r.some(c=>typeof c!=='string'||c.length>2000)))throw new Error('Tables support up to 30 rows and eight columns, with 2,000 characters per cell.');}
   else if(b.type==='picture'){if(typeof b.assetId!=='string'||! /^[a-f0-9]{32}$/.test(b.assetId))throw new Error('Invalid picture reference.');}
   else throw new Error('Unsupported proposal attachment.');
  }
 }return value as Extras;
}
