/* Zhao, Wang & Zhang (2020), §2.2, equations (1)–(12).
 * No DOM, clock, platform RNG, or playback state is used by the simulation. */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.AEO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const functions = {
    square: {name:'一維平方函數', dim:1, L:-5, U:5, multimodal:false},
    multi: {name:'一維 Rastrigin', dim:1, L:-5.12, U:5.12, multimodal:true},
    sphere: {name:'二維 Sphere', dim:2, L:-5, U:5, multimodal:false},
    rastrigin: {name:'二維 Rastrigin', dim:2, L:-5.12, U:5.12, multimodal:true}
  };
  const defaults = {fn:'square', n:8, T:12, seed:42, L:-5, U:5, demo:''};
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  function validate(input = {}) {
    const config = {...defaults, ...input};
    if (!has(functions,config.fn)) throw new RangeError('請選擇清單中的目標函數。');
    if (!['','herb','carn','omni'].includes(config.demo)) throw new RangeError('請選擇有效的示範策略。');
    for (const [key,lo,hi,name] of [['n',3,40,'族群大小'],['T',1,150,'迭代上限'],['seed',0,4294967295,'隨機種子']]) {
      if (!Number.isInteger(config[key]) || config[key]<lo || config[key]>hi)
        throw new RangeError(name+'必須為 '+lo+' 到 '+hi+' 的整數。');
    }
    if (![config.L,config.U].every(v=>Number.isFinite(v) && Math.abs(v)<=10000) || !(config.L<config.U))
      throw new RangeError('上下界須為 −10000 到 10000 間的有限數值，且下界須小於上界。');
    return config;
  }
  function objective(fn,x) {
    if (!has(functions,fn) || !Array.isArray(x) || x.length!==functions[fn].dim || !x.every(Number.isFinite))
      throw new RangeError('目標函數和位置維度不相符，或座標不是有限數值。');
    // 10(1−cos(2πx)) = 20 sin²(πx); stable evaluation near the origin.
    return x.reduce((sum,v)=>sum+v*v+(functions[fn].multimodal ? 20*Math.sin(Math.PI*v)**2 : 0),0);
  }
  function generator(seed) {
    // Mulberry32 with explicitly bounded 32-bit state, followed by Box–Muller.
    let state=seed>>>0;
    function uniform() {
      state=(state+0x6D2B79F5)>>>0;
      let t=Math.imul(state^(state>>>15),state|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    }
    function normal() {
      return Math.sqrt(-2*Math.log(1-uniform()))*Math.cos(2*Math.PI*uniform());
    }
    return {uniform,normal};
  }
  const diff=(x,y)=>x.map((v,j)=>v-y[j]);
  const mix=(w,x,y)=>x.map((v,j)=>w*v+(1-w)*y[j]);
  const production=(best,point,a)=>mix(a,point,best); // Eq. 1
  const factor=(v1,v2)=>0.5*v1/Math.abs(v2);        // Eq. 4
  function consumption(x,delta,C) {return x.map((v,j)=>v+C*delta[j]);}
  function decomposition(x,best,D,e,h) {return best.map((v,j)=>v+D*(e*v-h*x[j]));}
  function sampledPoint(rng,config,dim) {
    const r=Array.from({length:dim},()=>rng.uniform());
    return {r,x:r.map(v=>config.L+(config.U-config.L)*v)};
  }
  // §2.2.3 says to regenerate an out-of-bounds individual. Chosen convention:
  // resample the entire vector once, evaluate that point, then compare strictly.
  function bound(raw,config,rng) {
    if (raw.every(v=>Number.isFinite(v) && v>=config.L && v<=config.U))
      return {next:raw, repair:false, repairR:[]};
    const p=sampledPoint(rng,config,raw.length);
    return {next:p.x, repair:true, repairR:p.r};
  }
  function bestOf(population) {
    return population.reduce((a,b)=>b.f<a.f || (b.f===a.f && b.id<a.id) ? b : a);
  }
  const byScore=(a,b)=>b.f-a.f || a.id-b.id;
  const reference=(role,p,rank)=>({role,id:p.id,rank,x:p.x});
  function proposeProduction(old,best,t,config,rng) {
    const sample=sampledPoint(rng,config,old.x.length);
    const cap=1-t/config.T, r1=rng.uniform(), a=cap*r1;
    return {stage:'production', raw:production(best.x,sample.x,a),
      refs:[reference('best',best,config.n),{role:'random',id:null,rank:null,x:sample.x}],
      random:{cap,r1,a,r:sample.r}};
  }
  function proposeConsumption(order,rank,producer,forced,rng) {
    const old=order[rank-1], random={dietDraw:null};
    let stage=forced;
    if (!stage) {
      // i=2 has no legal j in [2,i−1], so this implementation uses herbivory.
      stage='herb';
      if (rank>2) {
        random.dietDraw=rng.uniform();
        stage=['herb','carn','omni'][Math.floor(3*random.dietDraw)];
      }
    }
    random.v1=rng.normal();
    do {random.v2=rng.normal();} while (random.v2===0);
    random.C=factor(random.v1,random.v2);
    const refs=[];
    let delta1=null, delta2=null;
    if (stage!=='carn') {
      refs.push(reference('producer',producer,1));
      delta1=diff(old.x,producer.x);
    }
    if (stage!=='herb') {
      random.peerDraw=rng.uniform();
      const j=2+Math.floor(random.peerDraw*(rank-2));
      const peer=order[j-1];
      refs.push(reference('peer',peer,j));
      delta2=diff(old.x,peer.x);
    }
    // Fig. 6 interchanges the English labels on (7) and (8). Follow the
    //正文: use Eq. 7 for carnivory and Eq. 8 for a weighted pair of differences.
    let deltaMix=delta1||delta2;
    if (stage==='omni') {
      random.r2=rng.uniform();
      deltaMix=mix(random.r2,delta1,delta2);
    }
    return {stage,diet:stage,refs,random,delta1,delta2,deltaMix,raw:consumption(old.x,deltaMix,random.C)};
  }
  function proposeDecomposition(old,best,rank,rng) {
    const u=rng.normal(), D=3*u, r3=rng.uniform(), kDraw=rng.uniform();
    const k=1+Math.floor(2*kDraw), e=r3*k-1, h=2*r3-1;
    return {stage:'decomposition',refs:[reference('best',best,rank)],
      random:{u,D,r3,kDraw,k,e,h},raw:decomposition(old.x,best.x,D,e,h)};
  }
  const checkpoints=new WeakMap();
  const stride=128;
  function run(input) {
    const config=validate(input), rng=generator(config.seed), dim=functions[config.fn].dim;
    const samples=Array.from({length:config.n},()=>sampledPoint(rng,config,dim));
    const initial=samples.map((p,i)=>({id:i+1,x:p.x,f:objective(config.fn,p.x)}));
    let pop=initial.slice(), fe=config.n, t=0;
    const events=[], history=[], diets=[], cache=new Map();
    function emit(kind,details={}) {
      const event={t,kind,stage:kind,id:null,rank:null,part:0,refs:[],old:null,raw:null,next:null,
        oldF:null,newF:null,accepted:null,diet:null,random:{},repair:false,repairR:[],...details};
      events.push(event);
      if ((events.length-1)%stride===0) cache.set(events.length-1,pop.slice());
      return event;
    }
    function recordBest() {
      const best=bestOf(pop);
      history.push({t,best:best.f,x:best.x,id:best.id,fe,index:events.length-1});
    }
    function update(old,rank,proposal) {
      const repaired=bound(proposal.raw,config,rng);
      const newF=objective(config.fn,repaired.next), accepted=newF<old.f;
      const details={...proposal,...repaired,id:old.id,rank,old:old.x,oldF:old.f,newF,accepted};
      const parts=proposal.stage==='omni'?3:1;
      for (let part=1;part<=parts;part++) emit('proposal',{...details,part});
      fe+=1;
      const chosen=accepted ? {id:old.id,x:repaired.next,f:newF} : old;
      pop[rank-1]=chosen;
      emit('evaluate',{...details,part:parts,fe});
      return chosen;
    }
    emit('init',{samples,fe});
    recordBest();
    const rounds=config.demo?1:config.T;
    for (t=1;t<=rounds;t++) {
      const order=pop.slice().sort(byScore); pop=order.slice();
      const counts={herb:0,carn:0,omni:0}; diets[t]=counts;
      emit('sort',{order:order.map(p=>p.id),diets:counts});
      if (config.demo) {
        const rank=3;
        counts[config.demo]++;
        update(order[rank-1],rank,proposeConsumption(order,rank,order[0],config.demo,rng));
      } else {
        const producer=update(order[0],1,proposeProduction(order[0],order[config.n-1],t,config,rng));
        // Fig. 6 and Eqs. 6–8 include i=n. The individual with best rank
        // participates in consumption too. Freeze all peer coordinates at sort time;
        // producer references use the accepted production result in this round.
        for (let rank=2;rank<=config.n;rank++) {
          const consumer=proposeConsumption(order,rank,producer,'',rng);
          counts[consumer.stage]++;
          update(order[rank-1],rank,consumer);
        }
        const batch=pop.slice(), best=bestOf(batch), rankOfBest=batch.indexOf(best)+1;
        for (let i=0;i<batch.length;i++) {
          update(batch[i],i+1,proposeDecomposition(batch[i],best,rankOfBest,rng));
        }
      }
      recordBest();
    }
    t=rounds;
    emit('finish',{fe,diets:diets[t]});
    const result={events,initial,history,diets,config};
    checkpoints.set(result,cache);
    return result;
  }
  function stateAt(result,index) {
    if (!Number.isInteger(index)||index<0||index>=result.events.length) throw new RangeError('步驟索引超出本次執行範圍。');
    const cached=checkpoints.get(result);
    const start=cached ? index-index%stride : 0;
    let pop=(cached ? cached.get(start) : result.initial).slice();
    for(let i=start+1;i<=index;i++) {
      const e=result.events[i];
      if (e.kind==='sort') {
        const byId=new Map(pop.map(p=>[p.id,p]));
        pop=e.order.map(id=>byId.get(id));
      } else if (e.kind==='evaluate' && e.accepted) {
        pop[e.rank-1]={id:e.id,x:e.next,f:e.newF};
      }
    }
    return pop;
  }
  return {functions,defaults,validate,run,stateAt,objective,production,consumption,decomposition,factor,diff,mix,bound};
});
