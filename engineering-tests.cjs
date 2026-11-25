const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = {window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/engineering-controls.js','utf8'),scope);
const controls = scope.window.EngineeringControls;
test('八個模型的每個尺寸控制都改變 SVG，包含整數球數與片數',()=>{
  controls.definitions.forEach((ds,i)=>{
    const values=ds.map(d=>d[5]);
    const original=controls.geometry(i,values);
    ds.forEach((d,j)=>{
      const next=values.slice();next[j]=d[5]===d[3]?d[2]:d[3];
      assert.notEqual(controls.geometry(i,next),original,`案例 ${i+1} ${d[0]}`);
      assert.doesNotMatch(controls.geometry(i,next),/NaN|Infinity/);
    });
  });
});
test('桁架指定數值、可行與不可行狀態；懸臂梁撓度限制',()=>{
  assert.match(controls.feedback(0,[1,1]),/38.2843/);
  assert.match(controls.feedback(0,[1,1]),/✓/);
  assert.match(controls.feedback(0,[.01,0]),/✕/);
  assert.match(controls.feedback(1,[1,1,1,1,1]),/g₁ = Σaᵢ\/xᵢ³−1 = 124/);
  assert.match(controls.feedback(1,[10,10,10,10,10]),/✓/);
});
test('不把局部計算冒稱完整可行性或質量結果',()=>{
  assert.match(controls.feedback(2,[.05,.05,10]),/分母為零/);
  assert.match(controls.feedback(2,[.051897,.361751,10.879842]),/g1=0.0109/);
  assert.match(controls.feedback(3,[.84,.42,43,160]),/四項限制通過|限制未通過/);
  assert.match(controls.feedback(7,[70,100,1.5,800,5]),/未指定密度/);
  assert.match(controls.feedback(6,[125,31.5,50]),/重疊/);
});
