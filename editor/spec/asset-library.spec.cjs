const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile, writeFile, readdir, mkdir, mkdtemp } = require('node:fs/promises');
const path = require('node:path');
const { AssetLibrary, imageList } = require('../asset-library.cjs');
const { QuestStore } = require('../quest-store.cjs');
const { parseMissions } = require('../quest-reader.cjs');
const root = path.resolve(__dirname, '../..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5O8AAAAASUVORK5CYII=', 'base64');
const inspect = async () => ({ width: 1, height: 1, preview: 'data:image/png;base64,' + png.toString('base64') });
const textOf = mission => Object.fromEntries(['title','teaser','description','note'].map(key => [key,mission[key]]));
const objectivesOf = mission => mission.objectives.map((objective,sourceIndex) => ({sourceIndex,text:objective.text}));
const imagesOf = mission => imageList(mission).map((image,sourceIndex) => ({sourceIndex,src:image.src,alt:image.alt || ''}));
async function fixture() {
  const parent = path.join(root, '.cache/quest-image-checks'); await mkdir(parent,{recursive:true});
  const directory = await mkdtemp(path.join(parent,'checkout '));
  const source = await readFile(path.join(root,'missions-data.js'));
  await writeFile(path.join(directory,'missions-data.js'),source);
  return {directory,source,store:await QuestStore.open(directory),assets:new AssetLibrary(directory,inspect)};
}

test('objectives edit, add, remove and reorder while targets and other quest data remain intact',async()=>{
  const f=await fixture(), original=f.store.board.missions[0];
  const entries=[{sourceIndex:2,text:'Updated third objective'},{sourceIndex:0,text:original.objectives[0].text},{sourceIndex:null,text:'New objective'}];
  const result=await f.store.save(original.id,{...textOf(original),objectives:entries});
  const expected=structuredClone(parseMissions(f.source.toString()));
  expected[0].objectives=[{...original.objectives[2],text:entries[0].text},original.objectives[0],{text:'New objective'}];
  assert.deepEqual(result.board.missions,expected);
  assert.deepEqual((await QuestStore.open(f.directory)).board.missions,expected);
  assert.equal(Object.hasOwn(result.board.missions[0].objectives[0].mapTarget,'zoom'),false);
  assert.deepEqual(await readFile(path.join(f.directory,result.backup)),f.source);
});

test('full unchanged drafts preserve legacy image fields and source bytes',async()=>{
  const f=await fixture(), mission=f.store.board.missions[2];
  assert.equal((await f.store.save(mission.id,{...textOf(mission),objectives:objectivesOf(mission),images:imagesOf(mission)})).saved,false);
  assert.deepEqual(await readFile(path.join(f.directory,'missions-data.js')),f.source);
  assert.deepEqual(await readdir(f.directory),['missions-data.js']);
});

test('list limits, duplicate origins, image path changes and target injection are rejected',async()=>{
  const f=await fixture(), mission=f.store.board.missions[0], base=textOf(mission);
  for (const values of [
    {objectives:[]},{objectives:Array(17).fill({sourceIndex:null,text:'Go'})},
    {objectives:[{sourceIndex:0,text:'One'},{sourceIndex:0,text:'Duplicate'}]},
    {objectives:[{sourceIndex:0,text:'Go',mapTarget:{x:1,y:2}}]},
    {objectives:[{sourceIndex:null,text:'x'.repeat(513)}]},
    {images:[]},{images:Array(9).fill({sourceIndex:null,src:'assets/one.png',alt:''})},
    {images:[{sourceIndex:0,src:'assets/other.png',alt:''}]},
    {images:[{sourceIndex:null,src:'../outside.png',alt:''}]}
  ]) await assert.rejects(f.store.save(mission.id,{...base,...values}),error=>Boolean(error.fieldErrors));
  assert.deepEqual(await readFile(path.join(f.directory,'missions-data.js')),f.source);
});

