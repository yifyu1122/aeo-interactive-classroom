'use strict';
// Run from any directory: node /path/to/tests.cjs
const assert=require('node:assert/strict');
const test=require('node:test');
const AEO=require('./engine.js');
const Pseudo=require('./pseudocode.js');
const config={fn:'sphere',n:8,T:12,L:-5,U:5,seed:42};
const near=(actual,expected,tol=1e-12)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),actual+' vs '+expected);
function vec(actual,expected) {
  assert.equal(actual.length,expected.length);
  actual.forEach((v,i)=>near(v,expected[i]));
}

test('生產：凸組合與 a=0、1 的端點',()=>{
  vec(AEO.production([1,2],[-3,5],.2),[.2,2.6]);
  vec(AEO.production([1],[-3],0),[1]);vec(AEO.production([1],[-3],1),[-3]);
});
test('草食、肉食及雜食：固定三種路標與步幅，驗算有號位置差',()=>{
  const x=[2], d1=AEO.diff(x,[5]), d2=AEO.diff(x,[-4]);
  vec(d1,[-3]); vec(d2,[6]); near(AEO.factor(-1,-1),-.5);
  vec(AEO.consumption(x,d1,-.5),[3.5]);vec(AEO.consumption(x,d2,-.5),[-1]);
  vec(AEO.consumption(x,AEO.mix(.5,d1,d2),-.5),[1.25]);
  vec(AEO.consumption(x,d1,+.5),[.5]); // reverse direction for positive C
});
test('分解：以最佳位置為起點且擾動為負',()=>{
  vec(AEO.decomposition([1.1],[.2],.3,.5,.5),[.065]);
  vec(AEO.decomposition([1,3],[4,-2],0,1,.5),[4,-2]);
});
test('四種目標函數，已知最小值與維度',()=>{
  assert.equal(AEO.objective('square',[-3]),9);
  assert.equal(AEO.objective('sphere',[3,-4]),25);
  near(AEO.objective('multi',[.5]),20.25);
  near(AEO.objective('rastrigin',[1,.5]),21.25);
  for (const [fn,meta] of Object.entries(AEO.functions)) near(AEO.objective(fn,Array(meta.dim).fill(0)),0);
  assert.throws(()=>AEO.objective('sphere',[1]));assert.throws(()=>AEO.objective('x',[1]));
});
test('同 Seed 全部事件相同，換 Seed 不同，種子 0 有效',()=>{
  assert.deepEqual(AEO.run(config),AEO.run(config));
  assert.notDeepEqual(AEO.run({...config,seed:0}).initial,AEO.run(config).initial);
});
test('越界整點重抽，邊界本身可接受及實際事件邊界核對',()=>{
  let draws=[.25,.75]; const rng={uniform:()=>draws.shift()};
  assert.deepEqual(AEO.bound([-5,5],config,rng),{next:[-5,5],repair:false,repairR:[]});
  assert.deepEqual(AEO.bound([0,8],config,rng),{next:[-2.5,2.5],repair:true,repairR:[.25,.75]});
  const records=AEO.run(config).events.filter(e=>e.kind==='evaluate');
  assert.ok(records.some(e=>e.repair));
  for(const e of records) {
    assert.equal(e.repair,e.raw.some(v=>v<config.L||v>config.U));
    if(e.repair)vec(e.next,e.repairR.map(r=>-5+10*r));
    else vec(e.next,e.raw);
    assert.ok(e.next.every(v=>v>=-5&&v<=5));near(e.newF,AEO.objective(config.fn,e.next));
    assert.equal(e.accepted,e.newF<e.oldF);
  }
});
test('獨立重播：每個步驟包含正確完整族群，倒退後前進還原相同狀態',()=>{
  const result=AEO.run(config);
  const byId=new Map(result.initial.map(p=>[p.id,p]));
  let ids=result.initial.map(p=>p.id);
  assert.ok(result.events.length>128); // cross a checkpoint
  for (const [index,e] of result.events.entries()) {
    if(e.kind==='sort'){
      const sorted=[...byId.values()].sort((a,b)=>b.f-a.f || a.id-b.id).map(p=>p.id);
      assert.deepEqual(e.order,sorted); ids=sorted;
    }
    if(e.kind==='evaluate'){
      vec(e.old,byId.get(e.id).x);
      if(e.accepted)byId.set(e.id,{id:e.id,x:e.next,f:e.newF});
    }
    assert.deepEqual(AEO.stateAt(result,index),ids.map(id=>byId.get(id)));
  }
  const plain=JSON.parse(JSON.stringify(result));
  for(let i=result.events.length-1;i>=0;i-=7) {
    const baseline=AEO.stateAt(plain,i);
    if(i>0)AEO.stateAt(result,i-1);
    assert.deepEqual(AEO.stateAt(result,i),baseline);
  }
  for(const h of result.history){
    near(h.best,Math.min(...AEO.stateAt(result,h.index).map(p=>p.f)));
    assert.equal(h.fe,config.n*(1+2*h.t));
  }
  assert.ok(result.history.every((h,i,a)=>i===0||h.best<=a[i-1].best));
});
test('依完整事件驗算數值，確認參考個體、隨機值、食性分段與索引',()=>{
  const r=AEO.run(config);
  let startOrder, producer, firstStageBest;
  for(let i=0;i<r.events.length;i++) {
    const e=r.events[i], p=e.random;
    if(e.kind==='sort') {
      startOrder=AEO.stateAt(r,i);
      firstStageBest=null;
    }
    if(e.kind!=='evaluate')continue;
    const ref=role=>e.refs.find(v=>v.role===role);
    let expect;
    if(e.stage==='production'){
      near(p.a,p.r1*(1-e.t/config.T));
      vec(ref('best').x,startOrder.at(-1).x);
      vec(ref('random').x,p.r.map(u=>config.L+u*(config.U-config.L)));
      expect=ref('best').x.map((v,j)=>(1-p.a)*v+p.a*ref('random').x[j]);
      producer=e.accepted?e.next:e.old;
    }else if(e.stage==='decomposition'){
      if(!firstStageBest) firstStageBest=AEO.stateAt(r,i-1).reduce((a,b)=>a.f<b.f || a.f===b.f && a.id<b.id ? a : b);
      vec(ref('best').x,firstStageBest.x);
      near(p.D,3*p.u); near(p.e,p.r3*p.k-1); near(p.h,2*p.r3-1);
      expect=e.old.map((v,j)=>firstStageBest.x[j]+p.D*(p.e*firstStageBest.x[j]-p.h*v));
    }else{
      let d1,d2;
      if(e.stage!=='carn') {
        vec(ref('producer').x,producer);
        d1=e.old.map((v,j)=>v-producer[j]); vec(d1,e.delta1);
      }
      if(e.stage!=='herb'){
        const peer=ref('peer');assert.ok(peer.rank>=2&&peer.rank<e.rank);
        assert.equal(peer.id,startOrder[peer.rank-1].id);vec(peer.x,startOrder[peer.rank-1].x);
        d2=e.old.map((v,j)=>v-peer.x[j]); vec(d2,e.delta2);
      }
      const d=e.stage==='omni'?d1.map((v,j)=>p.r2*v+(1-p.r2)*d2[j]):d1||d2;
      near(p.C,.5*p.v1/Math.abs(p.v2));vec(e.deltaMix,d);
      expect=e.old.map((v,j)=>v+p.C*d[j]);
      if(e.stage==='omni')assert.deepEqual(r.events.slice(i-3,i).map(p=>p.part),[1,2,3]);
      if(e.rank===2)assert.equal(e.stage,'herb');
    }
    vec(e.raw,expect);
  }
});
test('特定食性獨立示範只評估一次；整代沒有某策略時不補造事件',()=>{
  for(const demo of ['herb','carn','omni']){
    const r=AEO.run({...config,demo});
    assert.deepEqual(r.events.filter(e=>e.kind==='evaluate').map(e=>e.stage),[demo]);
    assert.equal(r.history.at(-1).fe,config.n+1);
  }
  const missing=AEO.run({...config,n:3,T:1});
  assert.ok(Object.values(missing.diets[1]).some(v=>v===0));
  for(const stage of ['herb','carn','omni'])
    assert.equal(missing.diets[1][stage],missing.events.filter(e=>e.kind==='evaluate'&&e.stage===stage).length);
});
test('中文虛擬碼逐行對應真實事件，三種食性都驗算接受與拒絕',()=>{
  const r=AEO.run({...config,fn:'square',n:8,T:12,L:-5,U:5,seed:0});
  const outcomes={herb:{},carn:{},omni:{}};
  const omniParts=[];
  for(const e of r.events){
    if(e.stage==='omni'&&e.kind==='proposal')omniParts.push(Pseudo.eventLine(e));
    if(e.kind!=='evaluate'||!outcomes[e.stage])continue;
    const detail=Pseudo.details(e,Pseudo.eventLine(e),r.config);
    assert.deepEqual(detail.raw,e.raw);
    assert.deepEqual(detail.candidate,e.next);
    assert.equal(detail.oldFValue,e.oldF);
    assert.equal(detail.newFValue,e.newF);
    assert.equal(detail.accepted,e.accepted);
    assert.match(detail.outcome,e.accepted?/接受新解/:/拒絕新解/);
    assert.ok(detail.equation.includes(e.stage==='herb'?'式 (4)–(6)':e.stage==='carn'?'式 (4)–(5)、(7)':'式 (4)–(5)、(8)'));
    assert.equal(detail.strategy,{herb:'草食',carn:'肉食',omni:'雜食'}[e.stage]);
    assert.ok(detail.randoms.some(value=>value.startsWith('C = ')),e.stage+' 應顯示實際消費係數');
    assert.ok(detail.refs.length>0,e.stage+' 應顯示實際參考個體');
    assert.ok(detail.calculation.includes('xᵢ = ['),e.stage+' 應顯示更新前位置');
    assert.ok(detail.calculation.includes('xᵢ′ = '),e.stage+' 應顯示代入計算後的新位置');
    if(e.rank>2) assert.ok(detail.randoms.some(value=>value.startsWith('dietDraw = ')),e.stage+' 應顯示本次食性抽選亂數');
    if(e.stage==='carn'||e.stage==='omni'){
      assert.ok(detail.randoms.some(value=>value.startsWith('peerDraw = ')),e.stage+' 應顯示同伴抽選亂數');
      assert.ok(detail.refs.some(value=>value.includes('排序同伴')),e.stage+' 應顯示排序同伴參考對象');
    }
    outcomes[e.stage][e.accepted]=true;
    if(e.stage==='herb')vec(e.raw,AEO.consumption(e.old,e.delta1,e.random.C));
    if(e.stage==='carn'){
      const peer=e.refs.find(x=>x.role==='peer');
      assert.ok(peer.rank>=2&&peer.rank<e.rank);
      vec(e.raw,AEO.consumption(e.old,e.delta2,e.random.C));
    }
    if(e.stage==='omni'){
      vec(e.deltaMix,AEO.mix(e.random.r2,e.delta1,e.delta2));
      vec(e.raw,AEO.consumption(e.old,e.deltaMix,e.random.C));
    }
  }
  for(const stage of ['herb','carn','omni'])assert.deepEqual(outcomes[stage],{false:true,true:true});
  assert.ok(omniParts.includes(18)&&omniParts.includes(19)&&omniParts.includes(20));
  const updates=r.events.filter(e=>e.kind==='proposal'&&['production','decomposition'].includes(e.stage));
  assert.ok(updates.some(e=>Pseudo.eventLine(e)===8));
  assert.ok(updates.some(e=>Pseudo.eventLine(e)===25));
  assert.ok(r.events.some(e=>e.stage==='production'&&e.kind==='evaluate'&&Pseudo.eventLine(e)===9));
  assert.ok(r.events.some(e=>e.stage==='decomposition'&&e.kind==='evaluate'&&Pseudo.eventLine(e)===26));
  for(const line of [14,17,18,19,20]){
    const index=Pseudo.findEventIndex(r,line,0);
    assert.ok(index>=0,`虛擬碼第 ${line} 行找不到真實事件`);
    assert.equal(Pseudo.eventLine(r.events[index]),line,`第 ${line} 行點選後應回到對應事件`);
  }
  for(const line of Pseudo.lines){
    assert.ok(Pseudo.findEventIndex(r,line.id,0)>=0,'虛擬碼第 '+line.id+' 行找不到可檢視的實際事件');
  }
  assert.match(Pseudo.lines.find(line=>line.id===8).code,/\(1 - a\) \* x_n \+ a \* x_rand.*生產（式 1）/);
  assert.match(Pseudo.lines.find(line=>line.id===14).code,/x_i \+ C \* \(x_i - x1\).*草食更新（式 6）/);
  assert.match(Pseudo.lines.find(line=>line.id===17).code,/x_i \+ C \* \(x_i - x_j\).*肉食更新（式 7）/);
  assert.match(Pseudo.lines.find(line=>line.id===19).code,/r2 \* delta1 \+ \(1 - r2\) \* delta2/);
  assert.match(Pseudo.lines.find(line=>line.id===23).code,/D = 3 \* u.*分解係數（式 9）/);
  assert.match(Pseudo.lines.find(line=>line.id===25).code,/x_best \+ D \* \(e \* x_best - h \* x_i\).*分解（式 12）/);
  const init=Pseudo.details(r.events.find(e=>e.kind==='init'),3,r.config,r);
  const expectedBest=r.initial.reduce((a,b)=>a.f<b.f?a:b);
  assert.ok(init.calculation.includes(`個體 ${expectedBest.id}`));
  const sort=Pseudo.details(r.events.find(e=>e.kind==='sort'),5,r.config,r);
  assert.deepEqual(sort.calculation.match(/個體 \d+/g),[`個體 ${r.events.find(e=>e.kind==='sort').order[0]}`,`個體 ${r.events.find(e=>e.kind==='sort').order.at(-1)}`]);
  const finish=Pseudo.details(r.events.at(-1),28,r.config,r);
  const shownBest=Number(finish.calculation.match(/最佳 f\(x\) = ([^；]+)/)?.[1]);
  near(shownBest,r.history.at(-1).best,1e-4);
});
test('不合法設定逐一拒絕',()=>{
  for(const overrides of [{n:2},{n:41},{n:3.5},{T:0},{T:151},{seed:-1},{seed:2**32},{seed:1.2},{seed:''},{L:5,U:5},{L:6,U:1},{L:NaN},{U:Infinity},{L:-10001},{fn:'toString'},{demo:'fake'}])
    assert.throws(()=>AEO.run({...config,...overrides}),RangeError);
});
