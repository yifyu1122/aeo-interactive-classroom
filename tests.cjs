'use strict';
// Run from any directory: node /path/to/tests.cjs
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const AEO=require('./engine.js');
const Pseudo=require('./pseudocode.js');
const Bench=require('./benchmark-functions.js');
const Plot=require('./plot.js');
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
test('基準函數註冊、維度切換與已知最佳值',()=>{
  const fspec=require('./engine.js');
  fspec.registerFunction('testSphere',{name:'測試 Sphere',dim:3,L:-100,U:100},x=>x.reduce((s,v)=>s+v*v,0));
  assert.equal(fspec.objective('testSphere',[0,0,0]),0);
  assert.equal(fspec.validate({fn:'testSphere'}).fn,'testSphere');
  assert.equal(fspec.run({fn:'testSphere',n:3,T:1,seed:42,L:-100,U:100}).history.length,2);
  assert.throws(()=>fspec.objective('testSphere',[0,0]),RangeError);
});
test('可執行基準函數以原論文維度使用共用引擎、Seed 可重現且歷史快照不變',()=>{
  for(const id of ['1','9']){
    const spec=Bench.specs[id];
    AEO.registerFunction(`bench${id}`,{name:`f${id} ${spec.name}`,dim:spec.dim,L:spec.L,U:spec.U,knownBest:spec.best},spec.evaluate);
  }
  for(const [fn,L,U] of [['bench1',-100,100],['bench9',-5.12,5.12]]){
    assert.equal(AEO.functions[fn].dim,30);
    assert.equal(AEO.objective(fn,Array(30).fill(0)),0);
    const cfg={fn,n:6,T:4,seed:17,L,U};
    const first=AEO.run(cfg), replay=AEO.run(cfg);
    assert.deepEqual(first,replay,fn+' 同 Seed 必須重現完整事件');
    assert.equal(first.history.at(-1).fe,6*(1+2*4));
    assert.ok(first.initial.every(p=>p.x.length===30));
    const saved=structuredClone(first);
    AEO.run({...cfg,seed:18});
    assert.deepEqual(first,saved,'已保存歷史不可被後續執行改寫');
  }
  near(AEO.objective('bench9',[...Array(29).fill(0),0.5]),410.0625);
  near(AEO.objective('bench9',[1,...Array(29).fill(0)]),1);
  assert.ok(AEO.objective('bench9',Array(30).fill(1))>0);
  assert.equal(Bench.specs[9].evaluate([...Array(29).fill(0),0.5]),410.0625);
  assert.ok(!Bench.specs[7],'隨機噪聲函數須等到 RNG/FE 策略被明確實作才可執行');
  const source=fs.readFileSync('benchmarks.js','utf8');
  assert.match(source,/xᵢ²−10cos\(2πxᵢ\)\+10\]²/);
  assert.match(source,/尚未驗證／缺少必要資料；目前僅供公式教學，不能執行/);
});
test('已接入公式在論文已知最優位置驗證',()=>{
  for(const [id,spec] of Object.entries(Bench.specs)){
    const x=Array(spec.dim).fill(0);
    if(id==='5')x.fill(1);
    if(id==='6')x.fill(-.5);
    if(id==='8')x.fill(420.968746);
    if(id==='11')x.fill(100);
    if(id==='12')x.fill(-1);
    if(id==='13')x.fill(1);
    if(id==='14')x.splice(0,2,-31.97833,-31.97833);
    if(id==='15')x.splice(0,4,.1928,.1908,.1231,.1358);
    if(id==='16')x.splice(0,2,.089842,-.712656);
    if(id==='19')x.splice(0,3,.114614,.555649,.852547);
    if(id==='20')x.splice(0,6,.20169,.150011,.476874,.275332,.311652,.6573);
    if(['21','22','23'].includes(id))x.fill(4);
    near(spec.evaluate(x),spec.best,id==='8'?2e-5:id==='14'?1e-5:id==='15'?1e-5:id==='16'?1e-6:id==='19'?0.003:id==='20'?0.001:id==='21'?2e-5:id==='22'?2e-5:id==='23'?2e-4:1e-8);
    const idString=String(id);
    AEO.registerFunction(`verified${idString}`,{name:spec.name,dim:spec.dim,L:spec.L,U:spec.U,knownBest:spec.best},spec.evaluate);
    near(AEO.objective(`verified${idString}`,x),spec.best,id==='8'?2e-5:id==='14'?1e-5:id==='15'?1e-5:id==='16'?1e-6:id==='19'?0.003:id==='20'?0.001:id==='21'?2e-5:id==='22'?2e-5:id==='23'?2e-4:1e-8);
  }
  const penalized2=[6,...Array(29).fill(0)];
  near(Bench.specs[13].evaluate(penalized2),15.4,1e-12);
  assert.match(Bench.specs[13].formula,/u\(xᵢ;5,10,4\)/);
});
test('高維目標函數視覺化明確標示切片且不以 1D 向量求值',()=>{
  const plot=fs.readFileSync('plot.js','utf8'),app=fs.readFileSync('app.js','utf8');
  assert.match(plot,/const point = Array\(dimension\)\.fill\(0\); point\[0\] = x/);
  assert.match(plot,/二維切片搜尋空間/);
  assert.match(plot,/其餘 \$\{dimension - 2\} 維固定為 0/);
  assert.match(app,/currentDim: state\.currentDim/);
  assert.match(app,/二維切片（其餘/);
});
test('跨函數收斂比較使用各自初始差距比例，並以 FE 為共同成本軸',()=>{
  const f1=[10000,1000,100],f9=[400,40,4];
  const ratios=(values,best)=>values.map(v=>Plot.normalizedGap(v,best,Math.abs(values[0]-best)));
  assert.deepEqual(ratios(f1,0),ratios(f9,0));
  assert.deepEqual(ratios([8,5,2],2),[1,.5,0]);
  assert.equal(Plot.normalizedGap(0,0,0),0);
  const plot=fs.readFileSync('plot.js','utf8');
  assert.match(plot,/函數評估次數 FE/);
  assert.match(plot,/相對初始最佳值差距/);
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/固定 FE 並以多個 Seed 重複執行/);
});
test('單一共用實驗室：無第七單元與頂層分頁，保留單一播放控制器',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/id="functionSource"/);assert.match(html,/id="functionSelect"/);assert.match(html,/id="startExperiment"/);
  assert.match(html,/id="playBtn"/);assert.equal((html.match(/id="playBtn"/g)||[]).length,1);
  assert.doesNotMatch(html,/data-target="unit7"|id="unit7"|data-lab-tab=/);
  assert.equal((html.match(/id="unit[1-6]"/g)||[]).length,6);
  for(const id of ['labBasicTab','labBenchmarkTab','labCompareTab','labBasicPanel','labBenchmarkPanel','labComparePanel'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/role="tablist" aria-label="第五單元內容"/);
  assert.match(html,/id="labComparePanel"[^>]*hidden/);
  assert.match(html,/id="labBenchmarkPanel"[^>]*hidden/);
  assert.ok(html.indexOf('benchmark-functions.js')<html.indexOf('benchmarks.js'),'純函數實作必須先於介面註冊載入');
  const app=fs.readFileSync('app.js','utf8');assert.match(app,/setPendingFunction\(id\)/);assert.match(app,/startPending\(\)/);
  assert.match(app,/showLabTab\(id\)/);
  const benchmarkUI=fs.readFileSync('benchmarks.js','utf8');
  assert.match(benchmarkUI,/Object\.keys\(global\.AEOBenchmarkFunctions\.specs\)/);
  assert.match(benchmarkUI,/global\.AEO\.registerFunction\(`bench\$\{id\}`/);
  assert.match(benchmarkUI,/data-benchmark-start="\$\{x\[0\]\}"/,'支援函數卡片應在執行時產生共用實驗載入按鈕');
  assert.match(benchmarkUI,/start\.click\(\);global\.AEOApp\?\.showLabTab\('basic'\)/);
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
test('原論文偽碼中譯獨立呈現，預設簡易模式且保留原偽碼食性式號',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const app=fs.readFileSync('app.js','utf8');
  assert.match(html,/id="pseudoSimpleTab" aria-selected="true"/);
  assert.match(html,/id="pseudoSourceTab"[^>]*>原論文偽碼中譯/);
  assert.match(html,/id="pseudoSource"[\s\S]*?rand &lt; 1 \/ 3:[\s\S]*?式 \(6\)[\s\S]*?1 \/ 3 &lt;= rand &lt; 2 \/ 3:[\s\S]*?式 \(7\)[\s\S]*?式 \(8\)/);
  assert.match(html,/互動計算與逐步高亮仍以「完整中文虛擬碼」及實際引擎為準/);
  assert.match(app,/mode === 'source'/);
});
test('不合法設定逐一拒絕',()=>{
  for(const overrides of [{n:2},{n:41},{n:3.5},{T:0},{T:151},{seed:-1},{seed:2**32},{seed:1.2},{seed:''},{L:5,U:5},{L:6,U:1},{L:NaN},{U:Infinity},{L:-10001},{fn:'toString'},{demo:'fake'}])
    assert.throws(()=>AEO.run({...config,...overrides}),RangeError);
});