test('PNG imports stay staged until Save, deduplicate, and are installed before source references',async()=>{
  const f=await fixture(), mission=f.store.board.missions[0];
  const input=path.join(f.directory,'a screenshot.png'); await writeFile(input,png);
  const image=await f.assets.stage(input);
  assert.equal((await f.assets.stage(input)).src,image.src);
  await assert.rejects(readFile(path.join(f.directory,image.src)),{code:'ENOENT'});
  const result=await f.store.save(mission.id,{...textOf(mission),images:[{sourceIndex:null,src:image.src,alt:'Imported screenshot'}]}, {assets:f.assets,checkpoint:async phase=>{
    if(phase==='images') { assert.deepEqual(await readFile(path.join(f.directory,image.src)),png); assert.deepEqual(await readFile(path.join(f.directory,'missions-data.js')),f.source); }
  }});
  assert.equal(result.saved,true);
  assert.deepEqual(result.board.missions[0].images,[{src:image.src,alt:'Imported screenshot'}]);
  assert.deepEqual(await readFile(path.join(f.directory,image.src)),png);
  assert.equal(f.assets.staged.size,0);
});

test('legacy single images can become ordered arrays without losing legacy or unrelated fields',async()=>{
  const f=await fixture(), mission=f.store.board.missions[2];
  await mkdir(path.join(f.directory,'assets')); await writeFile(path.join(f.directory,mission.image),png);
  const result=await f.store.save(mission.id,{...textOf(mission),images:[{sourceIndex:0,src:mission.image,alt:'Updated description'}]},{assets:f.assets});
  assert.equal(result.board.missions[2].image,mission.image);
  assert.equal(result.board.missions[2].imageAlt,mission.imageAlt);
  assert.deepEqual(result.board.missions[2].images,[{src:mission.image,alt:'Updated description'}]);
  assert.deepEqual(result.board.missions.filter(m=>m.id!==mission.id),parseMissions(f.source.toString()).filter(m=>m.id!==mission.id));
});

test('removing an association keeps its asset and failures after import leave source intact',async()=>{
  const f=await fixture(), mission=f.store.board.missions[0];
  await mkdir(path.join(f.directory,'assets')); await writeFile(path.join(f.directory,'assets/retained.png'),png);
  const input=path.join(f.directory,'input.png'); await writeFile(input,png); const image=await f.assets.stage(input);
  await assert.rejects(f.store.save(mission.id,{...textOf(mission),images:[{sourceIndex:null,src:image.src,alt:''}]},{assets:f.assets,checkpoint:async phase=>{if(phase==='images')throw new Error('Stop before source replacement');}}),/Stop before/);
  assert.deepEqual(await readFile(path.join(f.directory,'missions-data.js')),f.source);
  assert.deepEqual(await readFile(path.join(f.directory,image.src)),png);
  assert.deepEqual(await readFile(path.join(f.directory,'assets/retained.png')),png);
  assert.equal(f.assets.staged.size,1);
});

test('asset paths, casing, corrupt PNGs, size bounds and collisions are checked without overwrites',async()=>{
  const f=await fixture(); await mkdir(path.join(f.directory,'assets')); await writeFile(path.join(f.directory,'assets/one.png'),png);
  await assert.rejects(f.assets.bytes('assets/../missions-data.js'),/Invalid/);
  await assert.rejects(f.assets.bytes('assets/ONE.png'),/Case-mismatched/);
  const input=path.join(f.directory,'broken.png'); await writeFile(input,'broken'); await assert.rejects(f.assets.stage(input),/not a PNG/);
  await writeFile(input,png); const image=await f.assets.stage(input); f.assets.clearStaged();
  await writeFile(path.join(f.directory,image.src),'collision'); await assert.rejects(f.assets.stage(input));
  assert.equal(await readFile(path.join(f.directory,image.src),'utf8'),'collision');
  const large=Buffer.from(png);large.writeUInt32BE(4097,16); await writeFile(input,large); await assert.rejects(f.assets.stage(input),/4096/);
});

test('image changes observed after preview block saving and retain the draft source',async()=>{
  const f=await fixture(), mission=f.store.board.missions[2]; await mkdir(path.join(f.directory,'assets')); const filename=path.join(f.directory,mission.image); await writeFile(filename,png);
  await f.assets.preview(mission.image);
  await writeFile(filename,Buffer.concat([png,Buffer.from('changed')]));
  await assert.rejects(f.store.save(mission.id,{...textOf(mission),images:[{sourceIndex:0,src:mission.image,alt:'Edited alt'}]},{assets:f.assets}),/CONFLICT/);
  assert.deepEqual(await readFile(path.join(f.directory,'missions-data.js')),f.source);
});
