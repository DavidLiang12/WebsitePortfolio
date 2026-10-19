const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/paint.js`, 'utf8');
function setup({ artwork=false, exportFails=false }={}) {
  const nodes = {}, queued = [], downloads = [];
  let earned=0;
  const node=id=>nodes[id]??=( {handlers:{},value:id==='paint-size'?'6':'#000000',addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll:()=>[],focus(){},hasPointerCapture:()=>false,setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:600})} );
  const ctx={fillRect(){},getImageData:()=>({data:artwork?[0,0,0,255]:[255,255,255,255]}),beginPath(){},arc(){},fill(){},putImageData(){}};
  const canvas=node('paint-canvas');canvas.width=960;canvas.height=600;canvas.getContext=()=>ctx;canvas.toBlob=fn=>queued.push(()=>fn(exportFails?null:{}));
  const document={getElementById:node,body:{append(){}},createElement:()=>({click(){downloads.push(this.download);},remove(){}})};
  vm.runInNewContext(source,{document,window:{addEventListener(){},portfolioAchievements:{savePainting(){earned++;}}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){}});
  return {nodes,canvas,earned:()=>earned,downloads,save(){nodes['paint-save'].handlers.click();queued.shift()();}};
}
test('a successful nonblank Paint export earns Vincent van Gogh after the PNG is created',()=>{
  const app=setup({artwork:true});app.save();
  assert.equal(app.earned(),1);assert.deepEqual(app.downloads,['art-desk-drawing.png']);
});
test('blank paintings and failed exports do not earn the Paint achievement',()=>{
  const blank=setup();blank.save();assert.equal(blank.earned(),0);
  const failed=setup({artwork:true,exportFails:true});failed.save();assert.equal(failed.earned(),0);assert.deepEqual(failed.downloads,[]);
});
