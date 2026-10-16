export const INDIVIDUAL_PRIZES = [5, 4, 3, 2, 1];
export const GROUP_PRIZES = [2, 1, 0, 0];
export function numberOrNull(value, min = 0, max = 100) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max ? n : null;
}
export function awardPlaces(entries, prizes) {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const result = {};
  for (let i = 0; i < sorted.length;) {
    let end = i + 1;
    while (end < sorted.length && sorted[end].value === sorted[i].value) end++;
    const award = Array.from({length:end-i}, (_, n) => prizes[i+n] || 0).reduce((a,b)=>a+b,0)/(end-i);
    for (let j = i; j < end; j++) result[sorted[j].id] = {points:award, position:i+1};
    i=end;
  }
  return result;
}
export function pairs(names) {
  const sorted = [...names].sort();
  return sorted.flatMap((a, i) => sorted.slice(i+1).map(b=>({a,b,key:JSON.stringify([a,b])})));
}
export function calculateRound(names, scores, cup, round) {
  const values = Object.fromEntries(names.map(name=>[name,numberOrNull(scores[name]?.[round])]));
  const individual = awardPlaces(names.filter(n=>values[n]!==null).map(id=>({id,value:values[id]})),INDIVIDUAL_PRIZES);
  const assignments = cup?.groups?.[round] || {};
  const groups = Array.from({length:4},(_,i)=>{
    const members=names.filter(name=>String(assignments[name])===String(i+1));
    const valid=members.length===4;
    const complete=valid&&members.every(name=>values[name]!==null);
    const duels=valid?pairs(members):[];
    return {id:String(i+1),members,valid,complete,duels,total:complete?members.reduce((sum,n)=>sum+values[n],0):null};
  });
  const allGroupsComplete=names.length===16&&groups.every(g=>g.complete);
  const teamAwards=allGroupsComplete?awardPlaces(groups.map(g=>({id:g.id,value:g.total})),GROUP_PRIZES):{};
  const results=cup?.matches?.[round]||{};
  const entries=Object.fromEntries(names.map(name=>[name,{individual:individual[name]?.points??null,stableford:values[name],match:null,foursome:null,wins:0,ties:0,losses:0,duels:0,cup:null}]));
  for(const group of groups){
    for(const name of group.members)entries[name].foursome=teamAwards[group.id]?.points??null;
    for(const duel of group.duels){
      const result=results[duel.key];
      if(!['a','b','tie'].includes(result))continue;
      for(const [name,side] of [[duel.a,'a'],[duel.b,'b']]){
        const row=entries[name];row.duels++;
        row.match=(row.match??0)+(result==='tie'?0.5:result===side?1:0);
        row[result==='tie'?'ties':result===side?'wins':'losses']++;
      }
    }
  }
  for(const row of Object.values(entries)){
    const available=[row.individual,row.match,row.foursome].filter(v=>v!==null);
    row.cup=available.length?available.reduce((a,b)=>a+b,0):null;
    row.complete=row.stableford!==null&&row.duels===3&&row.foursome!==null;
  }
  return {entries,groups,teamAwards,complete:names.length===16&&Object.values(entries).every(r=>r.complete),allGroupsComplete};
}
export function standings(names, rounds, category) {
  const rows=names.map(name=>{
    const values=rounds.map(r=>r.entries[name]?.[category]??null);
    const entered=values.filter(v=>v!==null);
    const record=rounds.reduce((a,r)=>{const e=r.entries[name];return {wins:a.wins+(e?.wins||0),ties:a.ties+(e?.ties||0),losses:a.losses+(e?.losses||0)};},{wins:0,ties:0,losses:0});
    return {name,values,entered:entered.length,total:entered.length?entered.reduce((a,b)=>a+b,0):null,...record};
  }).sort((a,b)=>Number(b.total!==null)-Number(a.total!==null)||(b.total??0)-(a.total??0)||a.name.localeCompare(b.name,'fr'));
  return rows.map((row,i)=>({...row,position:row.total===null?null:rows.findIndex(r=>r.total===row.total)+1}));
}
export function formatPoints(n){return n===null||n===undefined?'—':new Intl.NumberFormat('fr-CA',{maximumFractionDigits:3}).format(n);}
