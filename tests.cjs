'use strict';
// Run from any directory: node /path/to/tests.cjs
const assert=require('node:assert/strict');
const test=require('node:test');
const AEO=require('./engine.js');
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
test('不合法設定逐一拒絕',()=>{
  for(const overrides of [{n:2},{n:41},{n:3.5},{T:0},{T:151},{seed:-1},{seed:2**32},{seed:1.2},{seed:''},{L:5,U:5},{L:6,U:1},{L:NaN},{U:Infinity},{L:-10001},{fn:'toString'},{demo:'fake'}])
    assert.throws(()=>AEO.run({...config,...overrides}),RangeError);
});
