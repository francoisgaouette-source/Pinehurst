import React from 'react';
import { createRoot } from 'react-dom/client';
import './scotland/site.css';
import './scotland/redesign-v640.css';
import './scotland/style-guide-v751.css';
import './scotland/original-inline.css';
import './scotland-integration.css';
import ScotlandSite from './ScotlandSite.jsx';
import {useCloudTrip} from './useCloudTrip.js';

const players = [
 ['Simon St-Denis','',null],
 ['Martin Roberge','Chef','martin-roberge-v1267.webp'],
 ['Stéphane Mailhot','Croco','stephane-mailhot-v1253.webp'],
 ['François Pilon','Grand François','francois-pilon-v1254.webp'],
 ['Jérôme Couture','',null],
 ['François Gaouette','Chin','francois-gaouette.webp'],
 ['Maxim Brooks','',null],
 ['Jean-Charles Doucet','Dou','jean-charles-doucet-v1252.webp'],
 ['François Doucet','Frank','francois-doucet-final.webp'],
 ['Samuel Gaouette','',null],
 ['Stéphane Desroches','',null],
 ['Gilles Brooks','',null],
 ['Yves Langlois','',null],
 ['Daniel Larose','',null],
 ['François Tremblay','',null],
 ['Sébastien Bondu','',null],
];
function initials(name){return name.split(/[ -]+/).map(word=>word[0]).slice(0,2).join('');}
const essentials=['Passeport et documents de voyage','Clubs et sac de transport','Souliers de golf et gants','Balles, tees et marqueur','Vêtements de pluie et couche légère','Crème solaire et casquette'];
const schedule = [
 {date:'13 avril',day:1,title:'En route vers Pinehurst',golf:'Une ronde en après-midi',flight:'YUL → CLT · American Airlines AA 5679',flightTime:'Arrivée à Charlotte à 10 h 11',hotel:'Carolina Hotel · Nuit du 13 avril',slots:['Après-midi']},
 {date:'14 avril',day:2,title:'Une journée sur les verts',golf:'Pinehurst · 36 trous',hotel:'Carolina Hotel · Nuit du 14 avril',slots:['Première ronde','Deuxième ronde']},
 {date:'15 avril',day:3,title:'Le rythme du golf',golf:'Pinehurst · 36 trous',hotel:'Carolina Hotel · Nuit du 15 avril',slots:['Première ronde','Deuxième ronde']},
 {date:'16 avril',day:4,title:'Encore 36 bonnes raisons',golf:'Pinehurst · 36 trous',hotel:'Carolina Hotel · Nuit du 16 avril',slots:['Première ronde','Deuxième ronde']},
 {date:'17 avril',day:5,title:'Profiter de chaque départ',golf:'Pinehurst · 36 trous',hotel:'Carolina Hotel · Nuit du 17 avril',slots:['Première ronde','Deuxième ronde']},
 {date:'18 avril',day:6,title:'Un dernier tour, puis le retour',golf:'Dernière ronde · Départ tôt',flight:'CLT → YUL · American Airlines AA 5137',flightTime:'Départ de Charlotte à 20 h 23',hotel:'Retour à Montréal',slots:['Départ tôt']},
];
// Tee times transcribed from the user-supplied “Horaire golf Pinehurst 2027.pdf”.
const bookedRounds = [
 {course:'Pinehurst No. 3',time:'14:40'},
 {course:'Pinehurst No. 4',time:'09:10'},
 {course:'Pinehurst No. 9',time:'14:50'},
 {course:'Pinehurst No. 8',time:'07:20'},
 {course:'Pinehurst No. 1',time:'15:28'},
 {course:'Pinehurst No. 10',time:'08:36'},
 {course:'Pinehurst No. 5',time:'15:28'},
 {course:'Pinehurst No. 11',time:'09:00'},
 {course:'Pinehurst No. 6',time:'15:36'},
 {course:'Pinehurst No. 2',time:'07:00'},
];
const roundPlan=schedule.flatMap(day=>day.slots.map(slot=>({day:day.day,date:day.date,isoDate:`2027-04-${day.day+12}`,slot}))).map((r,i)=>({...r,...bookedRounds[i]}));
const courseProfiles = {
 'Pinehurst No. 1':{architect:'Donald Ross',description:'Le parcours historique pour découvrir les origines de Pinehurst et le travail de Donald Ross.'},
 'Pinehurst No. 2':{architect:'Donald Ross',description:'Le parcours emblématique de Pinehurst, réputé pour ses greens bombés et ses approches exigeantes.'},
 'Pinehurst No. 3':{architect:'Donald Ross',description:'Un parcours court où le placement et le petit jeu prennent toute leur importance.'},
 'Pinehurst No. 4':{architect:'Gil Hanse · Réaménagement',description:'Un tracé vallonné qui fait la part belle aux reliefs naturels et aux étendues de sable des Sandhills.'},
 'Pinehurst No. 5':{architect:'Ellis Maples',description:'Un parcours aux trous variés, entre reliefs, obstacles d’eau et paysages de pins.'},
 'Pinehurst No. 6':{architect:'George et Tom Fazio',description:'Un tracé dans les pins, sur un terrain vallonné qui demande de bien choisir ses coups.'},
 'Pinehurst No. 8':{architect:'Tom Fazio',description:'Un parcours qui conjugue les paysages des Sandhills et un dessin moderne, avec une place importante au jeu d’approche.'},
 'Pinehurst No. 9':{architect:'Jack Nicklaus',description:'Un dessin de Jack Nicklaus où le placement, les obstacles et les greens structurent la stratégie de jeu.'},
 'Pinehurst No. 10':{architect:'Tom Doak',description:'Un parcours à Sandmines, marqué par les reliefs, les zones sablonneuses et de larges perspectives.'},
 'Pinehurst No. 11':{architect:'Présentation à compléter',description:'Le No. 11 figure à votre itinéraire du 17 avril. Sa présentation détaillée reste à vérifier auprès du resort.'},
};
function displayTime(time){const [h,m]=time.split(':');return `${Number(h)} h ${m}`;}
const defaults={selected:players.map(p=>p[0]),competitionReady:true,cup:{groups:{},matches:{}},passports:{},scores:{},packed:[],notes:'',rounds:roundPlan.map(r=>({course:r.course,date:r.isoDate,time:r.time}))};
function load(){try{const d=JSON.parse(localStorage.getItem('pinehurst-trip-v1'));if(!d||!Array.isArray(d.selected)||!Array.isArray(d.rounds)||!Array.isArray(d.packed)||typeof d.scores!=='object'||!d.scores)return defaults;return {...defaults,...d,competitionReady:true,selected:d.competitionReady||d.selected.length?d.selected.filter(n=>players.some(p=>p[0]===n)):players.map(p=>p[0]),cup:d.cup&&typeof d.cup==='object'?d.cup:defaults.cup,passports:d.passports&&typeof d.passports==='object'?d.passports:{},rounds:roundPlan.map((plan,i)=>{const r=d.rounds[i];return {course:String(r?.course||plan.course),date:String(r?.date||plan.isoDate),time:String(r?.time||plan.time)};})};}catch{return defaults;}}
function App(){
 const {trip,update,storageError,cloud}=useCloudTrip(defaults,load);
 function toggle(key,item){update(t=>({[key]:t[key].includes(item)?t[key].filter(x=>x!==item):[...t[key],item]}));}
 function roundChange(i,key,value){update(t=>({rounds:t.rounds.map((r,j)=>i===j?{...r,[key]:value}:r)}));}
 function score(name,i,value){if(value!==''&&(!/^\d+$/.test(value)||Number(value)>100))return;update(t=>({scores:{...t.scores,[name]:{...t.scores[name],[i]:value}}}));}
 function exportData(){const url=URL.createObjectURL(new Blob([JSON.stringify(trip,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pinehurst-voyage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const ranking=trip.selected.map(name=>{const points=trip.scores[name]||{};const entered=trip.rounds.map((_,i)=>i).filter(i=>points[i]!==undefined&&points[i]!=='');return {name,points,total:entered.reduce((s,i)=>s+Number(points[i]),0),played:entered.length};}).sort((a,b)=>Number(b.played>0)-Number(a.played>0)||b.total-a.total||a.name.localeCompare(b.name,'fr'));
 return <ScotlandSite cloud={cloud} trip={trip} update={update} players={players} schedule={schedule} roundPlan={roundPlan} courseProfiles={courseProfiles} essentials={essentials} displayTime={displayTime} ranking={ranking} score={score} toggle={toggle} exportData={exportData} storageError={storageError}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
