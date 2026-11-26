/*
 * 依 Zhao, Wang & Zhang (2020) Table 1–3 可直接計算的 benchmark 函數。
 * 結構與公式獨立於 DOM，供共用 AEO 引擎與數學測試使用。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AEOBenchmarkFunctions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const penalty = (x, a, k, m) => x > a ? k * (x - a) ** m : x < -a ? k * (-x - a) ** m : 0;
  const hartmann = (x, A, P, alpha) => -alpha.reduce((sum, weight, i) =>
    sum + weight * Math.exp(-x.reduce((distance, value, j) => distance + A[i][j] * (value - P[i][j]) ** 2, 0)), 0);
  const hartmann3A = [[3,10,30],[.1,10,35],[3,10,30],[.1,10,35]];
  const hartmann3P = [[.3689,.117,.2673],[.4699,.4387,.747],[.1091,.8732,.5547],[.03815,.5743,.8828]];
  const hartmann6A = [[10,3,17,3.5,1.7,8],[.05,10,17,.1,8,14],[3,3.5,1.7,10,17,8],[17,8,.05,10,.1,14]];
  const hartmann6P = [[.1312,.1696,.5569,.0124,.8283,.5886],[.2329,.4135,.8307,.3736,.1004,.9991],[.2348,.1451,.3522,.2883,.3047,.665],[.4047,.8828,.8732,.5743,.1091,.0381]];
  const hartmannAlpha = [1,1.2,3,3.2];
  const shekelCenters = [[4,4,4,4],[1,1,1,1],[8,8,8,8],[6,6,6,6],[3,7,3,7],[2,9,2,9],[5,5,3,3],[8,1,8,1],[6,2,6,2],[7,3.6,7,3.6]];
  const shekelC = [.1,.2,.2,.4,.4,.6,.3,.7,.5,.5];
  const specs = {
    1: {name:'Sphere', formula:'Σ xᵢ²', L:-100, U:100, best:0, evaluate:x=>x.reduce((s,v)=>s+v*v,0)},
    2: {name:'Schwefel 2.22', formula:'Σ|xᵢ| + Π|xᵢ|', L:-10, U:10, best:0, evaluate:x=>x.reduce((s,v)=>s+Math.abs(v),0)+x.reduce((p,v)=>p*Math.abs(v),1)},
    3: {name:'Schwefel 1.2', formula:'Σᵢ(Σⱼ₌₁ⁱxⱼ)²', L:-100, U:100, best:0, evaluate:x=>{let c=0;return x.reduce((s,v)=>{c+=v;return s+c*c;},0);}},
    4: {name:'Schwefel 2.21', formula:'maxᵢ |xᵢ|', L:-100, U:100, best:0, evaluate:x=>Math.max(...x.map(Math.abs))},
    5: {name:'Rosenbrock', formula:'Σᵢ[100(xᵢ₊₁−xᵢ²)²+(xᵢ−1)²]', L:-30, U:30, best:0, evaluate:x=>x.slice(0,-1).reduce((s,v,i)=>s+100*(x[i+1]-v*v)**2+(v-1)**2,0)},
    6: {name:'Step', formula:'Σ(xᵢ+0.5)²', L:-100, U:100, best:0, evaluate:x=>x.reduce((s,v)=>s+(v+.5)**2,0)},
    8: {name:'Schwefel', formula:'−Σ xᵢ sin(√|xᵢ|)', L:-500, U:500, best:-12569.5, evaluate:x=>-x.reduce((s,v)=>s+v*Math.sin(Math.sqrt(Math.abs(v))),0)},
    9: {name:'Rastrigin 平方項', formula:'Σ[xᵢ²−10cos(2πxᵢ)+10]²', L:-5.12, U:5.12, best:0, evaluate:x=>x.reduce((s,v)=>s+(v*v-10*Math.cos(2*Math.PI*v)+10)**2,0)},
    10: {name:'Ackley', formula:'−20e^(−0.2√(Σxᵢ²/n))−e^(Σcos(2πxᵢ)/n)+20+e', L:-32, U:32, best:0, evaluate:x=>{const n=x.length;return -20*Math.exp(-.2*Math.sqrt(x.reduce((s,v)=>s+v*v,0)/n))-Math.exp(x.reduce((s,v)=>s+Math.cos(2*Math.PI*v),0)/n)+20+Math.E;}},
    11: {name:'Griewank（平移 100）', formula:'1+Σ(xᵢ−100)²/4000−Πcos((xᵢ−100)/√i)', L:-600, U:600, best:0, evaluate:x=>1+x.reduce((s,v)=>s+(v-100)**2/4000,0)-x.reduce((p,v,i)=>p*Math.cos((v-100)/Math.sqrt(i+1)),1)},
    12: {name:'Penalized 1', formula:'論文式（含 yᵢ 與 u(xᵢ;10,100,4)）', L:-50, U:50, best:0, evaluate:x=>{const n=x.length,y=x.map(v=>1+(v+1)/4);let s=10*Math.sin(Math.PI*y[0])**2;for(let i=0;i<n-1;i++)s+=(y[i]-1)**2*(1+10*Math.sin(Math.PI*y[i+1])**2);s+=(y[n-1]-1)**2;return Math.PI/n*s+x.reduce((a,v)=>a+penalty(v,10,100,4),0);}},
    13: {name:'Penalized 2', formula:'論文式（含 u(xᵢ;5,10,4)）', L:-50, U:50, best:0, evaluate:x=>{const n=x.length;let s=Math.sin(3*Math.PI*x[0])**2;for(let i=0;i<n-1;i++)s+=(x[i]-1)**2*(1+Math.sin(3*Math.PI*x[i+1])**2);s+=(x[n-1]-1)**2*(1+Math.sin(2*Math.PI*x[n-1])**2);return .1*s+x.reduce((a,v)=>a+penalty(v,5,10,4),0);}},
    14: {name:'Foxholes', formula:'[1/500 + Σⱼ₌₁²⁵ 1/(j + Σₖ₌₁²(xₖ−aₖⱼ)⁶)]⁻¹', L:-65.536, U:65.536, dim:2, best:.998, evaluate:x=>{let sum=1/500;for(let row=0;row<5;row++)for(let col=0;col<5;col++){const j=row*5+col+1,a1=-32+16*col,a2=-32+16*row;sum+=1/(j+(x[0]-a1)**6+(x[1]-a2)**6);}return 1/sum;}},
    15: {name:'Kowalik', formula:'Σᵢ₌₁¹¹[aᵢ−x₁(bᵢ²+bᵢx₂)/(bᵢ²+bᵢx₃+x₄)]²', L:-5, U:5, dim:4, best:3.0759e-4, evaluate:x=>{const a=[.1957,.1947,.1735,.16,.0844,.0627,.0456,.0342,.0323,.0235,.0246];const b=[4,2,1,.5,.25,1/6,.125,.1,1/12,1/14,1/16];return a.reduce((s,v,i)=>{const q=b[i];return s+(v-x[0]*(q*q+q*x[1])/(q*q+q*x[2]+x[3]))**2;},0);}},
    16: {name:'Six-Hump Camel', formula:'4x₁²−2.1x₁⁴+x₁⁶/3+x₁x₂−4x₂²+4x₂⁴', L:-5, U:5, dim:2, best:-1.031628, evaluate:x=>{const [a,b]=x;return 4*a*a-2.1*a**4+a**6/3+a*b-4*b*b+4*b**4;}},
    19: {name:'Hartmann 3', formula:'−Σᵢ₌₁⁴ αᵢ exp(−Σⱼ₌₁³ Aᵢⱼ(xⱼ−Pᵢⱼ)²)', L:0, U:1, dim:3, best:-3.86, evaluate:x=>hartmann(x,hartmann3A,hartmann3P,hartmannAlpha)},
    20: {name:'Hartmann 6', formula:'−Σᵢ₌₁⁴ αᵢ exp(−Σⱼ₌₁⁶ Aᵢⱼ(xⱼ−Pᵢⱼ)²)', L:0, U:1, dim:6, best:-3.322, evaluate:x=>hartmann(x,hartmann6A,hartmann6P,hartmannAlpha)},
    21: {name:'Shekel 5', formula:'−Σᵢ₌₁⁵ 1/(Σⱼ₌₁⁴(xⱼ−aᵢⱼ)²+cᵢ)', L:0, U:10, dim:4, best:-10.1532, evaluate:x=>-shekelCenters.slice(0,5).reduce((sum,a,i)=>sum+1/(x.reduce((d,v,j)=>d+(v-a[j])**2,0)+shekelC[i]),0)},
    22: {name:'Shekel 7', formula:'−Σᵢ₌₁⁷ 1/(Σⱼ₌₁⁴(xⱼ−aᵢⱼ)²+cᵢ)', L:0, U:10, dim:4, best:-10.4028, evaluate:x=>-shekelCenters.slice(0,7).reduce((sum,a,i)=>sum+1/(x.reduce((d,v,j)=>d+(v-a[j])**2,0)+shekelC[i]),0)},
    23: {name:'Shekel 10', formula:'−Σᵢ₌₁¹⁰ 1/(Σⱼ₌₁⁴(xⱼ−aᵢⱼ)²+cᵢ)', L:0, U:10, dim:4, best:-10.5364, evaluate:x=>-shekelCenters.reduce((sum,a,i)=>sum+1/(x.reduce((d,v,j)=>d+(v-a[j])**2,0)+shekelC[i]),0)}
  };
  for (const id of [1,2,3,4,5,6,8,9,10,11,12,13]) specs[id].dim = 30;
  return {specs, penalty};
});
