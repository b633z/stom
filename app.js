
window.addEventListener('error', function(e){
  if(e && e.error) console.error('[GAME ERROR]', e.error);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('[GAME PROMISE ERROR]', e.reason);
});

import * as D from './data.js';

// 기본 유틸 및 상태 변수 설정
const $id = id => document.getElementById(id);
const setTxt = (id, t) => { let e=$id(id); if(e) e.innerText=t; };
const setHTML = (id, h) => { let e=$id(id); if(e) e.innerHTML=h; };
const setClass = (id, c) => { let e=$id(id); if(e) e.className=c; };
const setDisplay = (id, d) => { let e=$id(id); if(e) e.style.display=d; };

function format(v){if(isNaN(v)||!isFinite(v))return"0";return Math.round(v).toLocaleString('ko-KR');}
function formatPrice(v){if(isNaN(v)||!isFinite(v))return"0";if(Math.abs(v)<100)return Number(v).toFixed(2);return Math.round(v).toLocaleString("ko-KR");}
function formatCap(v){if(isNaN(v)||!isFinite(v))return"0";if(v>=1e16)return(v/1e16).toFixed(2)+"경";if(v>=1e12)return(v/1e12).toFixed(2)+"조";if(v>=1e8)return Math.floor(v/1e8)+"억";return format(v);}
function formatK(v){let abs=Math.abs(v);if(abs>=1e12)return(v/1e12).toFixed(2)+"조";if(abs>=1e8)return(v/1e8).toFixed(1)+"억";if(abs>=1e4)return(v/1e4).toFixed(0)+"만";return v;}
window.showToast = function(m,t="black"){let b=document.createElement('div');b.className='toast'+(t==="event"?' event':'');if(t==="red")b.style.background="rgba(211,47,47,0.95)";if(t==="blue")b.style.background="rgba(25,118,210,0.95)";b.innerText=m;$id('toast-container').appendChild(b);setTimeout(()=>b.remove(),3000);};

let stocks=[], realEstates=[], vipAssets=[], rivalFunds=[], acquiredFunds=[], indirectFunds=[], optPositions=[];
let companyHistory=[], monthlyNewsList=[], myEmployees=[], transferMarket=[], globalLeaders=[], blackOpsList=[];
let hofYearlyData=[], myClubs=[], marketBonds=[], mediaList=[], myMedias=[];
  
let gameInterval=null, currentSpeed=1000, speedTimeout=null;
let cash=100000000000, depPrin=0, loanPrin=0, corpBond=0, corpBondDueDate=null, maxLoan=1e10, playerName="투자자";
let hofPoints=0, secRisk=0, selectedId=null, currentMarket="KOSPI", currentTimeframe=90, lastMonth=1;
let selectedFundId=null, selectedReCountry="한국", idCounter=1, currentHRTab='corp', currentHiredFilter='all', hrPage=1, myIpoLevel=0, obExpanded=false, isMobileView=false;
let currentPortFilter='all', optTimeframeVal=90;
let currentDate = new Date(2025, 0, 1);
let gChart=null, oChart=null;
// 글로벌 경기순환(게임용): 회복 → 호황 → 둔화 → 침체 → 회복을 반복하며 모든 자산에 연동
let macroCycle = { day:0, length:360, phase:0, regime:'회복', lastShockDay:-999 };
const MACRO_CYCLE_NAMES = ['회복','호황','둔화','침체'];
function getMacroCycle(){
  const x=(macroCycle.day % macroCycle.length)/macroCycle.length;
  const angle=2*Math.PI*x + macroCycle.phase;
  const wave=Math.sin(angle);
  let idx=Math.floor(((x + 0.125) % 1) * 4);
  macroCycle.regime=MACRO_CYCLE_NAMES[idx];
  return {wave, regime:macroCycle.regime};
}
let concertArtistsList = [], personPool = [];

// 기본 데이터 세팅
let hrDepts = { trading:{name:"트레이딩 본부",count:0,salary:5e8,desc:"수익",agencies:["BlackRock"],effDesc:"매월 현금 생성"}, research:{name:"리서치 센터",count:0,salary:3e8,desc:"호재",agencies:["WPP"],effDesc:"주식 급등 이벤트"}, lobby:{name:"로비실",count:0,salary:8e8,desc:"SEC 방어",agencies:["김앤장"],effDesc:"매월 SEC지수 차감"} };
let macroIndices = { kospi:{val:2600,prev:2600,name:"KOSPI"}, kosdaq:{val:850,prev:850,name:"KOSDAQ"}, nasdaq:{val:18000,prev:18000,name:"NASDAQ"}, snp500:{val:5500,prev:5500,name:"S&P500"}, usdkrw:{val:1350,prev:1350,name:"USD/KRW"}, gold:{val:2500,prev:2500,name:"Gold"}, wti:{val:80,prev:80,name:"WTI원유"}, bond10:{val:4.10,prev:4.10,name:"미10년국채"}, bond30:{val:4.35,prev:4.35,name:"미30년국채"}, reIndex:{val:1000,prev:1000,name:"부동산지수"} };

window.addCompanyHistory = function(title,desc){let y=currentDate.getFullYear();let q=Math.ceil((currentDate.getMonth()+1)/3);companyHistory.unshift({year:y,date:`${y}년 ${q}분기`,title,desc});};

// ======================= 시스템 & 시작 설정 =======================
window.initGameSystem = function() {
    stocks = []; idCounter = 1; macroCycle={day:0,length:360,phase:Math.random()*Math.PI*2,regime:'회복',lastShockDay:-999};
    let sLists = [ {m:"KOSPI", str:D.rawKospi, p:80000}, {m:"KOSDAQ", str:D.rawKosdaq, p:65000}, {m:"NASDAQ", str:D.rawNasdaq, p:250000}, {m:"SNP500", str:D.rawSnp, p:180000}, {m:"CRYPTO", str:D.rawCrypto, p:150000} ];
    sLists.forEach(l => {
        l.str.split(',').forEach(n => {
            let tag="일반"; if(l.m==='CRYPTO')tag="가상화폐"; else if(/(반도체|Nvidia|AMD|Intel|ASML|삼성전자|SK하이닉스|TSMC)/.test(n))tag="반도체"; else if(/(Apple|Microsoft|Amazon|Alphabet|Meta|Tesla|Netflix)/.test(n))tag="빅테크"; else if(/(바이오|셀트리온|HLB|알테오젠|Eli Lilly)/.test(n))tag="바이오";
            let p=Math.floor(l.p*(0.6+Math.random()*1.5)); let isIssued=20000000;
            if(n.includes('비트코인')){p=95000000; isIssued=19000000;} else if(n.includes('이더리움')){p=4200000; isIssued=120000000;} 
            if(D.realStockData[n]){p=D.realStockData[n].p; isIssued=D.realStockData[n].v;}
            stocks.push({id:'s'+(idCounter++), name:n, market:l.m, tag:tag, price:Math.max(10,p), beta:l.m==='CRYPTO'?4.0:1.0, issued:isIssued, isEquity:true, shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]});
        });
    });
    ["미국","한국","일본","중국"].forEach(c => { [10,30].forEach(t => stocks.push({id:'s'+(idCounter++), name:`${c} 국채 ${t}년물`, market:'BOND', tag:'안전자산', price:10000, beta:-0.5, issued:50000000, isEquity:false, shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]})); });
    [{t:"삼성전자",m:"KOSPI"},{t:"SK하이닉스",m:"KOSPI"}].forEach(o=>{[2,3,5,10].forEach(m=>stocks.push({id:'s'+(idCounter++), name:`${o.t} ${m}X 레버리지`, market:o.m, tag:"레버리지", price:10000, beta:m, issued:5000000, isEquity:true, underlying:o.t, shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]})); });
    [{n:"KOSDAQ",m:"KOSDAQ"},{n:"NASDAQ",m:"NASDAQ"},{n:"비트코인(BTC)",m:"CRYPTO"},{n:"미국 국채 10년물",m:"BOND"}].forEach(o=>{[2,3,10].forEach(m=>stocks.push({id:'s'+(idCounter++), name:`${o.n} ${m}X 레버리지`, market:o.m, tag:"레버리지", price:10000, beta:m, issued:5000000, isEquity:true, underlying:o.n, shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]})); });
    stocks.push({id:'s'+(idCounter++), name:"TQQQ (나스닥 3X)", market:"NASDAQ", tag:"레버리지", price:10000, beta:3.0, issued:10000000, isEquity:true, underlying:"NASDAQ", shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]});
    stocks.push({id:'s'+(idCounter++), name:"SQQQ (나스닥 인버스 3X)", market:"NASDAQ", tag:"인버스", price:10000, beta:-3.0, issued:10000000, isEquity:true, underlying:"NASDAQ", shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]});
    stocks.push({id:'s'+(idCounter++), name:"SOXL (반도체 3X)", market:"NASDAQ", tag:"레버리지", price:10000, beta:3.0, issued:10000000, isEquity:true, underlying:"Nvidia", shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]}); 
    stocks.push({id:'s'+(idCounter++), name:"SOXS (반도체 인버스 3X)", market:"NASDAQ", tag:"인버스", price:10000, beta:-3.0, issued:10000000, isEquity:true, underlying:"Nvidia", shares:0, cost:0, shortShares:0, shortCost:0, history:[], ma20_history:[]});
    stocks.forEach(s => {
        s.initialPrice=s.price; s.per=(10+Math.random()*20).toFixed(1); s.eps=Math.floor(s.price/s.per); let simP=s.initialPrice; let vol=s.market==='CRYPTO'?4.0:(s.market==='BOND'?0.3:1.0); for(let i=0;i<365;i++){ simP=Math.max(10,Math.round(simP*(1+(Math.random()-0.495)*0.015*vol))); s.history.push(simP); s.ma20_history.push(simP); } s.price=simP;
    });

    realEstates=[]; let rid=1; 
    D.reCountriesList.forEach(c => {
        if(D.reN[c]){
            let names = D.reN[c]; const types = ["아파트", "고급빌라", "상업용빌딩", "핵심토지", "호텔지분", "오피스텔", "복합쇼핑몰", "물류센터", "도심재개발", "펜트하우스"];
            for(let i=0; i<10; i++) { let bp = (i+1) * 3500000000; realEstates.push({ id: `re_${rid++}`, country: c, name: names[i], type: types[i], price: bp, cost: 0, rent: Math.floor(bp * 0.0035), owned: 0 }); }
        }
    });

    vipAssets = []; const vipA=["18세기","중세","전설적인","황실","고대","미지의","르네상스","비잔틴","오스만","청나라","마리 앙투아네트의","나폴레옹의","빅토리아 여왕의","파라오의","신성 로마 제국"];
    const vipN=["블루 다이아몬드","루비 목걸이","황금 마차","순백 백자","마스터피스 회화","대리석 조각","비밀 고서","스트라디바리우스 첼로","운석 파편","에메랄드 브로치","제국 왕관","성배","전설의 명검"];
    const cats=["미술품","한국미술","조각","고서","음악IP","건축물","국내건축","디지털/기념품","클래식카","보석시계"];
    for(let i=0; i<500; i++) { let isM = Math.random() > 0.8; let p = isM ? 4000000000 : (i+1)*5000000; let n = isM ? `[평가불능] ${vipA[Math.floor(Math.random()*vipA.length)]} ${vipN[Math.floor(Math.random()*vipN.length)]}` : `[경매품] ${vipA[Math.floor(Math.random()*vipA.length)]} ${vipN[Math.floor(Math.random()*vipN.length)]}`; vipAssets.push({ id: 'vip_'+(i+1), name: n, category: cats[i%10], usdPrice: p, owned: 0 }); }

    indirectFunds=[]; for(let i=0;i<10;i++){indirectFunds.push({id:'i'+(i+1),name:`월가 인덱스#${i+1}`,type:"복합",invested:0});}
    rivalFunds=D.hFunds.map((f,i)=>({id:'hf'+(i+1),name:f.name,type:f.type,assets:Math.floor((20-i)*1e11 + Math.random()*1e11),issued:1000000,myShares:0}));
    
    globalLeaders=[]; D.gLeadStr.split('/').forEach(x=>{ let p=x.split('|'); globalLeaders.push({id:p[0],country:p[1],name:p[2],rep:0,state:['us','sa','in'].includes(p[0])?'호황':(['cn','ru'].includes(p[0])?'위기':'보통'),invest:{cost:0,current:0}}); });
    blackOpsList=[]; D.boStr.split('/').forEach((x,i)=>{ let p=x.split('|'); blackOpsList.push({id:'op'+(i+1),title:p[0],cost:parseFloat(p[1])*1000000000,desc:p[2],tag:p[3],tagRate:parseFloat(p[4]),eff:{}}); });
    mediaList=[]; D.mediaStr.split('/').forEach(x=>{ let p=x.split('|'); mediaList.push({id:p[0],n:p[1],p:parseFloat(p[2]),r:parseFloat(p[3])}); });
    concertArtistsList=[]; D.cArtStr.split('/').forEach(x=>{ let p=x.split('|'); concertArtistsList.push({g:p[0],n:p[1],b:parseFloat(p[2]),m:parseFloat(p[3])}); });
    personPool=[]; D.ppStr.split('/').forEach(x=>{ let p=x.split('|'); personPool.push({n:p[0], d:p[1], i:p[2]}); });

    transferMarket=[]; const fNs=["제임스","존","로버트","마이클","윌리엄","데이비드","리차드","조셉","토마스","찰스"]; const lNs=["스미스","존슨","윌리엄스","브라운","존스","밀러","데이비스","가르시아"]; const nts=["미국","한국","영국","일본","중국","독일","프랑스","싱가포르"]; const sps=["CEO","투자총괄","수석애널리스트","M&A전문가","퀀트 트레이더"];
    while(transferMarket.length < 300) { let rS=Math.random(); let st=rS>0.95?"S급":(rS>0.75?"A급":(rS>0.4?"B급":"C급")); let cst=st==="S급"?(5e8+Math.random()*5e8):(st==="A급"?(1e8+Math.random()*4e8):(st==="B급"?5e7+Math.random()*5e7:1e7)); let nm=lNs[Math.floor(Math.random()*lNs.length)]+" "+fNs[Math.floor(Math.random()*fNs.length)]; transferMarket.push({id:'hr_r_'+Date.now()+Math.random(),name:nm,comp:"FA(자유계약)",nation:nts[Math.floor(Math.random()*nts.length)],spec:sps[Math.floor(Math.random()*sps.length)],cost:cst,stat:st}); }

    optPositions=[]; hofPoints=0; secRisk=0; companyHistory=[]; monthlyNewsList=[]; myEmployees=[]; acquiredFunds=[]; myIpoLevel=0; myClubs=[]; myMedias=[];
    marketBonds = []; D.bondGrades.forEach(gr => { for(let i=0; i<3; i++) { marketBonds.push({id:'bd_'+Date.now()+Math.random(), name:`${gr.g}급 신규채권`, grade:gr.g, y:gr.y, r:gr.r, face:100000000, price:100000000, owned:0, default:false}); } });
    corpBondDueDate = null;
    
    for(let k in macroIndices) macroIndices[k].history=Array(365).fill(macroIndices[k].val);
    window.addCompanyHistory("펀드 설립", "자본시장에 출범했습니다.");

    let sel=$id('concert-artist'); if(sel){ sel.innerHTML=""; let groups=[...new Set(concertArtistsList.map(a=>a.g))]; groups.forEach(g=>{ let og=document.createElement('optgroup'); og.label=g; concertArtistsList.forEach((a,i)=>{if(a.g===g){let o=document.createElement('option');o.value=i;o.innerText=a.n;og.appendChild(o);}}); sel.appendChild(og); }); }
    selectedId = stocks[0].id;
  };

  function ensureOptChart(){
    if(typeof Chart==='undefined') return;
    const c=$id('optChart');
    if(!c) return;
    if(!oChart){
      oChart=new Chart(c.getContext('2d'),{type:'line',data:{labels:[],datasets:[
        {label:'가격',data:[],borderColor:'#00838f',borderWidth:2,pointRadius:0,tension:0.1},
        {label:'평균가',data:[],borderColor:'#1976d2',borderWidth:1.5,borderDash:[5,5],pointRadius:0,fill:false,tension:0},
        {label:'청산가',data:[],borderColor:'#d32f2f',borderWidth:1.5,borderDash:[2,2],pointRadius:0,fill:false,tension:0}
      ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:false,scales:{x:{display:false},y:{display:true,position:'right',ticks:{callback:function(v){return formatPrice(v);}}}}}});
    }
    try{oChart.resize();}catch(e){}
  }

  window.startGame = function() {
      cash = 100000000000;
      let ni = $id('player-name-input'); playerName = (ni && ni.value.trim() !== "") ? ni.value.trim() : "글로벌 마스터";
      setTxt('player-name-display', playerName); 
      let sm = $id('start-modal'); if(sm) sm.style.display = 'none'; 
      let mw = $id('main-wrapper'); if(mw) mw.style.filter = 'none';
      if(typeof Chart!=='undefined'&&!gChart){let c=$id('mainChart');if(c){gChart=new Chart(c.getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'주가',data:[],borderColor:'#d32f2f',backgroundColor:'rgba(211,47,47,0.1)',borderWidth:2,fill:true,pointRadius:0,tension:0.1},{label:'MA20',data:[],borderColor:'#f57c00',borderWidth:1.5,borderDash:[5,5],pointRadius:0,fill:false,tension:0.2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:false,scales:{x:{display:false},y:{display:true,position:'right',ticks:{callback:function(v){return formatPrice(v);}}}}}});}}
      if(typeof Chart!=='undefined'&&!oChart){let c=$id('optChart');if(c){oChart=new Chart(c.getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'가격',data:[],borderColor:'#00838f',borderWidth:2,pointRadius:0,tension:0.1},{label:'평균가',data:[],borderColor:'#1976d2',borderWidth:1.5,borderDash:[5,5],pointRadius:0,fill:false,tension:0},{label:'청산가',data:[],borderColor:'#d32f2f',borderWidth:1.5,borderDash:[2,2],pointRadius:0,fill:false,tension:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:false,scales:{x:{display:false},y:{display:true,position:'right',ticks:{callback:function(v){return formatPrice(v);}}}}}});}}
      window.initGameSystem(); window.setMarket('KOSPI'); window.updateUI(); 
      if(gameInterval) clearInterval(gameInterval); gameInterval = setInterval(window.gameLoop, currentSpeed);
  };

  // ======================= 핵심 로직 =======================
  window.getPlayerNetAssets = function() {
    let stockVal=0, shortVal=0, vipVal=0, reVal=0, indirectVal=0, optNetVal=0, countryVal=0, mediaVal=0;
    if(stocks) stockVal=stocks.reduce((s, x)=>s+(x.shares*x.price),0);
    if(stocks) shortVal=stocks.reduce((s, x)=>x.shortShares>0?s+x.shortCost+(x.shortCost-(x.shortShares*x.price)):s,0);
    if(vipAssets) vipVal=vipAssets.reduce((s, v)=>s+(v.owned*v.usdPrice*macroIndices.usdkrw.val),0);
    if(realEstates) reVal=realEstates.reduce((s, r)=>s+(r.owned*r.price),0);
    if(indirectFunds) indirectVal=indirectFunds.reduce((s, f)=>s+f.invested,0);
    if(mediaList) mediaVal=mediaList.reduce((s, m)=>s+(myMedias.includes(m.id)?m.p:0),0);
    if(optPositions) optPositions.forEach(p=>{ let c=(macroIndices[p.asset]?macroIndices[p.asset].val:(stocks.find(x=>x.name===p.asset)?stocks.find(x=>x.name===p.asset).price:p.entryPrice)); let m=macroIndices[p.asset]?50000:1; optNetVal+=(c-p.entryPrice)*m*p.qty*(p.type==='long'||p.type==='call'?1:-1)+(p.isFut?p.margin:p.prem); });
    if(globalLeaders) countryVal=globalLeaders.reduce((s, l)=>s+(l.invest?l.invest.current:0),0);
    let net = cash + depPrin - loanPrin - corpBond + stockVal + shortVal + vipVal + indirectVal + optNetVal + countryVal + reVal + mediaVal;
    return Math.min(net, 90000000000000000); 
  };
  window.getReputation = function() { let net = window.getPlayerNetAssets(); let eC = myEmployees.length; for(let k in hrDepts) eC += hrDepts[k].count * 10; let cS = eC < 10 ? "스타트업" : (eC < 30 ? "중소기업" : (eC < 50 ? "중견기업" : (eC < 100 ? "대기업" : "글로벌기업"))); let lvl = 1; let txt = `🌱 ${cS} 투자자`; if(net >= 1e11) { lvl = 4; txt = `🌍 메이저 ${cS}`; } if(net >= 1e12) { lvl = 5; txt = `👑 월가 지배자 (${cS})`; } return { text: txt, compSize: cS, empCount: eC }; };

  // UI 업데이트 통합본 (먹통 요인 완전제거)
  window.updateUI = function() {
    let s = stocks.find(x => x.id === selectedId) || stocks[0]; if(!s) return;
    let net = window.getPlayerNetAssets(); maxLoan = net * 0.6; 
    setTxt('cash', formatCap(cash) + " 원"); setTxt('total-debt', formatCap(loanPrin) + (corpBond>0 ? " (+회사채 " + formatCap(corpBond) + ")" : "")); 
    setTxt('my-corp-bond', formatCap(corpBond) + " 원"); setTxt('net-assets', formatCap(net) + " 원"); setTxt('bank-deposit', formatCap(depPrin) + " 원"); setTxt('stock-val', formatCap(stocks.reduce((a,b)=>a+b.shares*b.price,0)) + " 원"); setTxt('hof-points', hofPoints + " 점"); setTxt('sec-risk-val', secRisk + "%");
    let depRate = Math.max(0.5, macroIndices.bond10.val - 0.5); let lRate = macroIndices.bond10.val + 2.0; if(loanPrin > net * 0.6) lRate = 15.0; let mRate = macroIndices.bond10.val + 8.0; let bondVal = Math.floor(corpBond * (12.0 / mRate));
    setTxt('bank-dep-rate', depRate.toFixed(2)); setTxt('bank-loan-rate', lRate.toFixed(2)); setTxt('my-corp-bond-market', formatCap(bondVal));
    let r = window.getReputation(); setTxt('rep-badge', r.text);
    let elRank = $id('player-rank-info'); if(elRank) { let rn=[...rivalFunds,{name:playerName,assets:net}].sort((a,b)=>b.assets-a.assets).findIndex(f=>f.name===playerName)+1; elRank.innerText=`국가:한국 | 규모:${r.compSize} | 직원:${r.empCount}명 | 순위:${rn}위`; }
    let dueTxt = $id('my-corp-bond-due'); if(dueTxt) { if(corpBond>0 && corpBondDueDate) { let dDiff = Math.ceil((corpBondDueDate.getTime() - currentDate.getTime())/(1000*60*60*24)); dueTxt.innerText = "(만기: " + (dDiff>=0?"D-"+dDiff:"D+"+Math.abs(dDiff)) + ")"; } else { dueTxt.innerText = ""; } }

    let lEl = $id('stock-list'); if(lEl) { lEl.innerHTML = ""; stocks.filter(x => x.market === currentMarket).forEach(st => { let d = ((st.price - (st.history[st.history.length-2]||st.price))/(st.history[st.history.length-2]||st.price))*100; let div = document.createElement('div'); div.className = `stock-item ${st.id === selectedId ? 'active' : ''}`; div.onclick = () => { selectedId = st.id; window.updateUI(); }; div.innerHTML = `<div><b>${st.name}</b><span class="stock-tag">${st.tag}</span></div><div style="text-align:right;"><b>${format(st.price)}원</b><div style="font-size:0.75em;" class="${d>=0?'text-up':'text-down'}">${d>=0?'▲':'▼'}${Math.abs(d).toFixed(2)}%</div></div>`; lEl.appendChild(div); }); }

    let isUp = s.price >= (s.history[s.history.length-2]||s.price); setTxt('chart-title', s.name); setTxt('chart-price', format(s.price) + " 원"); setClass('chart-price', `selected-price ${isUp ? 'text-up' : 'text-down'}`); setTxt('chart-desc', `시총: ${s.isEquity?formatCap(s.price*s.issued):'-'} | 발행: ${s.isEquity?formatCap(s.issued):'-'}`); setTxt('chart-finance', `PER: ${s.per||'-'}배 | EPS: ${s.eps?format(s.eps):'-'}원`);
    let myO = ((s.shares / s.issued) * 100); if(!s.isEquity||s.tag==='인버스') myO=0; setTxt('my-ownership', Math.min(100, myO).toFixed(2) + "%"); setDisplay('ceo-btn', (myO>=50&&!s.underlying&&s.isEquity)?'inline-block':'none');
    let avg=s.shares>0?s.cost/s.shares:0; let ev=s.shares>0?(s.price*s.shares)-s.cost:0; setTxt('my-shares',format(s.shares)+" 주"); setTxt('avg-price',format(avg)+" 원"); setTxt('eval-profit',format(ev)+" 원"); setClass('eval-profit',ev>=0?'text-up':'text-down');
    let sAvg=s.shortShares>0?s.shortCost/s.shortShares:0; let sEv=s.shortShares>0?s.shortCost-(s.shortShares*s.price):0; setTxt('short-shares',format(s.shortShares)+" 주"); setTxt('short-avg-price',format(sAvg)+" 원"); setTxt('short-eval-profit',format(sEv)+" 원"); setClass('short-eval-profit',sEv>=0?'text-up':'text-down');

    let obTick = s.price > 100000 ? 500 : (s.price > 10000 ? 100 : (s.price > 1000 ? 10 : 1)); let aH="", bH=""; let lvls = obExpanded ? 10 : 5;
    for(let i=lvls; i>=1; i--) { let p=s.price+(obTick*i); let v=Math.floor(Math.random()*10000)+100; aH+=`<div style="background:#e3f2fd;color:#1976d2;padding:3px 6px;border-radius:4px;cursor:pointer;font-size:0.85em;display:flex;justify-content:space-between;margin-bottom:2px;" onclick="window.quickTrade('buy', ${p})"><span>${format(p)}</span> <b>${format(v)}</b></div>`; }
    for(let i=1; i<=lvls; i++) { let p=Math.max(1,s.price-(obTick*i)); let v=Math.floor(Math.random()*10000)+100; bH+=`<div style="background:#ffebee;color:#d32f2f;padding:3px 6px;border-radius:4px;cursor:pointer;font-size:0.85em;display:flex;justify-content:space-between;margin-bottom:2px;" onclick="window.quickTrade('sell', ${p})"><span>${format(p)}</span> <b>${format(v)}</b></div>`; }
    if($id('mid-ask-book')) $id('mid-ask-book').innerHTML=aH; if($id('mid-bid-book')) $id('mid-bid-book').innerHTML=bH;

    if(gChart) { let sl=s.history.slice(-currentTimeframe); gChart.data.labels=Array(sl.length).fill(""); gChart.data.datasets[0].data=sl; gChart.data.datasets[0].borderColor=isUp?'#d32f2f':'#1976d2'; gChart.data.datasets[0].backgroundColor=isUp?'rgba(211,47,47,0.1)':'rgba(25,118,210,0.1)'; gChart.data.datasets[1].data=s.ma20_history.slice(-currentTimeframe); gChart.update(); }
    if($id('tab-deriv').style.display==='flex') window.updateOptPrice(); if($id('tab-ipo').style.display==='flex') window.renderIpoTab();
  };

  // UI 제어 함수들 (HTML에서 바로 호출될 수 있도록 모두 window에 바인딩)
  window.toggleViewMode = function() { isMobileView = !isMobileView; let wr = $id('main-wrapper'); let mg = document.querySelector('.main-grid'); let btn = $id('btn-view-mode'); if(isMobileView) { wr.style.maxWidth = '500px'; mg.style.gridTemplateColumns = '1fr'; mg.style.height = 'auto'; btn.innerText = '💻 PC 뷰'; } else { wr.style.maxWidth = '1540px'; mg.style.gridTemplateColumns = '320px 1fr 490px'; mg.style.height = '750px'; btn.innerText = '📱 모바일 뷰'; } if(gChart) gChart.resize(); if(oChart) oChart.resize(); };
  window.changeSpeed = function() { let val = parseInt($id('speed-selector').value); if(val !== 1000 && cash < 100000000000) { alert("비용 1,000억 부족."); $id('speed-selector').value = currentSpeed; return; } if(val !== 1000) cash -= 100000000000; currentSpeed = val; if(gameInterval) clearInterval(gameInterval); gameInterval = setInterval(window.gameLoop, currentSpeed); showToast("⏳ 시간 조작 완료", "blue"); window.updateUI(); if(speedTimeout) clearTimeout(speedTimeout); speedTimeout = setTimeout(() => { currentSpeed = 1000; if(gameInterval) clearInterval(gameInterval); gameInterval = setInterval(window.gameLoop, currentSpeed); $id('speed-selector').value = "1000"; showToast("⏰ 조작 종료.", "black"); }, 300000); };
  window.donateToSociety = function() { if(cash<1e10)return alert("100억 필요"); cash-=1e10; secRisk=Math.max(0,secRisk-15); hofPoints+=100; showToast("🤝 기부 완료", "blue"); window.updateUI(); };
  window.openHoFModal = function() { let t=Math.max(0,10000-hofPoints); let lS=hofPoints>=10000?`<span style="color:#d32f2f;font-weight:bold;">🏆 레전드 헌액자 달성!</span>`:`<span style="color:#888;">레전드까지 ${t}점 남음</span>`; let iB=$id('hof-inductees-list'); if(hofPoints>=10000&&!iB.innerHTML.includes(playerName)){iB.innerHTML+=`<li>👑 ${playerName} (레전드)</li>`;} if(iB.innerHTML==="")iB.innerHTML="<li>아직 헌액자가 없습니다.</li>"; setHTML('hof-yearly-records',`명예 포인트: <b style="color:#f57f17;">${hofPoints}점</b><br>등급: <b>${window.getReputation().text}</b><br>${lS}`); let aB=$id('hof-yearly-accordion'); if(aB){aB.innerHTML=""; let ys=[...new Set(hofYearlyData.map(h=>h.year))].sort((a,b)=>b-a); ys.forEach(y=>{let hL=hofYearlyData.filter(d=>d.year===y); let yI='hof_y_'+y; let ht=`<h4 style="background:#f5f7fa;padding:8px;border:1px solid #ccc;cursor:pointer;" onclick="let d=document.getElementById('${yI}');d.style.display=d.style.display==='none'?'block':'none';">📁 ${y}년 랭킹</h4><div id="${yI}" style="display:none;padding-left:15px;">`; hL.forEach(d=>{if(d.first)ht+=`<div>🥇 1위: ${d.first.name} (${formatCap(d.first.assets)})</div>`;if(d.second)ht+=`<div>🥈 2위: ${d.second.name} (${formatCap(d.second.assets)})</div>`;if(d.third)ht+=`<div>🥉 3위: ${d.third.name} (${formatCap(d.third.assets)})</div>`;}); ht+=`</div>`; aB.innerHTML+=ht;});} setDisplay('hof-history-modal','flex'); };
  window.handleSEC = function(c) { if(c==='fine'){cash-=Math.floor(cash*0.30);showToast(`💰 벌금 납부.`,"black");}else if(c==='lawyer'){if(cash<1e11)return alert("1,000억 필요!");cash-=1e11;showToast(`👨‍⚖️ 전관 선임.`,"blue");} secRisk=0;setDisplay('sec-modal','none');window.updateUI(); };
  window.switchTab = function(t) { ['trade','portfolio','realestate','politics','politics_run','deriv','wallst','vip','indirect','hr','bank','history','ipo'].forEach(x=>{ setDisplay(`tab-${x}`, x===t?'flex':'none'); if($id(`tab-btn-${x}`)) { if(x===t) $id(`tab-btn-${x}`).classList.add('active'); else $id(`tab-btn-${x}`).classList.remove('active'); }}); if(t==='portfolio')window.renderPortfolio(); if(t==='realestate')window.switchFlexTab('re', document.querySelector('#tab-realestate .re-c-btn')); if(t==='politics')window.renderPolitics(); if(t==='politics_run')window.renderPolCandidates(); if(t==='ipo')window.renderIpoTab(); if(t==='deriv'){ensureOptChart(); requestAnimationFrame(()=>{try{if(oChart)oChart.resize();}catch(e){} window.updateOptPrice(); window.renderOptPositions();});} if(t==='wallst')window.renderWallStList(); if(t==='vip')window.renderVipStore(); if(t==='indirect')window.renderIndirectStore(); if(t==='hr'){if(!currentHRTab)currentHRTab='corp'; if($id('hr-fa-view').style.display==='block')window.renderTransferMarket();else window.renderHR();} if(t==='history')window.renderHistoryTab(); };
  window.switchFlexTab = function(t, b) { if(b) { document.querySelectorAll('#tab-realestate .re-c-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); } ['re','flex','concert','sports','media'].forEach(x=>setDisplay(`flex-${x}-view`, x===t?'flex':'none')); if(t==='re')window.renderRealEstate(); if(t==='sports'){window.renderClubs();window.renderMyClubs();} if(t==='media'){window.renderMedia();} if(t==='flex'){let bs=$id('flex-bio-sel');if(bs){bs.innerHTML="";stocks.filter(s=>s.tag==='바이오').forEach(s=>bs.innerHTML+=`<option value="${s.id}">${s.name}</option>`);}let rs=$id('flex-rnd-sel');if(rs){rs.innerHTML="";stocks.filter(s=>s.isEquity).forEach(s=>rs.innerHTML+=`<option value="${s.id}">${s.name}</option>`);}} };
  window.renderPortfolioFilter = function(f, btn) { currentPortFilter = f; document.querySelectorAll('#tab-portfolio .re-c-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); window.renderPortfolio(); };
  window.toggleOrderbook = function() { obExpanded=!obExpanded; window.updateUI(); if($id('tab-deriv').style.display==='flex') window.updateOptPrice(); };
  window.setMarket = function(mkt, pS=false) { currentMarket = mkt; document.querySelectorAll('.m-tab').forEach(b => { if(b.id === `mtab-${mkt}`) b.classList.add('active'); else b.classList.remove('active'); }); if(!pS) { let f = stocks.find(s => s.market === mkt); if(f) selectedId = f.id; } window.updateUI(); };
  window.setTimeframe = function(d, btn) { currentTimeframe = d; document.querySelectorAll('.tf-btn:not(.opt-tf-btn)').forEach(b => b.classList.remove('active')); btn.classList.add('active'); window.updateUI(); };
  window.setTradeQtyPct = function(action, ratio) { let s = stocks.find(x => x.id === selectedId) || stocks[0]; if(!s) return; let qty = 0; if(action === 'buy') { let maxBuy = Math.floor(cash / s.price); if(s.isEquity && s.tag !== "인버스" && s.tag !== "레버리지") maxBuy = Math.min(maxBuy, s.issued - s.shares); qty = Math.floor(maxBuy * ratio); } else if (action === 'sell') { qty = Math.floor(s.shares * ratio); } else if (action === 'short') { let maxMargin = Math.floor(cash / s.price); let limit = Math.floor(s.issued * 0.5) - s.shortShares; qty = Math.floor(Math.min(maxMargin, Math.max(0, limit)) * ratio); } else if (action === 'cover') { qty = Math.floor(s.shortShares * ratio); } $id('trade-qty').value = Math.max(0, qty); };
  window.quickTrade = function(type, p) { let s = stocks.find(x => x.id === selectedId) || stocks[0]; if(!s) return; s.price = p; window.setTradeQtyPct(type, 0.25); let qs = $id('trade-qty').value; if(qs && parseInt(qs)>0) window.placeOrder(type); else showToast("현금/주식 부족", "black"); };
  window.placeOrder = function(type) { let qs = $id('trade-qty').value; if(!qs) return alert("수량 입력!"); let qty = parseInt(qs); if(isNaN(qty) || qty <= 0) return alert("수량 오류!"); let s = stocks.find(x => x.id === selectedId) || stocks[0]; let cost = qty * s.price; function wag(imp){ if(s.underlying){let u=stocks.find(x=>x.name===s.underlying); if(u)u.price=Math.max(10,Math.round(u.price*(1+Math.min(0.02,Math.max(-0.02,imp*s.beta*0.05)))));} } if(type === 'buy') { if(s.isEquity && s.tag!=="인버스" && s.tag!=="레버리지" && s.shares+qty>s.issued) return alert("발행 초과"); if(cash < cost) return alert("현금 부족"); cash-=cost; s.shares+=qty; s.cost+=cost; s.price=Math.round(s.price*1.002); wag(0.01); showToast("✅ 매수 완료", "red"); } else if(type === 'sell') { if(s.shares < qty) return alert("수량 부족"); let avg = s.shares>0 ? s.cost/s.shares : 0; cash+=cost; s.shares-=qty; s.cost-=avg*qty; s.price=Math.round(s.price*0.998); wag(-0.01); showToast("✅ 매도 완료", "blue"); } else if(type === 'short') { if(s.market==='CRYPTO'||s.market==='BOND') return alert("불가"); if(s.shortShares+qty > Math.floor(s.issued*0.5)) return alert("초과"); if(cash < cost) return alert("증거금 부족"); cash-=cost; s.shortShares+=qty; s.shortCost+=cost; s.price=Math.round(s.price*0.995); wag(-0.02); showToast("🔻 공매도", "black"); } else if(type === 'cover') { if(s.shortShares < qty) return alert("수량 부족"); let avg = s.shortShares>0 ? s.shortCost/s.shortShares : 0; let prof = (avg-s.price)*qty; cash+=(avg*qty)+prof; s.shortShares-=qty; s.shortCost-=avg*qty; wag(0.02); showToast(`💰 숏청산 수익: ${format(prof)}원`, prof>=0?"red":"blue"); s.price=Math.round(s.price*1.005); } $id('trade-qty').value = ""; window.updateUI(); };
  window.indiscriminateBuy = function() { let s = stocks.find(x => x.id === selectedId) || stocks[0]; if(!s || !s.isEquity || s.tag==="인버스" || s.tag==="레버리지") return alert("불가"); let cost = Math.floor(cash * 0.5); let qty = Math.floor(cost / s.price); if(qty <= 0) return alert("현금 부족"); cash-=cost; s.shares+=qty; s.cost+=cost; s.price=Math.round(s.price*1.20); secRisk+=40; showToast(`🔥 무차별 매입! 주가 20% 폭등!`, "event"); if(secRisk>=100) setDisplay('sec-modal','flex'); window.updateUI(); };

  // 포트폴리오
  window.renderPortfolio = function() { let bX=$id('portfolio-list'); if(!bX)return; bX.innerHTML=""; if(currentPortFilter==='all'||currentPortFilter==='stock')stocks.filter(s=>s.shares>0||s.shortShares>0).forEach(s=>{let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[${s.market}] ${s.name}</b></div><div><span style="color:#d32f2f;">보유 ${s.shares}</span> / <span style="color:#6a1b9a;">공매도 ${s.shortShares}</span></div>`;d.onclick=()=>{selectedId=s.id;currentMarket=s.market;window.switchTab('trade');window.setMarket(s.market,true);};bX.appendChild(d);}); if(currentPortFilter==='all'||currentPortFilter==='realestate')realEstates.filter(r=>r.owned>0).forEach(r=>{let roi=((r.price-r.cost)/r.cost*100).toFixed(2); let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[부동산] ${r.name}</b></div><div style="color:#2e7d32;">보유: ${r.owned}채 | 수익률: ${roi}%</div>`;d.onclick=()=>window.switchTab('realestate');bX.appendChild(d);}); if(currentPortFilter==='all'||currentPortFilter==='fund')globalLeaders.filter(l=>l.invest&&l.invest.cost>0).forEach(l=>{let roi=((l.invest.current-l.invest.cost)/l.invest.cost*100).toFixed(2); let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[국채] ${l.country} 펀드</b></div><div style="color:#2e7d32;">평가액: ${formatCap(l.invest.current)} (${roi}%)</div>`;d.onclick=()=>window.switchTab('politics');bX.appendChild(d);}); if(currentPortFilter==='all'||currentPortFilter==='deriv')optPositions.forEach(p=>{let c=macroIndices[p.asset]?macroIndices[p.asset].val:(stocks.find(x=>x.name===p.asset)?stocks.find(x=>x.name===p.asset).price:p.entryPrice);let diff=(c-p.entryPrice)*(macroIndices[p.asset]?50000:1)*p.qty*(p.type==='long'||p.type==='call'?1:-1);let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[${p.isFut?'선물':'옵션'}] ${p.asset.toUpperCase()}</b> <span style="color:#1976d2;">${p.type.toUpperCase()}</span></div><div><span class="${diff>=0?'text-up':'text-down'}">손익: ${format(diff)}원</span></div>`;d.onclick=()=>window.switchTab('deriv');bX.appendChild(d);}); if(currentPortFilter==='all'||currentPortFilter==='vip')vipAssets.filter(v=>v.owned>0).forEach(v=>{let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[VIP] ${v.name}</b></div><div style="color:#f57c00;">보유: ${v.owned}점</div>`;d.onclick=()=>window.switchTab('vip');bX.appendChild(d);}); if(currentPortFilter==='all'||currentPortFilter==='fund')indirectFunds.filter(f=>f.invested>0).forEach(f=>{let d=document.createElement('div');d.className="port-item";d.innerHTML=`<div><b>[펀드] ${f.name}</b></div><div style="color:#1976d2;">투자금: ${formatCap(f.invested)}</div>`;d.onclick=()=>window.switchTab('indirect');bX.appendChild(d);}); if(bX.innerHTML==="")bX.innerHTML="<div style='color:#888;text-align:center;'>자산이 없습니다.</div>"; };

  // 부동산 및 플렉스 (매각 완벽 지원)
  window.renderRealEstate = function() { let tB=$id('re-country-tabs'); if(tB&&tB.children.length===0){D.reCountriesList.forEach(c=>{let b=document.createElement('button'); b.className=`re-c-btn ${c===selectedReCountry?'active':''}`; b.innerText=c; b.onclick=()=>{selectedReCountry=c; document.querySelectorAll('#re-country-tabs .re-c-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); window.renderRealEstate();}; tB.appendChild(b);});} let bX=$id('realestate-list'); if(!bX)return; bX.innerHTML=""; realEstates.filter(r=>r.country===selectedReCountry).forEach(re=>{ let rS=re.owned>0?`수익률: <span class="${re.price>=re.cost?'text-up':'text-down'}">${((re.price-re.cost)/re.cost*100).toFixed(2)}%</span>`:''; let d=document.createElement('div'); d.className='port-item'; d.innerHTML=`<div><b style="color:#1a237e;">${re.name}</b> <span style="font-size:0.75em;color:#666;">(${re.type})</span><br><span style="color:#2e7d32;font-size:0.85em;">월세: ${format(re.rent)}원/월</span></div><div style="text-align:right;"><div style="color:#d32f2f;font-weight:bold;">${formatCap(re.price)}</div>${re.owned>0?`<div style="font-size:0.8em;margin-bottom:4px;">${rS}</div><span style="font-weight:bold;color:#1b5e20;font-size:0.8em;">보유:${re.owned}채</span> <button class="btn-clear" onclick="window.sellRE('${re.id}')">매각</button>`:`<button class="btn-quick" style="background:#1565c0;padding:6px 12px;" onclick="window.buyRE('${re.id}')">매입</button>`}</div>`; bX.appendChild(d); }); };
  window.buyRE = function(id) { let r=realEstates.find(x=>x.id===id); if(cash<r.price)return alert("자금 부족"); cash-=r.price; r.owned++; r.cost=r.price; showToast(`🏢 매입 완료!`, "blue"); window.updateUI(); window.renderRealEstate(); };
  window.sellRE = function(id) { let r=realEstates.find(x=>x.id===id); if(r.owned<=0)return; let prof=r.price-r.cost; cash+=r.price; r.owned--; showToast(`💰 차익: ${formatCap(prof)}`, prof>=0?"red":"blue"); window.updateUI(); window.renderRealEstate(); };
  
  window.buyFlex = function(type) { 
      let valid = ["한국","미국","일본","영국","프랑스","스페인","호주","중국","싱가포르","홍콩","글로벌"];
      if(type==='island'){if(cash<1e12)return alert("자금 부족."); let c=prompt("어느 국가에 섬을 매입하시겠습니까?\n(글로벌, 한국 등)","글로벌"); if(!valid.includes(c))c="글로벌"; let n=prompt("섬 이름","프라이빗 아일랜드"); if(!n)return; cash-=1e12;hofPoints+=1000;realEstates.push({id:'re_i_'+Date.now(),country:c,name:n,type:"개인섬",price:1e12,cost:1e12,rent:0,owned:1});showToast(`🏝️ ${n} 매입 완료! (부동산 탭 연동)`,"event");} 
      if(type==='charity'){if(cash<5e10)return alert("자금 부족.");cash-=5e10;secRisk=Math.max(0,secRisk-50);hofPoints+=1000;showToast("🤝 기부 완료! 명성 상승","blue");} 
      if(type==='org'){if(cash<1e13)return alert("자금 부족.");let n=prompt("국제기구 이름","글로벌 평화재단");if(!n)return;cash-=1e13;hofPoints+=5000;hrDepts['org_'+Date.now()]={name:n,count:1,salary:5e9,desc:"국제기구",agencies:["자체"],effDesc:"매월 글로벌 우호도 및 명성 보정"};showToast("🏛️ 기구 창설 완료! (HR 연동)","event");} 
      if(type==='school'){if(cash<5e12)return alert("자금 부족.");let c=prompt("설립 국가 지정","미국"); if(!valid.includes(c))c="미국"; let n=prompt("이름","아이비리그 글로벌 대학");if(!n)return;cash-=5e12;hofPoints+=2000;realEstates.push({id:'re_sc_'+Date.now(),country:c,name:n,type:"명문사학",price:5e12,cost:5e12,rent:5e10,owned:1});showToast(`🏫 ${n} 설립 완료! (부동산 연동)`,"event");} 
      if(type==='safari'){let c=prompt("건설 국가 지정","글로벌"); if(!valid.includes(c))c="글로벌"; let n=prompt("이름","대자연 랜드");if(!n)return;if(cash<2e12)return alert("자금 부족");cash-=2e12;realEstates.push({id:'re_sf_'+Date.now(),country:c,name:n+" 사파리",type:"관광지",price:2e12,cost:2e12,rent:2e10,owned:1});showToast("🦁 사파리 건설!","event");}
      if(type==='mega'){let ans=prompt("무엇을 매입합니까?\n1.글로벌 프랜차이즈(3조)\n2.국가 소유권(1000조)\n3.세계 최대 강(500조)"); if(ans==='1'){if(cash<3e12)return;cash-=3e12;realEstates.push({id:'re_f_'+Date.now(),country:"글로벌",name:prompt("이름")||"월드 햄버거",type:"상업용",price:3e12,cost:3e12,rent:1.5e11,owned:1});showToast("매입완료","blue");} else if(ans==='2'){if(cash<1000e12)return;cash-=1000e12;realEstates.push({id:'re_c_'+Date.now(),country:"글로벌",name:prompt("국가명")||"어느 국가",type:"국가",price:1000e12,cost:1000e12,rent:5e12,owned:1});showToast("국가 매입 완료!","event");} else if(ans==='3'){if(cash<500e12)return;cash-=500e12;realEstates.push({id:'re_r_'+Date.now(),country:"글로벌",name:prompt("강 이름")||"아마존 강",type:"자연원",price:500e12,cost:500e12,rent:2e12,owned:1});showToast("강 소유권 획득!","event");} }
      window.updateUI(); 
  };
  window.devDrug = function() { let sid=$id('flex-bio-sel').value; if(!sid)return; let s=stocks.find(x=>x.id===sid); if(cash<5e11)return alert("자금 부족"); cash-=5e11; if(Math.random()<0.25){cash+=5e12;hofPoints+=3000;showToast(`🔬 [${s.name}] 신약 대성공! 주가 3배 폭등!`,"event"); s.price=Math.round(s.price*3.0);} else {showToast("📉 임상 실패..","black"); s.price=Math.round(s.price*0.8);} window.updateUI(); };
  window.investRND = function() { let sid=$id('flex-rnd-sel').value; if(!sid)return; let s=stocks.find(x=>x.id===sid); if(cash<1e12)return alert("자금 부족"); cash-=1e12; if(Math.random()<0.5){showToast(`💡 [${s.name}] 기술혁신 대성공!`,"event"); s.price=Math.round(s.price*1.5);} else {showToast("📉 R&D 미비","black");} window.updateUI(); };
  window.buildMegaTower = function() { let c=$id('tower-country').value||"한국"; let fl=parseInt($id('tower-floors').value); if(isNaN(fl)||fl<50)return alert("50층 이상 입력"); let cost=fl*5e10; if(cash<cost)return alert(`비용 부족`); cash-=cost; hofPoints+=Math.floor(fl*10); realEstates.push({id:`re_m_${Date.now()}`,country:c,name:`${c} ${fl}층 랜드마크`,type:"랜드마크",price:cost,cost:cost,rent:Math.floor(cost*0.005),owned:1}); showToast(`🏢 ${c}에 빌딩 건설! (부동산 탭 연동)`, "event"); window.updateUI(); };
  
  // 스포츠, 콘서트, 미디어, VIP (매각 100% 활성화)
  window.hostConcert = function() { let ix=parseInt($id('concert-artist').value); let ar=concertArtistsList[ix]; let d=parseInt($id('concert-days').value); if(isNaN(d)||d<1||d>100)return alert("1~100일 입력"); let cost=ar.b+(d*5e9); if(cash<cost)return alert(`총 비용 부족.`); cash-=cost; let suc=Math.random()*ar.m; let rev=cost*(0.3+suc); cash+=rev; let prof=rev-cost; showToast(`🎤 투어 종료! 손익:${formatCap(prof)}원`, prof>=0?"red":"blue"); window.updateUI(); };
  window.renderClubs = function() { let c=$id('sports-country').value; let box=$id('sports-clubs-list'); if(!box)return; box.innerHTML=""; let clist=D.clubsData[c]; clist.forEach(cb=>{let isOwned=myClubs.includes(cb.id); box.innerHTML+=`<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px;border:1px solid #ccc;border-radius:6px;"><div><b>${cb.n}</b></div>${isOwned?`<span style="color:#2e7d32;font-weight:bold;">보유중 <button class="btn-clear" onclick="window.sellClub('${cb.id}')">매각</button></span>`:`<button class="btn-quick" style="background:#1565c0;" onclick="window.buyClub('${cb.id}', '${cb.n}', ${cb.p})">인수 (${formatCap(cb.p)})</button>`}</div>`;}); };
  window.buyClub = function(id, name, price) { if(cash<price)return alert("자금 부족."); cash-=price; myClubs.push(id); hofPoints+=1000; showToast(`⚽ ${name} 인수 완료!`, "event"); window.renderClubs(); window.renderMyClubs(); window.updateUI(); };
  window.sellClub = function(id) { let f=false; for(let k in D.clubsData){let c=D.clubsData[k].find(x=>x.id===id); if(c){cash+=c.p; myClubs=myClubs.filter(x=>x!==id); f=true; showToast(`⚽ 매각 완료`, "blue"); break;}} if(f){window.renderClubs(); window.renderMyClubs(); window.updateUI();} };
  window.renderMyClubs = function() { let box=$id('my-clubs-list'); if(!box)return; box.innerHTML=""; if(myClubs.length===0)box.innerHTML="<div style='color:#888;text-align:center;'>소유 구단 없음</div>"; let allNames=[]; for(let k in D.clubsData){D.clubsData[k].forEach(c=>{if(myClubs.includes(c.id))allNames.push(c.n);});} allNames.forEach(n=>{box.innerHTML+=`<div style="background:#e8eaf6;padding:8px;border-radius:6px;font-weight:bold;color:#1a237e;">⚽ ${n} (매일 수익)</div>`;}); };
  
  window.renderMedia = function() { let box=$id('media-list'); if(!box)return; box.innerHTML=""; mediaList.forEach(m=>{ let isO=myMedias.includes(m.id); box.innerHTML+=`<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:12px;border:1px solid #ddd;border-radius:8px;"><div><b>${m.n}</b><br><span style="font-size:0.8em;color:#555;">월 수익률 ${(m.r*100).toFixed(1)}%</span></div>${isO?`<span style="color:#1b5e20;font-weight:bold;">소유중 <button class="btn-clear" onclick="window.sellMedia('${m.id}')">매각</button></span>`:`<button class="btn-quick" style="background:#4e342e;" onclick="window.buyMedia('${m.id}',${m.p})">매입 (${formatCap(m.p)})</button>`}</div>`; }); };
  window.buyMedia = function(id,p) { if(cash<p)return alert("자본 부족"); cash-=p; myMedias.push(id); hofPoints+=2000; showToast("📺 언론사 매입 완료!", "event"); window.renderMedia(); window.updateUI(); };
  window.sellMedia = function(id) { let m=mediaList.find(x=>x.id===id); cash+=m.p; myMedias=myMedias.filter(x=>x!==id); showToast("📺 언론사 매각", "blue"); window.renderMedia(); window.updateUI(); };
  
  window.renderVipStore = function() { let box = $id('vip-items-list'); if(!box) return; box.innerHTML = ""; let filter = $id('vip-category-filter') ? $id('vip-category-filter').value : 'all'; let filteredVIP = vipAssets.filter(v => filter === 'all' || v.category === filter); filteredVIP.slice(0,50).forEach(v => { let krwPrice = v.usdPrice * macroIndices.usdkrw.val; let div = document.createElement('div'); div.className = 'vip-card'; div.innerHTML = `<div style="display:flex;justify-content:space-between;background:#fff;padding:10px;border-radius:6px;border:1px solid #ddd;"><div><b>${v.name}</b> <span style="font-size:0.75em; color:#888;">(${v.category})</span></div><div><span style="color:#d32f2f; font-weight:bold; margin-right:8px;">${formatCap(krwPrice)}</span>${v.owned > 0 ? `<span style="color:#1b5e20; font-weight:bold; margin-right:4px;">보유:${v.owned}</span><button class="btn-quick" style="background:#b71c1c;" onclick="window.sellVip('${v.id}')">매각</button>` : `<button class="btn-quick" style="background:#f57f17;" onclick="window.buyVip('${v.id}')">구매</button>`}</div></div>`; box.appendChild(div); }); };
  window.buyVip = function(id) { let v = vipAssets.find(x => x.id === id); let krwPrice = v.usdPrice * macroIndices.usdkrw.val; if(cash < krwPrice) return alert("자금 부족"); cash -= krwPrice; v.owned++; hofPoints += 50; window.updateUI(); window.renderVipStore(); };
  window.sellVip = function(id) { let v = vipAssets.find(x => x.id === id); let krwPrice = v.usdPrice * macroIndices.usdkrw.val; if(v.owned <= 0) return; cash += krwPrice; v.owned--; window.updateUI(); window.renderVipStore(); };

  // 파생, 펀드 (이전과 동일하게 Window에 등록)
  window.setOptQty = function(r) { let a=$id('opt-asset').value; let b=window.getAssetPrice(a,2000); let m=window.getAssetMult(a); let l=parseInt($id('opt-leverage').value)||10; let mar=Math.round((b*m*0.1)/l); let maxC=Math.floor(cash/mar); let tQ=Math.floor(maxC*r); $id('opt-qty').value=Math.max(1,tQ); window.updateOptPrice(); };
  window.setOptTimeframe = function(d,b) { optTimeframeVal=d; document.querySelectorAll('.opt-tf-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); window.updateOptPrice(); };
  window.tradeFutures = function(type) { let a=$id('opt-asset').value; let q=parseInt($id('opt-qty').value)||1; let mod=$id('opt-margin-mode').value; let l=parseInt($id('opt-leverage').value)||10; let b=window.getAssetPrice(a,2000); let mul=window.getAssetMult(a); let mar=Math.round((b*mul*0.1*q)/l); let fee=Math.round(b*mul*q*0.0004); if(cash < mar+fee) return alert(`증거금 부족`); cash -= (mar+fee); let ext=optPositions.find(p=>p.isFut&&p.asset===a&&p.type===type&&p.mode===mod&&p.lev===l); if(ext){ let tQ=ext.qty+q; ext.entryPrice=((ext.entryPrice*ext.qty)+(b*q))/tQ; ext.margin+=mar; ext.qty=tQ; let lD=mod==='cross'?(cash/(mul*tQ))*0.8:(ext.margin/(mul*tQ))*0.8; ext.liqPrice=type==='long'?Math.max(0,ext.entryPrice-lD):(ext.entryPrice+lD); showToast(`📈 물타기!`, "blue"); } else { let lD=mod==='cross'?(cash/(mul*q))*0.8:(mar/(mul*q))*0.8; let lP=type==='long'?Math.max(0,b-lD):(b+lD); optPositions.push({id:Date.now(),isFut:true,asset:a,type,qty:q,entryPrice:b,margin:mar,mode:mod,liqPrice:lP,lev:l,targetPrice:0}); showToast(`📈 선물 진입`, "blue"); } window.updateUI(); window.renderOptPositions(); };
  window.tradeOption = function(optType, side) { let a=$id('opt-asset').value; let q=parseInt($id('opt-qty').value)||1; let b=window.getAssetPrice(a,2000); let m=window.getAssetMult(a); let pr=Math.round(b*m*0.02*q); let fee=Math.round(b*m*q*0.0002); if(cash<pr+fee)return alert("자금 부족"); cash-=(pr+fee); optPositions.push({id:Date.now(),isFut:false,asset:a,type:optType,side:'buy',qty:q,entryPrice:b,prem:pr,targetPrice:0}); showToast(`📈 옵션 진입`, "blue"); window.updateUI(); window.renderOptPositions(); };
  window.closeOptPosition = function(id, auto=false) { let i=optPositions.findIndex(p=>p.id===id); if(i===-1)return; let p=optPositions[i]; let c=window.getAssetPrice(p.asset,p.entryPrice); let m=window.getAssetMult(p.asset); let fee=Math.round(c*m*p.qty*(p.isFut?0.0004:0.0002)); let diff=(c-p.entryPrice)*m*p.qty*(p.type==='long'||p.type==='call'?1:-1); cash+=(p.isFut?p.margin:p.prem)+diff-fee; optPositions.splice(i,1); showToast(auto?`🤖 청산: ${format(diff)}`:`💰 청산: ${format(diff)}`,diff>=0?"red":"blue"); window.updateUI(); window.renderOptPositions(); };
  window.setLimitOrder = function(id) { let p=optPositions.find(x=>x.id===id); if(!p)return; let tg=parseFloat($id(`limit_in_${id}`).value); if(isNaN(tg)||tg<=0)return alert("오류"); p.targetPrice=tg; showToast("✅ 예약 완료", "black"); window.renderOptPositions(); };
  window.cancelLimitOrder = function(id) { let p=optPositions.find(x=>x.id===id); if(p){p.targetPrice=0; showToast("🚫 예약 취소", "black"); window.renderOptPositions();} };
  window.updateOptPrice = function() { ensureOptChart(); let a=$id('opt-asset').value; let q=parseInt($id('opt-qty').value)||1; let mod=$id('opt-margin-mode').value; let l=parseInt($id('opt-leverage').value)||10; if($id('lev-display'))$id('lev-display').innerText=l; let b=window.getAssetPrice(a,2000); let m=window.getAssetMult(a); let cV=b*m; let sI=parseFloat($id('opt-strike').value); let st=sI||b; if(!sI&&$id('opt-strike'))$id('opt-strike').value=Math.round(b); setTxt('opt-curr-val', format(cV)); let d=(b-st)/b; let isC=b>st; let stat=Math.abs(d)<0.01?"등가격(ATM)":(isC?"Call ITM":"Call OTM"); let mar=Math.round((cV*0.1*q)/l); let equityForLiq=mod==='cross'?Math.max(0,cash):Math.max(0,mar); let leverageFactor=Math.max(1,l); let lD=(equityForLiq/(m*q))*0.8/leverageFactor; let liqLong=Math.max(0,b-lD); let liqShort=b+lD; setTxt('opt-liq-display', `청산가(Long): ${format(liqLong)}원 | Short: ${format(liqShort)}원`); setTxt('opt-status', stat); let obB=$id('opt-orderbook'); if(obB) { let h=""; let t=a.includes('BTC')?50000:(a.includes('ETH')?5000:(b>10000?500:(b>100?5:0.1))); let lv=obExpanded?10:5; for(let i=lv;i>=1;i--){let p=b+(t*i); h+=`<div style="display:flex;justify-content:space-between;background:#e3f2fd;color:#1976d2;padding:2px 4px;border-radius:3px;cursor:pointer;" onclick="$id('opt-strike').value=${p}; window.updateOptPrice();"><span>${p<100?p.toFixed(2):format(p)}</span><span>${Math.floor(Math.random()*5000)+100}</span></div>`;} h+=`<div style="text-align:center;font-weight:bold;font-size:0.8em;margin:2px 0;color:#555;cursor:pointer;" onclick="$id('opt-strike').value=${b}; window.updateOptPrice();">기준가: ${b<100?b.toFixed(2):format(b)}</div>`; for(let i=1;i<=lv;i++){let p=Math.max(0.1,b-(t*i)); h+=`<div style="display:flex;justify-content:space-between;background:#ffebee;color:#d32f2f;padding:2px 4px;border-radius:3px;cursor:pointer;" onclick="$id('opt-strike').value=${p}; window.updateOptPrice();"><span>${p<100?p.toFixed(2):format(p)}</span><span>${Math.floor(Math.random()*5000)+100}</span></div>`;} obB.innerHTML=h; } if(oChart) { let ha=(macroIndices[a]&&macroIndices[a].history)?macroIndices[a].history:(stocks.find(x=>x.name===a)?stocks.find(x=>x.name===a).history:Array(365).fill(b)); let sl=ha.slice(-optTimeframeVal); oChart.data.labels=Array(sl.length).fill(""); oChart.data.datasets[0].data=sl; let ac=optPositions.find(p=>p.asset===a); if(ac){oChart.data.datasets[1].data=Array(sl.length).fill(ac.entryPrice); if(ac.isFut)oChart.data.datasets[2].data=Array(sl.length).fill(ac.liqPrice); else oChart.data.datasets[2].data=[];}else{oChart.data.datasets[1].data=[];oChart.data.datasets[2].data=[];} oChart.update(); } };
  window.renderOptPositions = function() { let t=$id('opt-position-table'); if(!t)return; t.innerHTML="<tr><th>포지션</th><th>평단가/예약</th><th>손익</th><th>관리</th></tr>"; optPositions.forEach(p=>{let c=window.getAssetPrice(p.asset,p.entryPrice); let d=(c-p.entryPrice)*window.getAssetMult(p.asset)*p.qty*(p.type==='long'||p.type==='call'?1:-1); let lS=p.targetPrice>0?`<div style="color:#d32f2f;font-size:0.8em;">예약: ${format(p.targetPrice)} <button style="font-size:0.8em;padding:1px 4px;" onclick="window.cancelLimitOrder(${p.id})">취소</button></div>`:`<div style="display:flex;gap:2px;"><input type="number" id="limit_in_${p.id}" placeholder="목표가" style="width:60px;font-size:0.7em;padding:2px;"><button style="font-size:0.7em;" onclick="window.setLimitOrder(${p.id})">설정</button></div>`; let tr=document.createElement('tr'); tr.innerHTML=`<td><b>${p.asset}</b><br><span style="font-size:0.8em;color:#666;">${p.isFut?'선물':'옵션'} ${p.type} ${p.lev?p.lev+'x':''} (${p.qty})</span></td><td>${format(p.entryPrice)}<br>${lS}</td><td class="${d>=0?'text-up':'text-down'}">${format(d)}</td><td><button class="btn-clear" onclick="window.closeOptPosition(${p.id})">청산</button></td>`; t.appendChild(tr);}); };

  // [개선 7] 월가 M&A 및 내 주식 획득
  window.switchWallStTab = function(t, b) { document.querySelectorAll('#tab-wallst .re-c-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); setDisplay('wallst-market-view', t==='list'?'flex':'none'); setDisplay('wallst-org-view', t==='org'?'block':'none'); if(t==='org') window.renderOrgChart(); };
  window.renderOrgChart = function() { let o=$id('wallst-org-view'); if(!o)return; o.innerHTML=`<h4 style="color:#1a237e;">🏢 ${playerName} 펀드 연결 조직도</h4>`; if(acquiredFunds.length===0)o.innerHTML+=`<div style="text-align:center;">인수한 자회사가 없습니다.</div>`; acquiredFunds.forEach(f=>{o.innerHTML+=`<div style="background:#e8eaf6;padding:10px;margin-bottom:8px;border-left:4px solid #1a237e;"><b>${f.name}</b> <span style="font-size:0.75em;">[${f.type}]</span><br><span style="color:#2e7d32;">AUM: ${formatCap(f.assets)}</span></div>`;}); };
  window.renderIndirectStore = function(){
    let box=$id('indirect-list'); if(!box)return; box.innerHTML='';
    box.innerHTML += `<div style="background:#e8eaf6;border:1px solid #9fa8da;padding:10px;border-radius:8px;margin-bottom:8px;"><b>📈 월가 사모 인덱스 펀드</b><div style="font-size:.8em;color:#555;margin-top:3px;">글로벌 경기순환과 주요 시장의 영향을 받아 가치가 변동합니다.</div></div>`;
    indirectFunds.forEach(f=>{
      let val=Math.max(0, f.invested*(1 + (getMacroCycle().wave*0.08)));
      let pnl=val-f.invested;
      box.innerHTML += `<div class="port-item" style="background:#fff;border:1px solid #ddd;"><div><b>${f.name}</b><br><span style="font-size:.8em;color:#666;">${f.type}</span></div><div style="text-align:right;"><div>투자금: ${formatCap(f.invested)}원</div><div class="${pnl>=0?'text-up':'text-down'}">평가: ${formatCap(val)}원 (${pnl>=0?'+':''}${f.invested?((pnl/f.invested)*100).toFixed(1):'0.0'}%)</div><div style="display:flex;gap:3px;justify-content:flex-end;margin-top:4px;"><button class="btn-quick" style="background:#1976d2;" onclick="window.investIndirect('${f.id}',10000000000)">100억 투자</button><button class="btn-clear" onclick="window.redeemIndirect('${f.id}')">환매</button></div></div></div>`;
    });
  };
  window.investIndirect=function(id,amount){let f=indirectFunds.find(x=>x.id===id);if(!f)return;if(cash<amount)return alert('현금 부족');cash-=amount;f.invested+=amount;showToast(`📊 ${f.name}에 ${formatCap(amount)}원 투자`,'blue');window.updateUI();window.renderIndirectStore();};
  window.redeemIndirect=function(id){let f=indirectFunds.find(x=>x.id===id);if(!f||f.invested<=0)return;let cycle=getMacroCycle();let val=Math.max(0,Math.round(f.invested*(1+cycle.wave*0.08)));cash+=val;f.invested=0;showToast(`💰 ${f.name} 환매: ${formatCap(val)}원`, 'blue');window.updateUI();window.renderIndirectStore();};

  window.renderWallStList = function() { let l=$id('wallst-fund-list'); if(!l)return; l.innerHTML=""; let m=document.createElement('div'); m.className=`fund-item`; m.style.background="#e3f2fd"; m.style.borderColor="#1976d2"; m.innerHTML=`<b>⭐ 내 펀드</b><br><span style="font-size:0.75em;">AUM: ${formatCap(window.getPlayerNetAssets())}</span>`; l.appendChild(m); rivalFunds.forEach(f=>{let d=document.createElement('div');d.className=`fund-item ${f.id===selectedFundId?'active':''}`;d.innerHTML=`<b>${f.name}</b> <span style="font-size:0.7em;">[${f.type}]</span><br><span style="font-size:0.75em;">AUM: ${formatCap(f.assets)}</span>`;d.onclick=()=>{selectedFundId=f.id;window.renderWallStDetail();window.renderWallStList();};l.appendChild(d);}); if(!selectedFundId&&rivalFunds.length>0){selectedFundId=rivalFunds[0].id;window.renderWallStDetail();} };
  window.renderWallStDetail = function() { let d=$id('wallst-fund-detail'); if(!d)return; let f=rivalFunds.find(x=>x.id===selectedFundId); if(!f)return; let sP=((f.myShares/f.issued)*100).toFixed(1); let c10=Math.floor(f.assets*0.1); let ob=sP>=51.0?`<hr><h4 style="color:#d32f2f;">🔥 경영권 행사</h4><button class="action-btn" style="width:100%;background:#43a047;margin-bottom:5px;" onclick="window.mergeRivalFund('${f.id}')">🤝 합병 상장 (IPO)</button><button class="action-btn" style="width:100%;background:#b71c1c;" onclick="window.liquidateRivalFund('${f.id}')">💣 완전 청산</button>`:''; d.innerHTML=`<h4 style="color:var(--primary);">${f.name}</h4><p style="font-size:0.8em;"><b>AUM:</b> ${formatCap(f.assets)}<br><b>내 지분율:</b> <span style="color:#d32f2f;font-weight:bold;">${sP}%</span></p><button class="action-btn btn-buy" style="width:100%;margin-bottom:5px;" onclick="window.buyRivalShares('${f.id}', 0.1)">지분 10% 적대적 인수 (${formatCap(c10)})</button>${ob}`; };
  window.buyRivalShares = function(id, r) { let f=rivalFunds.find(x=>x.id===id); let c=Math.floor(f.assets*r); if(cash<c)return alert(`자금 부족`); cash-=c; f.myShares=Math.min(f.issued,f.myShares+Math.floor(f.issued*r)); hofPoints+=Math.floor(r*1000); showToast(`지분 인수 성공!`,"event"); window.updateUI(); window.renderWallStDetail(); };
  window.mergeRivalFund = function(id) { let f=rivalFunds.find(x=>x.id===id); let doIpo=confirm(`[${f.name}] 증시에 직상장(IPO) 시키겠습니까?\n[확인] 커스텀 상장 (내 포트폴리오로 편입)\n[취소] 비상장 자회사로 100% 흡수 합병`); if(doIpo){let n=prompt("상장 기업명", f.name); if(!n)n=f.name; let t=prompt("업종", f.type); if(!t)t="일반"; let vStr=prompt("발행 총 주식수", "10000000"); let v=parseInt(vStr); if(isNaN(v)||v<100000)v=10000000; let pr=Math.floor(f.assets/v*0.5); let myS = Math.floor(v * (f.myShares/f.issued)); stocks.push({id:'s_ma_'+Date.now(), name:n, market:"KOSPI", tag:t, price:Math.max(500,pr), beta:1.2, issued:v, isEquity:true, shares:myS, cost:myS*pr, shortShares:0, shortCost:0, history:Array(365).fill(pr), ma20_history:Array(365).fill(pr)}); acquiredFunds.push({name:n, type:"상장사", assets:f.assets}); showToast(`🎉 [${n}] KOSPI 상장! 지분 ${format(myS)}주 획득`,"event");} else {cash+=f.assets; acquiredFunds.push({name:f.name, type:f.type, assets:f.assets}); showToast(`🤝 자회사 편입 완료.`,"blue");} rivalFunds=rivalFunds.filter(x=>x.id!==id); selectedFundId=null; window.updateUI(); window.renderWallStList(); };
  window.liquidateRivalFund = function(id) { let f=rivalFunds.find(x=>x.id===id); cash+=Math.floor(f.assets*0.4); rivalFunds=rivalFunds.filter(x=>x.id!==id); selectedFundId=null; showToast(`💣 펀드 청산 완료.`,"black"); window.updateUI(); window.renderWallStList(); };

  // [개선 4, 7] IPO 로직 (코스닥->코스피 이전)
  window.renderIpoTab = function() { let box = $id('ipo-status'); let actBox = $id('ipo-action'); if(!box || !actBox) return; let net = window.getPlayerNetAssets(); let empCount = myEmployees.length; for(let k in hrDepts) empCount += hrDepts[k].count * 10; let compSize = empCount < 10 ? "스타트업" : (empCount < 30 ? "중소기업" : (empCount < 50 ? "중견기업" : (empCount < 100 ? "대기업" : "글로벌기업"))); let tCnt = hrDepts.trading.count; let rCnt = hrDepts.research.count; let lCnt = hrDepts.lobby.count; let lvlNames = ["비상장", "KOSDAQ 상장사", "KOSPI 대기업", "S&P500 글로벌", "NASDAQ 빅테크"]; box.innerHTML = `<h3 style="color:#e91e63;margin:0 0 10px 0;">현재 등급: ${lvlNames[myIpoLevel]}</h3><div>내 자산: <b>${formatCap(net)}원</b> | 임직원: <b>${empCount}명 (${compSize})</b></div><div style="font-size:0.85em;color:#555;margin-top:5px;">보유 부서: 트레이딩(${tCnt}), 리서치(${rCnt}), 로비(${lCnt})</div>`; if(myIpoLevel === 0) { actBox.innerHTML = `<div class="info-box" style="margin-bottom:10px;"><b>[조건] KOSDAQ 상장</b><br>자산 100억 | 직원 10명+ | 트레이딩 1개+</div>`; if(net >= 10000000000 && empCount >= 10 && tCnt >= 1) actBox.innerHTML += `<button class="action-btn" style="width:100%;background:#e91e63;" onclick="window.executeIpo(1)">상장 심사 청구</button>`; } else if(myIpoLevel === 1) { actBox.innerHTML = `<div class="info-box" style="margin-bottom:10px;"><b>[조건] KOSPI 이전 상장</b><br>자산 1,000억 | 직원 30명+ | 트레이딩 3개+, 리서치 1개+</div>`; if(net >= 100000000000 && empCount >= 30 && tCnt >= 3 && rCnt >= 1) actBox.innerHTML += `<button class="action-btn" style="width:100%;background:#e91e63;" onclick="window.executeIpo(2)">이전 상장 추진</button>`; } else if(myIpoLevel === 2) { actBox.innerHTML = `<div class="info-box" style="margin-bottom:10px;"><b>[조건] S&P500 글로벌 진출</b><br>자산 10조 | 직원 50명+ | 트레이딩 5+, 리서치 3+, 로비 1+</div>`; if(net >= 10000000000000 && empCount >= 50 && tCnt >= 5 && rCnt >= 3 && lCnt >= 1) actBox.innerHTML += `<button class="action-btn" style="width:100%;background:#e91e63;" onclick="window.executeIpo(3)">뉴욕 증시 진출</button>`; } else if(myIpoLevel === 3) { actBox.innerHTML = `<div class="info-box" style="margin-bottom:10px;"><b>[조건] NASDAQ 빅테크 편입</b><br>자산 100조 | 직원 100명+ | 트레이딩 10+, 리서치 5+, 로비 3+</div>`; if(net >= 100000000000000 && empCount >= 100 && tCnt >= 10 && rCnt >= 5 && lCnt >= 3) actBox.innerHTML += `<button class="action-btn" style="width:100%;background:#e91e63;" onclick="window.executeIpo(4)">나스닥 최종 진출</button>`; } else { actBox.innerHTML = `<div style="color:#2e7d32;font-weight:bold;text-align:center;padding:10px;">🎉 최고의 글로벌 기업입니다!</div>`; } };
  window.executeIpo = function(tL) {
      if(Math.random() < 0.2) { showToast("❌ 심사 탈락...", "black"); return; }
      let sN = `${playerName} 홀딩스`; let myComp = stocks.find(x=>x.name===sN);
      if(tL === 1) { let neg = confirm("공모가 협상?\n[확인] 성공+20%, 실패-10%\n[취소] 5만원"); let pP=50000; if(neg){if(Math.random()>0.5){pP=60000;showToast("협상 성공","red");}else{pP=45000;showToast("협상 실패","blue");}} let pN=prompt("회사명", sN); if(pN)sN=pN; let sObj={id:'s_my_'+Date.now(),name:sN,market:"KOSDAQ",tag:"지주사",price:pP,beta:1.5,issued:20000000,isEquity:true,shares:10000000,cost:pP*10000000,shortShares:0,shortCost:0,history:Array(365).fill(pP),ma20_history:Array(365).fill(pP)}; sObj.per=15.0; sObj.eps=Math.floor(pP/15); stocks.push(sObj); showToast(`🚀 IPO 성공`,"event"); } 
      else if(tL===2){ if(myComp){ myComp.market="KOSPI"; myComp.price=Math.round(myComp.price*1.5); showToast(`🚀 KOSPI 이전 성공!`,"red"); } } 
      else if(tL===3||tL===4){ let mkt=tL===3?"SNP500":"NASDAQ"; if(!myComp) return; let isAdr=confirm(`미국 증시 진출!\n[확인] ADR 상장\n[취소] 직상장`); if(isAdr){ let aN=myComp.name+"(ADR)"; let aP=Math.round(myComp.price*2.0); let sObj={id:'s_my_adr_'+Date.now(),name:aN,market:mkt,tag:"지주사(ADR)",price:aP,beta:2.0,issued:10000000,isEquity:true,shares:5000000,cost:5000000*aP,shortShares:0,shortCost:0,history:Array(365).fill(aP),ma20_history:Array(365).fill(aP)}; sObj.per=20.0; sObj.eps=Math.floor(aP/20); stocks.push(sObj); showToast(`🚀 ADR 상장!`,"event"); } else { myComp.market=mkt; myComp.price=Math.round(myComp.price*3.0); showToast(`🚀 직상장 완료!`,"event"); } } 
      myIpoLevel=tL; window.renderIpoTab(); window.updateUI();
  };


  // ======================= 은행 / 연혁 / 누락 연결 보강 =======================
  window.updateBankRates = function() {
    let depRate = Math.max(0.5, (macroIndices.bond10?.val || 4.1) - 0.5);
    let lRate = (macroIndices.bond10?.val || 4.1) + 2.0;
    if (loanPrin > Math.max(1, window.getPlayerNetAssets()) * 0.6) lRate = 15.0;
    return { depRate, lRate };
  };

  window.switchBankTab = function(t, btn) {
    document.querySelectorAll('#tab-bank .re-c-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    setDisplay('bank-loan-view', t==='loan'?'block':'none');
    setDisplay('bank-bond-view', t==='bond'?'flex':'none');
    if(t==='bond') window.updateMarketBonds();
  };

  window.updateMarketBonds = function() {
    let box=$id('market-bonds-list'); if(!box)return;
    box.innerHTML="";
    marketBonds.forEach(b=>{
      let price=b.default?0:b.price;
      let act=b.default?"":(b.owned>0
        ? `<button class="btn-clear" onclick="window.sellBond('${b.id}')">매각(${b.owned})</button>`
        : `<button class="btn-quick" style="background:#1976d2;" onclick="window.buyBond('${b.id}')">매입</button>`);
      box.innerHTML+=`<div style="background:#fff;padding:8px;border-radius:6px;border:1px solid #ccc;display:flex;justify-content:space-between;align-items:center;">
        <div><b>[${b.grade}] ${b.name}</b><br><span style="font-size:.8em;color:#555;">수익률 ${(b.y*100).toFixed(1)}% | 부도위험 ${(b.r*100).toFixed(2)}%</span></div>
        <div style="text-align:right;"><b>${b.default?'<span style="color:red;">부도</span>':formatCap(price)}</b><div style="margin-top:4px;">${act}</div></div>
      </div>`;
    });
  };

  window.buyBond = function(id) {
    let b=marketBonds.find(x=>x.id===id); if(!b||b.default)return;
    if(cash<b.price)return alert("자금 부족");
    cash-=b.price; b.owned++;
    showToast("📜 채권 매입 완료","blue");
    window.updateUI(); window.updateMarketBonds();
  };

  window.sellBond = function(id) {
    let b=marketBonds.find(x=>x.id===id); if(!b||b.owned<=0)return;
    cash+=b.price; b.owned--;
    showToast("📜 채권 매각 완료","red");
    window.updateUI(); window.updateMarketBonds();
  };

  window.setBankQty = function(kind, ratio) {
    let el = kind==='dep' ? $id('bank-manual-dep') : $id('bank-manual-loan');
    if(!el)return;
    let amount=0;
    if(kind==='dep') {
      amount=Math.floor(cash*Math.max(0,Math.min(1,ratio)));
    } else if(kind==='with') {
      amount=Math.floor(depPrin*Math.max(0,Math.min(1,ratio)));
    } else if(kind==='bor') {
      amount=Math.floor(Math.max(0,maxLoan-loanPrin)*Math.max(0,Math.min(1,ratio)));
    } else if(kind==='rep') {
      amount=Math.floor(loanPrin*Math.max(0,Math.min(1,ratio)));
    }
    el.value=amount;
  };

  window.manualBank = function(action) {
    let id = (action==='deposit'||action==='withdraw') ? 'bank-manual-dep' :
             (action==='borrow'||action==='repay') ? 'bank-manual-loan' : 'bank-manual-corpbond';
    let el=$id(id); let amount=Math.floor(parseFloat(el?.value)||0);
    if(amount<=0)return alert("금액을 입력하세요.");

    if(action==='deposit') {
      if(cash<amount)return alert("현금 부족");
      cash-=amount; depPrin+=amount;
    } else if(action==='withdraw') {
      if(depPrin<amount)return alert("예금 잔액 부족");
      depPrin-=amount; cash+=amount;
    } else if(action==='borrow') {
      let available=Math.max(0, Math.floor(maxLoan-loanPrin));
      if(amount>available)return alert(`대출 가능 한도는 ${formatCap(available)}원입니다.`);
      loanPrin+=amount; cash+=amount;
    } else if(action==='repay') {
      let pay=Math.min(amount,loanPrin,cash);
      if(pay<=0)return alert("상환할 현금 또는 대출 잔액이 없습니다.");
      loanPrin-=pay; cash-=pay;
    } else if(action==='issue_bond') {
      if(cash<amount)return alert("회사채 발행에는 수수료/담보 여력이 필요합니다.");
      corpBond+=amount; cash+=amount; corpBondDueDate=new Date(currentDate.getTime()+365*24*60*60*1000);
    } else if(action==='repay_bond') {
      let pay=Math.min(amount,corpBond,cash);
      if(pay<=0)return alert("상환할 현금 또는 회사채 잔액이 없습니다.");
      corpBond-=pay; cash-=pay;
      if(corpBond<=0)corpBondDueDate=null;
    }
    el.value="";
    window.updateUI();
  };

  window.renderHistoryTab = function() {
    let box=$id('history-list') || $id('history-content') || $id('company-history-list');
    if(!box)return;
    if(!companyHistory.length) {
      box.innerHTML="<div style='color:#888;text-align:center;'>아직 기록된 연혁이 없습니다.</div>";
      return;
    }
    box.innerHTML=companyHistory.map(h=>`<div class="history-event"><b>${h.date}</b><br><strong>${h.title}</strong><div style="font-size:.85em;color:#555;margin-top:3px;">${h.desc}</div></div>`).join("");
  };

  window.fillHRMarket = function() {
    let box=$id('hr-transfer-market');
    if(box && currentHRTab) window.renderTransferMarket();
  };

  window.renderSettlement = function() {
    let box=$id('settlement-details');
    if(box) {
      let net=window.getPlayerNetAssets();
      box.innerHTML=`<b>${currentDate.getFullYear()}년 결산</b><br>순자산: <b>${formatCap(net)}원</b><br>현금: ${formatCap(cash)}원`;
    }
    let table=$id('rank-table-body');
    if(table) {
      let rows=[...rivalFunds,{name:playerName,assets:window.getPlayerNetAssets()}].sort((a,b)=>b.assets-a.assets);
      table.innerHTML="<tr><th>순위</th><th>펀드</th><th>자산</th></tr>"+rows.slice(0,10).map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${formatCap(r.assets)}</td></tr>`).join("");
    }
  };

  window.closeSettlement = function() {
    let y=currentDate.getFullYear();
    currentDate=new Date(y+1,0,1);
    setDisplay('settlement-modal','none');
    window.initGameSystem();
    window.updateUI();
    if(gameInterval)clearInterval(gameInterval);
    gameInterval=setInterval(window.gameLoop,currentSpeed);
  };

  // HR 로직
  window.switchHRTab = function(t, btn) { document.querySelectorAll('#tab-hr .re-c-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); setDisplay('hr-fa-view', (t==='fa' || t==='pol') ? 'block' : 'none'); setDisplay('hr-hired-view', t==='hired' ? 'block' : 'none'); setDisplay('hr-manage-view', t==='manage' ? 'block' : 'none'); if(t==='fa' || t==='pol') { currentHRTab = t; hrPage=1; window.renderTransferMarket(); } else if(t==='hired') { hrPage=1; window.renderHR(); } else if(t==='manage') { window.renderDept(); } };
  window.renderTransferMarket = function() { let tb=$id('hr-transfer-market'); if(!tb)return; tb.style.display='block'; tb.innerHTML=currentHRTab==='corp'?"<h4 style='margin:0 0 5px 0;color:#1a237e;'>🌐 글로벌 인재 (FA)</h4>":"<h4 style='margin:0 0 5px 0;color:#b71c1c;'>🏛️ 정계 인사 (로비)</h4>"; let fA=transferMarket.filter(p=>currentHRTab==='corp'?p.comp==="FA(자유계약)":p.comp!=="FA(자유계약)"); let total = Math.ceil(fA.length / 10); if(total===0)total=1; if(hrPage>total) hrPage=total; let sliced = fA.slice((hrPage-1)*10, hrPage*10); if(sliced.length===0){tb.innerHTML+=`<div style="text-align:center;color:#888;">인사가 없습니다.</div>`;} sliced.forEach((p)=>{ let ix=transferMarket.indexOf(p); tb.innerHTML+=`<div class="hr-market-card" style="background:#fff;padding:8px;border-radius:6px;margin-bottom:6px;border:1px solid #ccc;"><div style="display:flex;justify-content:space-between;"><b>${p.name}</b> <span style="color:#d32f2f;font-weight:bold;">${p.stat}</span></div><div style="color:#555;font-size:0.85em;">${p.comp} 출신 | ${p.nation} | ${p.spec}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><span style="color:#1b5e20;font-weight:bold;">${formatCap(p.cost)}</span><button class="btn-quick" style="${currentHRTab==='pol'?'background:#b71c1c;':'background:#1976d2;'}" onclick="window.signFreeAgent(${ix})">영입</button></div></div>`; }); tb.innerHTML += `<div style="text-align:center; margin-top:10px;"><button onclick="hrPage=Math.max(1,hrPage-1);window.renderTransferMarket()">이전</button> <span style="margin:0 10px;font-weight:bold;">${hrPage} / ${total}</span> <button onclick="hrPage=Math.min(${total},hrPage+1);window.renderTransferMarket()">다음</button></div>`; };
  window.signFreeAgent = function(ix) { let p=transferMarket[ix]; if(cash<p.cost)return alert("현금 부족"); cash-=p.cost; myEmployees.push({name:p.name,role:p.spec,stat:p.stat,salary:Math.floor(p.cost*0.1),assignedTo:null,assignedRole:null}); transferMarket.splice(ix,1); window.fillHRMarket(); showToast(`👨‍💼 영입 성공!`, "blue"); window.updateUI(); window.renderTransferMarket(); window.renderHR(); };
  window.negSalary = function(ix, t) { let e=myEmployees[ix]; if(t==='up'){e.salary=Math.floor(e.salary*1.2);e.stat='S급';showToast(`💸 ${e.name} 연봉 인상 (S급 각성)`,'blue');} else if(t==='freeze'){showToast(`🤝 동결 합의`,'black');} else if(t==='down'){if(Math.random()<0.3){showToast(`😡 분노 퇴사!`,'red');myEmployees.splice(ix,1);}else{e.salary=Math.floor(e.salary*0.8);showToast(`📉 삭감 수용`,'black');}} window.renderHR(); window.renderPolCandidates(); window.updateUI(); };
  window.renderHR = function() { let b=$id('hr-employee-list'); let pb=$id('hr-pagination'); if(!b) return; let fE=myEmployees.filter(e=>currentHiredFilter==='all'||(currentHiredFilter==='corp'?!e.role.includes("후보")&&!e.role.includes("당선")&&!e.role.includes("장관")&&!e.role.includes("대통령"):(e.role.includes("후보")||e.role.includes("당선")||e.role.includes("장관")||e.role.includes("대통령")))); let total = Math.ceil(fE.length / 10); if(total===0)total=1; if(hrPage>total) hrPage=total; let sliced = fE.slice((hrPage-1)*10, hrPage*10); b.innerHTML=sliced.length===0?"<div style='color:#888;text-align:center;'>채용 인원 없음</div>":sliced.map((e)=>{let ix=myEmployees.indexOf(e);let aS=e.assignedTo?`<span style="color:#d32f2f;font-weight:bold;">[${e.assignedTo}]</span>`:`<span style="color:#2e7d32;">[대기중]</span>`;return `<div style="display:flex;flex-direction:column;padding:6px 0;border-bottom:1px dotted #ccc;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><div><b>${e.name}</b> <span style="color:#b71c1c;">(${e.stat} ${e.role})</span> ${aS}</div><button class="btn-clear" onclick="window.fireEmployee(${ix})">해고</button></div><div style="display:flex;justify-content:space-between;"><span>${formatCap(e.salary)}</span><div style="display:flex;gap:2px;"><button class="btn-quick" style="background:#2e7d32;" onclick="window.negSalary(${ix},'up')">인상</button><button class="btn-quick" style="background:#546e7a;" onclick="window.negSalary(${ix},'freeze')">동결</button><button class="btn-quick" style="background:#c62828;" onclick="window.negSalary(${ix},'down')">삭감</button></div></div></div>`;}).join(''); if(pb) pb.innerHTML = total > 1 ? `<button onclick="hrPage=Math.max(1,hrPage-1);window.renderHR()">이전</button> <span style="margin:0 10px;font-weight:bold;">${hrPage} / ${total}</span> <button onclick="hrPage=Math.min(${total},hrPage+1);window.renderHR()">다음</button>` : ''; };
  window.renderDept = function() { let dB=$id('hr-departments'); if(!dB) return; dB.innerHTML=""; for(let k in hrDepts){ let d=hrDepts[k]; let v=document.createElement('div'); v.style.cssText="background:#f9f9f9;padding:8px;border-radius:6px;margin-bottom:5px;border:1px solid #ddd;"; v.innerHTML=`<div style="display:flex;justify-content:space-between;"><b>${d.name}</b> <span>${d.agencies.join(', ')}</span></div><div style="font-size:0.75em;color:#d32f2f;font-weight:bold;margin-top:2px;">효과: ${d.effDesc}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><span style="color:#2e7d32;font-weight:bold;">${d.count}팀 가동중</span><div><button class="action-btn" style="background:#1976d2;" onclick="window.hireDept('${k}')">확장(+${formatCap(d.salary)})</button> <button class="action-btn" style="background:#e53935;" onclick="window.fireDept('${k}')">축소</button></div></div>`; dB.appendChild(v); } };
  window.fireDept = function(k){if(hrDepts[k].count>0){hrDepts[k].count--;window.updateUI();window.renderDept();}}; 
  window.fireEmployee = function(ix){if(!confirm("해고?"))return;let f=myEmployees.splice(ix,1)[0];showToast(`👋 ${f.name} 해고됨`,"black");window.updateUI();window.renderHR();window.renderPolCandidates();}; 
  window.hireDept = function(k){let d=hrDepts[k];if(cash<d.salary)return alert("자금 부족");cash-=d.salary;d.count++;window.updateUI();window.renderDept();};

  // 외교 및 정치
  window.renderPolitics = function() { let pBox = $id('politics-list'); if(!pBox) return; pBox.innerHTML = ""; globalLeaders.forEach(l => { let investDiv = l.rep >= 50 ? `<div style="margin-top:6px; background:#fff3e0; padding:6px; border-radius:4px;"><span style="font-size:0.8em; color:#e65100; font-weight:bold;">[국채 매입]</span> <div style="display:flex; gap:4px; margin-top:4px;"><button class="btn-quick" style="background:#43a047;" onclick="window.investCountry('${l.id}', 1e10)">100억</button><button class="btn-quick" style="background:#388e3c;" onclick="window.investCountry('${l.id}', 1e11)">1천억</button><button class="btn-quick" style="background:#2e7d32;" onclick="window.investCountry('${l.id}', 1e12)">1조</button><button class="btn-quick" style="background:#1b5e20;" onclick="window.investCountry('${l.id}', 1e13)">10조</button><button class="btn-quick" style="background:#003300;" onclick="window.investCountry('${l.id}', 1e14)">100조</button></div></div>` : `<div style="font-size:0.8em; color:#888; margin-top:4px;">🔒 우호도 50 달성 시 국채 투자 가능</div>`; let div = document.createElement('div'); div.style.cssText = "background:white; border:1px solid #ccc; padding:8px; border-radius:6px; font-size:0.82em;"; div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div><b>${l.country} ${l.name}</b> <span style="font-size:0.75em; background:#e0f2f1; padding:2px 4px; border-radius:4px; color:#00695c;">경제: ${l.state}</span> | 우호: <b>${l.rep}/100</b></div><button class="action-btn" style="background:#00695c; padding:4px 8px; font-size:0.75em;" onclick="window.lobbyLeader('${l.id}')">로비 (5억)</button></div><div style="display:flex; gap:4px; margin-top:6px;"><button class="btn-quick" style="background:#e53935;" onclick="window.countryAction('${l.id}', 'rate_up')">금리인상 조장</button><button class="btn-quick" style="background:#1976d2;" onclick="window.countryAction('${l.id}', 'rate_down')">금리인하 유도</button><button class="btn-quick" style="background:#d32f2f;" onclick="window.triggerWar('${l.id}')">국지전 유발</button><button class="btn-quick" style="background:#6a1b9a;" onclick="window.countryAction('${l.id}', 'oil')">석유 조작</button></div>${investDiv}`; if(l.invest && l.invest.cost > 0) { let roi = ((l.invest.current - l.invest.cost) / l.invest.cost * 100).toFixed(2); div.innerHTML += `<div style="margin-top:4px; color:#2e7d32;">평가액: ${formatCap(l.invest.current)} (${roi}%) <button class="btn-clear" onclick="window.sellCountry('${l.id}')">전액 매각</button></div>`; } pBox.appendChild(div); }); let gBox = $id('ops-grid'); if(!gBox) return; gBox.innerHTML=""; blackOpsList.forEach(op => { let btn = document.createElement('button'); btn.className = 'ops-btn'; btn.innerHTML = `<b>${op.title}</b><span style="font-size:0.85em; display:block; color:#ffcdd2; margin-top:3px;">비용: ${formatCap(op.cost)}</span><span style="font-size:0.75em; color:#ddd; font-weight:normal; display:block; margin-top:2px;">${op.desc}</span>`; btn.onclick = () => window.executeBlackOpsAction(op); gBox.appendChild(btn); }); };
  window.lobbyLeader = function(id) { let l = globalLeaders.find(x => x.id === id); if(cash < 500000000) return alert("자금 부족"); cash -= 500000000; l.rep = Math.min(100, l.rep + 20); showToast(`🤝 로비 완료!`, "blue"); window.updateUI(); window.renderPolitics(); };
  window.investCountry = function(id, amt) { let l = globalLeaders.find(x => x.id === id); if(cash < amt) return alert("현금 부족"); cash -= amt; if(!l.invest) l.invest = {cost:0, current:0}; l.invest.cost += amt; l.invest.current += amt; let cName = l.country.split(' ')[1]; let bonds = stocks.filter(s => s.market === 'BOND' && s.name.includes(cName)); bonds.forEach(b => { b.price = Math.round(b.price * 1.05); }); showToast(`💵 [${cName}] 국채 투자!`, "red"); window.updateUI(); window.renderPolitics(); };
  window.sellCountry = function(id) { let l = globalLeaders.find(x => x.id === id); if(!l.invest || l.invest.cost === 0) return; let profit = l.invest.current - l.invest.cost; cash += l.invest.current; l.invest = {cost:0, current:0}; showToast(`💰 국채 매각 완료`, "blue"); window.updateUI(); window.renderPolitics(); };
  window.triggerWar = function(id) { if(cash < 50000000000) return alert("비용 500억 부족"); let t = prompt("어느 국가/지역을 공격하시겠습니까?"); if(t) { cash -= 50000000000; macroIndices.wti.val *= 1.25; macroIndices.gold.val *= 1.15; macroIndices.kospi.val *= 0.85; secRisk += 10; if(secRisk >= 100) setDisplay('sec-modal', 'flex'); showToast(`💥 ${t} 국지전 발생!`, "event"); window.updateUI(); window.renderPolitics(); } };
  window.countryAction = function(id, type) { let l = globalLeaders.find(x => x.id === id); if(cash < 50000000000) return alert("비용 500억 부족"); cash -= 50000000000; if(type === 'rate_up') { macroIndices.bond10.val *= 1.1; macroIndices.reIndex.val *= 0.8; showToast(`📈 금리 인상 유도!`, "black"); } if(type === 'rate_down') { macroIndices.bond10.val *= 0.9; macroIndices.reIndex.val *= 1.2; showToast(`📉 금리 인하 유도!`, "red"); } if(type === 'oil') { let isUp = Math.random() > 0.5; macroIndices.wti.val *= isUp ? 1.3 : 0.7; showToast(`🛢️ 유가 ${isUp?'급등':'폭락'}!`, isUp?"event":"blue"); } secRisk += 10; if(secRisk >= 100) setDisplay('sec-modal', 'flex'); window.updateUI(); window.renderPolitics(); };
  window.executeBlackOpsAction = function(op) { if(cash < op.cost) return alert(`자금 부족!`); cash -= op.cost; for(let k in op.eff) { if(macroIndices[k]) macroIndices[k].val *= (1 + op.eff[k]); } if(op.eff.reIndex) macroIndices.reIndex.val *= (1 + op.eff.reIndex); if(op.tag === "ALL") { stocks.forEach(s => s.price = Math.max(10, Math.round(s.price * (1 + op.tagRate)))); } else if(op.tag) { stocks.forEach(s => { if(s.tag === op.tag) s.price = Math.max(10, Math.round(s.price * (1 + op.tagRate))); }); } let penalty = 20; if(hrDepts.lobby && hrDepts.lobby.count > 0) penalty -= (hrDepts.lobby.count * 3); if(penalty < 0) penalty = 0; secRisk += penalty; if(secRisk >= 100) setDisplay('sec-modal', 'flex'); showToast(`🚨 [공작 발동] ${op.title}`, "event"); addNewsBoard(`[딥스테이트] ${op.title}`); window.updateUI(); };

  // [개선 6] 정치 출마
  window.runForPolitics = function(type) { 
      let requiredRole = type === 'assembly' ? "국회의원 후보" : (type === 'minister' ? "장관 후보" : "대통령 후보"); 
      let cand = myEmployees.find(e => e.role === requiredRole); 
      if(!cand) return alert(`HR 탭에서 [${requiredRole}] 인재를 먼저 고용하세요.`); 
      let maxRep = Math.max(...globalLeaders.map(l => l.rep)); 
      if(type === 'assembly') { if(maxRep < 60) return alert("외교 60 이상 필요."); if(cash < 10000000000) return alert("자금 부족."); cash -= 10000000000; if(Math.random() < 0.5) { hofPoints += 50; cand.role = "국회의원 (당선)"; showToast("당선 성공!", "red"); } else { showToast("낙선...", "black"); cand.role = "일반 정치인"; } } 
      else if(type === 'minister') { if(maxRep < 80) return alert("외교 80 이상 필요."); if(cash < 50000000000) return alert("자금 부족."); cash -= 50000000000; if(Math.random() < 0.4) { hofPoints += 200; secRisk = 0; cand.role = "장관 (임명)"; showToast("장관 임명 성공! SEC 초기화", "red"); } else { showToast("인준 실패...", "black"); cand.role = "일반 정치인"; } } 
      else if(type === 'president') { if(maxRep < 100) return alert("외교 100 필요."); if(cash < 1000000000000) return alert("자금 1조 부족."); cash -= 1000000000000; if(Math.random() < 0.3) { hofPoints += 1000; secRisk = 0; cand.role = "대통령 (당선)"; showToast("🎉 대통령 당선!!", "event"); } else { showToast("대선 패배...", "black"); cand.role = "일반 정치인"; } } 
      window.updateUI(); window.renderHR(); window.renderPolCandidates(); 
  };
  window.renderPolCandidates = function() { let listBox = $id('my-politicians-list'); if(listBox) { listBox.innerHTML = ""; let pols = myEmployees.filter(e => e.role && (e.role.includes("당선") || e.role.includes("임명"))); if(pols.length === 0) { listBox.innerHTML = "<div style='color:#888; text-align:center;'>현재 정계에 진출한 첩자가 없습니다.<br>HR 이적시장에서 영입 후 출마시키세요.</div>"; } else { pols.forEach(p => { listBox.innerHTML += `<div style="background:#e8eaf6; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #c5cae9;"><div><b>${p.name}</b> <span style="color:#d32f2f; font-size:0.85em; font-weight:bold;">[${p.role}]</span></div><div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;"><button class="btn-quick" style="background:#d32f2f;" onclick="window.polInfluence('rate_up')">금리인상</button><button class="btn-quick" style="background:#1976d2;" onclick="window.polInfluence('rate_down')">금리인하</button><button class="btn-quick" style="background:#6a1b9a;" onclick="window.polInfluence('yen_carry')">엔캐리 청산</button><button class="btn-quick" style="background:#f57f17;" onclick="window.polInfluence('fx_weak')">환율 상승</button><button class="btn-quick" style="background:#388e3c;" onclick="window.polInfluence('fx_strong')">환율 하락</button><button class="btn-quick" style="background:#4e342e;" onclick="window.polInfluence('oil_up')">유가 상승</button><button class="btn-quick" style="background:#00838f;" onclick="window.polInfluence('oil_down')">유가 하락</button></div></div>`; }); } } };
  window.polInfluence = function(type) { let cost = 50000000000; if(cash < cost) return alert("자금 500억 필요"); cash -= cost; if(type === 'rate_up') { macroIndices.bond10.val *= 1.1; macroIndices.reIndex.val *= 0.8; showToast("📈 금리 인상 유도!", "black"); } if(type === 'rate_down') { macroIndices.bond10.val *= 0.9; macroIndices.reIndex.val *= 1.2; showToast("📉 금리 인하 유도!", "red"); } if(type === 'yen_carry') { macroIndices.kospi.val *= 0.85; macroIndices.nasdaq.val *= 0.9; showToast("💴 엔캐리 청산 발생!", "black"); } if(type === 'fx_weak') { macroIndices.usdkrw.val *= 1.1; showToast("💵 환율 급등!", "red"); } if(type === 'fx_strong') { macroIndices.usdkrw.val *= 0.9; showToast("💵 환율 급락!", "blue"); } if(type === 'oil_up') { macroIndices.wti.val *= 1.2; showToast("🛢️ 유가 상승!", "red"); } if(type === 'oil_down') { macroIndices.wti.val *= 0.8; showToast("🛢️ 유가 하락!", "blue"); } secRisk += 5; if(secRisk >= 100) setDisplay('sec-modal', 'flex'); window.updateUI(); };

  // [게임 코어 엔진 - 루프 및 신문 동적 업데이트]
  window.gameLoop = function() {
    try {
      currentDate.setDate(currentDate.getDate() + 1);
      let y=currentDate.getFullYear(); let m=currentDate.getMonth()+1; let d=currentDate.getDate(); setTxt('date-display', `${y}년 ${m}월 ${d}일`);
      if(cash>9e15){ let ex=cash-9e15; cash=9e15; depPrin+=ex; showToast("⚠️ 현금 한도 초과 자동 예금 전환", "black"); }

      if(m===1 && d===1) {
          if(D.futureEvents[y]) {
              let ev = D.futureEvents[y]; showToast(`🌍 [시대 전환] ${ev.title}`, "event"); addNewsBoard(`[메가트렌드] ${ev.news}`);
              if(ev.buffTag) stocks.filter(s=>s.tag===ev.buffTag).forEach(s=>s.price=Math.round(s.price*1.5));
              if(ev.nerfTag) stocks.filter(s=>s.tag===ev.nerfTag).forEach(s=>s.price=Math.round(s.price*0.7));
              if(ev.newStock) stocks.push({id:'s'+(idCounter++), name:ev.newStock, market:"NASDAQ", tag:"미래산업", price:100000, beta:3.0, issued:10000000, isEquity:true, shares:0, cost:0, shortShares:0, shortCost:0, history:Array(365).fill(100000), ma20_history:Array(365).fill(100000)});
          }
      }

      macroCycle.day++;
      let cyc=getMacroCycle();
      // 주기설 기반 공통 경기충격: 같은 날 여러 시장이 함께 움직이도록 상관관계를 부여
      let commonDrift=cyc.wave*0.0018;
      let cycleShock=0;
      if(macroCycle.day-macroCycle.lastShockDay>90 && Math.random()<0.018){
        cycleShock=(Math.random()<0.55?-1:1)*(0.015+Math.random()*0.035);
        macroCycle.lastShockDay=macroCycle.day;
        addNewsBoard(cycleShock<0?`🌧️ [경기순환] ${cyc.regime} 국면에서 글로벌 위험회피가 확대되었습니다.`:`☀️ [경기순환] ${cyc.regime} 국면에서 글로벌 위험선호가 회복되었습니다.`);
        showToast(cycleShock<0?'🌧️ 글로벌 경기 충격':'☀️ 글로벌 경기 회복','event');
      }
      for(let k in macroIndices){
        macroIndices[k].prev=macroIndices[k].val;
        let noise=(Math.random()-0.5)*(k.includes('bond')?0.006:0.012);
        let drift=commonDrift+noise+cycleShock;
        if(k==='bond10'||k==='bond30') drift = -commonDrift*0.7 + noise*0.6 - cycleShock*0.45;
        if(k==='usdkrw') drift = -commonDrift*0.25 + noise + cycleShock*0.35;
        macroIndices[k].val=Math.max(0.1,macroIndices[k].val*(1+drift));
        if(!macroIndices[k].history)macroIndices[k].history=Array(365).fill(macroIndices[k].prev);
        macroIndices[k].history.push(macroIndices[k].val); if(macroIndices[k].history.length>365)macroIndices[k].history.shift();
      }
      setTxt('macro-cycle-regime', `경기순환: ${cyc.regime}`);
      let bD=(macroIndices.bond10.val-macroIndices.bond10.prev)/macroIndices.bond10.prev;
      macroIndices.reIndex.val=Math.max(100,Math.round(macroIndices.reIndex.val*(1-bD*3.0+(Math.random()-0.495)*0.01))); let reR=(macroIndices.reIndex.val-macroIndices.reIndex.prev)/macroIndices.reIndex.prev; realEstates.forEach(r=>r.price=Math.max(1e8,Math.round(r.price*(1+reR))));

      stocks.forEach(s=>s.prevPrice=s.price);
      stocks.filter(s=>!s.underlying).forEach(s=>{ let mK=s.market.toLowerCase()==='snp500'?'snp500':s.market.toLowerCase(); let mD=0;if(mK==='crypto')mD=(macroIndices.nasdaq.val-macroIndices.nasdaq.prev)/macroIndices.nasdaq.prev;else if(mK==='bond')mD=-bD*2.0;else mD=macroIndices[mK]?(macroIndices[mK].val-macroIndices[mK].prev)/macroIndices[mK].prev:0; let vol=s.market==='CRYPTO'?4.0:(s.market==='BOND'?0.3:1.0); let del=(mD*s.beta)+(cyc.wave*0.0008*s.beta)+((Math.random()-0.5)*0.02*vol)+(cycleShock*0.65*s.beta); let r=s.price/s.initialPrice;if(r>3.0)del-=0.015*(r-3.0);if(r<0.3)del+=0.015*(0.3-r); s.price=Math.max(10,Math.round(s.price*(1+del))); s.history.push(s.price); let sum=0;let cnt=Math.min(20,s.history.length);for(let i=0;i<cnt;i++)sum+=s.history[s.history.length-1-i]; s.ma20_history.push(sum/cnt); if(s.history.length>365){s.history.shift();s.ma20_history.shift();} });
      stocks.filter(s=>s.underlying).forEach(s=>{ let u=stocks.find(x=>x.name===s.underlying); let mD=0;if(u&&u.prevPrice)mD=(u.price-u.prevPrice)/u.prevPrice; else{let uK=s.underlying.toLowerCase();if(s.underlying==="비트코인(BTC)")uK="nasdaq";if(s.underlying==="미국 국채 10년물")uK="bond10";if(macroIndices[uK])mD=(macroIndices[uK].val-macroIndices[uK].prev)/macroIndices[uK].prev;} s.price=Math.max(10,Math.round(s.price*(1+(mD*s.beta)))); s.history.push(s.price); let sum=0;let cnt=Math.min(20,s.history.length);for(let i=0;i<cnt;i++)sum+=s.history[s.history.length-1-i]; s.ma20_history.push(sum/cnt); if(s.history.length>365){s.history.shift();s.ma20_history.shift();} });

      for(let i=optPositions.length-1; i>=0; i--) {
         let p=optPositions[i]; let cur=window.getAssetPrice(p.asset,p.entryPrice);
         if(p.targetPrice>0){if((p.type==='long'&&cur>=p.targetPrice)||(p.type==='short'&&cur<=p.targetPrice)){window.closeOptPosition(p.id,true);continue;}}
         if(p.isFut){let isLiq=(p.type==='long'&&cur<=p.liqPrice)||(p.type==='short'&&cur>=p.liqPrice); if(isLiq){let diff=(p.liqPrice-p.entryPrice)*window.getAssetMult(p.asset)*p.qty*(p.type==='long'?1:-1); if(p.mode==='cross')cash+=diff; optPositions.splice(i,1); showToast(`💥 ${p.asset} 마진콜 청산`, "black");}else if(p.mode==='cross'){let mul=window.getAssetMult(p.asset); let levF=Math.max(1,p.lev||10); let liqD=(cash/(mul*p.qty))*0.8/levF; p.liqPrice=p.type==='long'?(p.entryPrice-liqD):(p.entryPrice+liqD);}}
      }

      globalLeaders.forEach(l=>{ if(l.invest&&l.invest.cost>0)l.invest.current=Math.max(100,Math.round(l.invest.current*(1-bD+(Math.random()-0.49)*0.01))); if(l.rep>=70&&Math.random()<0.01){let mS=stocks.filter(s=>s.shares>0&&s.isEquity);if(mS.length>0){let rs=mS[Math.floor(Math.random()*mS.length)];rs.price=Math.round(rs.price*1.10);addNewsBoard(`🤝 [외교] ${l.country} 수주 성공, ${rs.name} 폭등`);}} if(l.rep>=60&&Math.random()<0.05){let role=l.rep>=100?"대통령 후보":(l.rep>=80?"장관 후보":"국회의원 후보");let cC=l.rep>=100?5e10:(l.rep>=80?1e10:1e9);if(!transferMarket.some(x=>x.comp===l.country&&x.spec===role)){transferMarket.unshift({id:'hr_pol_'+Date.now(),name:`[정치인] ${l.country} 유력인사`,comp:l.country,nation:l.country.split(' ')[1],spec:role,cost:cC,stat:"S급"});showToast(`🕵️ 이적시장에 ${role} 등장`,"event");}} });

      let eqS=stocks.filter(s=>s.isEquity); let shS=eqS.filter(st=>st.shortShares>0); if(shS.length>0&&Math.random()<0.005){let t=shS[Math.floor(Math.random()*shS.length)];t.price=Math.round(t.price*(3.0+Math.random()));let eb=$id('event-banner');eb.innerText=`🦍 [개미 반란] ${t.name} 숏스퀴즈 폭등!`;eb.style.display='block';setTimeout(()=>eb.style.display='none',8000);let cL=(t.shortShares*t.price)-t.shortCost;if(cash<cL){loanPrin+=(cL-cash); cash=0; t.shortShares=0; t.shortCost=0; showToast(`💥 [마진콜] ${t.name} 강제 청산`,"black");}}
      if(hrDepts.trading&&hrDepts.trading.count>0)cash+=(hrDepts.trading.count*1e9); if(myClubs.length>0)cash+=(myClubs.length*5e8);
      if(myMedias.length>0) { let mV=mediaList.reduce((a,b)=>a+(myMedias.includes(b.id)?b.p*b.r:0),0); cash+=mV; }

      if(Math.random()<0.015&&eqS.length>0){let rS=eqS[Math.floor(Math.random()*eqS.length)];let evts=[{type:'bad',text:'공장 화재 발생',m:0.85,i:'🔥'},{type:'bad',text:'회계부정 스캔들',m:0.80,i:'🚨'},{type:'good',text:'혁신 신제품 발표',m:1.25,i:'🔬'},{type:'good',text:'초대형 글로벌 수주',m:1.20,i:'🤝'}];let ev=evts[Math.floor(Math.random()*evts.length)];rS.price=Math.round(rS.price*ev.m);addNewsBoard(`${ev.i} ${rS.name}, ${ev.text}`);}

      if(window.getPlayerNetAssets()<=-Math.floor(maxLoan*0.5)){clearInterval(gameInterval);setDisplay('bankrupt-modal','flex');return;}
      let cbInt=Math.floor(corpBond*(12.0/1200)); cash-=cbInt; if(corpBond>0&&window.getPlayerNetAssets()<corpBond){clearInterval(gameInterval);$id('bankrupt-modal').querySelector('p').innerHTML=`<b style="color:red">회사채 부도 (자본잠식)</b>`;setDisplay('bankrupt-modal','flex');return;}

      if(d===1) {
        let tR=realEstates.reduce((a,b)=>a+(b.rent*b.owned),0); let tD=globalLeaders.reduce((a,b)=>a+Math.floor((b.invest?b.invest.cost:0)*0.005),0); let br=window.updateBankRates(); let dI=Math.floor(depPrin*(br.depRate/1200)); let lI=Math.floor(loanPrin*(br.lRate/1200)); cash+=dI; cash-=lI; cash+=(tR+tD); let tS=myEmployees.reduce((a,b)=>a+b.salary,0); for(let k in hrDepts)tS+=hrDepts[k].count*hrDepts[k].salary; cash-=tS; if(hrDepts.lobby&&hrDepts.lobby.count>0)secRisk=Math.max(0,secRisk-(hrDepts.lobby.count*5));
        
        if(marketBonds.length > 0) {
          marketBonds.forEach(b => {
              if(!b.default) {
                  if(Math.random() < (b.r / 30)) { b.default=true; b.price=0; if(b.owned>0){ showToast(`🚨 보유중인 ${b.name} 파산!`, "black"); } }
                  else { let bD2 = (macroIndices.bond10.val-macroIndices.bond10.prev)/macroIndices.bond10.prev; b.price = Math.max(1, Math.round(b.price * (1 - (bD2*1.5)))); }
              }
          });
          if($id('tab-bank').style.display==='flex' && $id('bank-bond-view').style.display==='flex') window.updateMarketBonds();
        }
        let bondYield = 0; marketBonds.forEach(b => { if(!b.default && b.owned>0) bondYield += Math.floor(b.face * b.owned * (b.y/12)); });
        if(bondYield > 0) { cash += bondYield; showToast(`📜 채권 이자 ${formatCap(bondYield)}원 입금`, "blue"); }

        if(corpBond>0 && corpBondDueDate && currentDate > corpBondDueDate) {
            let pnl = Math.floor(corpBond * 0.1); cash -= pnl; showToast(`⚠️ 연체 이자 ${formatCap(pnl)}원 부과!`, "black"); corpBondDueDate = new Date(currentDate.getTime()+(30*24*60*60*1000));
        }
      }
      if(m===12&&d===28){let tDv=0;stocks.filter(s=>s.isEquity&&!s.underlying&&s.tag!=="가상화폐").forEach(s=>{let dp=Math.floor(s.price*(0.01+Math.random()*0.04));if(s.shares>0)tDv+=dp*s.shares;s.price=Math.max(10,s.price-dp);});if(tDv>0){cash+=tDv;showToast(`🎁 배당금 ${formatCap(tDv)}원 입금!`,"event");}}
      
      // [개선 5] 월간 신문 동적 업데이트
      if(d===1&&m!==lastMonth) {
        setTxt('brief-date-header', `${y}년 ${lastMonth}월 시장 브리핑`);
        let p=personPool[Math.floor(Math.random()*personPool.length)];
        setHTML('brief-person-info', `<div class="person-img">${p.i}</div><div><div style="font-weight:bold;font-size:1.1em;">${p.n}</div><div style="font-size:0.85em;color:#555;">${p.d}</div></div>`);

        let kp_chg = ((macroIndices.kospi.val - macroIndices.kospi.history[Math.max(0, macroIndices.kospi.history.length-30)]) / macroIndices.kospi.history[Math.max(0, macroIndices.kospi.history.length-30)] * 100).toFixed(2);
        let nq_chg = ((macroIndices.nasdaq.val - macroIndices.nasdaq.history[Math.max(0, macroIndices.nasdaq.history.length-30)]) / macroIndices.nasdaq.history[Math.max(0, macroIndices.nasdaq.history.length-30)] * 100).toFixed(2);
        setHTML('brief-kospi', `<span class="${kp_chg>=0?'text-up':'text-down'}">${format(macroIndices.kospi.val)} (${kp_chg>=0?'▲':'▼'}${Math.abs(kp_chg)}%)</span>`);
        setHTML('brief-nasdaq', `<span class="${nq_chg>=0?'text-up':'text-down'}">${format(macroIndices.nasdaq.val)} (${nq_chg>=0?'▲':'▼'}${Math.abs(nq_chg)}%)</span>`);
        let btc = stocks.find(x=>x.name.includes("비트코인"));
        if(btc) { let b_chg = ((btc.price - btc.history[Math.max(0, btc.history.length-30)]) / btc.history[Math.max(0, btc.history.length-30)] * 100).toFixed(2); setHTML('brief-crypto', `<span class="${b_chg>=0?'text-up':'text-down'}">${formatK(btc.price)}원 (${b_chg>=0?'▲':'▼'}${Math.abs(b_chg)}%)</span>`); }

        let tagAvg = {}; let tagCnt = {};
        stocks.filter(s=>s.isEquity && s.tag !== "인버스" && s.tag !== "레버리지").forEach(s=>{ if(!tagAvg[s.tag]) { tagAvg[s.tag]=0; tagCnt[s.tag]=0; } let pPrice = s.history[Math.max(0, s.history.length-30)] || s.price; tagAvg[s.tag] += ((s.price - pPrice) / pPrice * 100); tagCnt[s.tag]++; });
        let secHtml = "";
        for(let tg in tagAvg) { let avg = (tagAvg[tg]/tagCnt[tg]).toFixed(1); let bar = ""; for(let i=0; i<Math.abs(avg)/2 && i<15; i++) bar += (avg>=0?"█":"░"); secHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span style="width:50px;">${tg}</span> <span class="${avg>=0?'text-up':'text-down'}" style="width:40px; text-align:right;">${avg>=0?'+':''}${avg}%</span> <span style="flex:1; margin-left:10px; color:${avg>=0?'#d32f2f':'#1976d2'};">${bar}</span></div>`; }
        $id('brief-sectors').innerHTML = secHtml;

        setTxt('brief-cpi', (2.2+Math.random()*2).toFixed(1)+"%"); setTxt('brief-unemp', (3.8+Math.random()*1.5).toFixed(1)+"%");
        setHTML('monthly-news-content', monthlyNewsList.map(n=>`<div style="margin-bottom:4px; padding-bottom:4px; border-bottom:1px dotted #ccc;">• ${n}</div>`).join('')||"특별한 뉴스가 없습니다.");
        setDisplay('monthly-news-modal', 'flex'); monthlyNewsList=[]; lastMonth=m;
      }

      // 연말(12월 31일) 결산
      if(m===12&&d===31){
          stocks.filter(s=>s.isEquity).forEach(s=>{ if(!s.underlying&&s.price<500){ s.price=5000; s.initialPrice=5000; s.history=Array(365).fill(5000); s.ma20_history=Array(365).fill(5000); s.name=`신규IPO_${Math.floor(Math.random()*1000)}`; s.shares=0; s.cost=0; s.shortShares=0; s.shortCost=0;} });
          stocks.push({id:'s'+(idCounter++),name:`[신규상장] ${y+1}년 혁신기업`,market:"NASDAQ",tag:"미래산업",price:50000,beta:2.0,issued:5000000,isEquity:true,shares:0,cost:0,shortShares:0,shortCost:0,history:Array(365).fill(50000),ma20_history:Array(365).fill(50000)});
          vipAssets.push({id:'vip_new_'+Date.now(),name:`[마스터피스] ${y+1}년 경매품`,category:"미술품",usdPrice:1000000000,owned:0});
          D.reCountriesList.forEach(c=>{let bp=Math.floor(2e9+Math.random()*5e9); realEstates.push({id:`re_new_${Date.now()}_${Math.random()}`,country:c,name:`${c} 신축 건물`,type:"신축",price:bp,cost:0,rent:Math.floor(bp*0.0035),owned:0});});
          let rm=[]; indirectFunds=indirectFunds.filter(f=>{if(f.invested<1e7&&Math.random()<0.3){rm.push(f.name);return false;}return true;});
          if(rm.length>0)indirectFunds.push({id:'i_new_'+Date.now(),name:`${y+1}년 신규 펀드`,type:"주식형",invested:0});

          let p=transferMarket.filter(x=>x.comp!=="FA(자유계약)"); transferMarket=transferMarket.filter(x=>x.comp==="FA(자유계약)").slice(0,10); transferMarket=[...p,...transferMarket]; window.fillHRMarket();
          marketBonds = marketBonds.filter(b => b.owned > 0 || !b.default);
          if(marketBonds.length < 15) { D.bondGrades.forEach(gr=>{marketBonds.push({id:'bd_'+Date.now()+Math.random(), name:`${gr.g}급 신규채권`, grade:gr.g, y:gr.y, r:gr.r, face:100000000, price:100000000, owned:0, default:false});}); }

          clearInterval(gameInterval); window.renderSettlement(); setDisplay('settlement-modal','flex');
      }

      window.updateUI();
    } catch(e) { console.log("Loop Error:", e); }
  };
</script>