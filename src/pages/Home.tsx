import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, RotateCw, Clock3, SlidersHorizontal, Play, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useData } from '../components/DataContext';
import { allResults, dueMemories, MODES, modeConfig, stats, trainingTitle } from '../core/engine';
import { DEFAULT_CONFIG, type Config } from '../core/types';
import { AMINOS } from '../data/amino';
import { Structure } from '../components/Ui';
import { ease, PanelTransition } from '../components/Motion';
export function Home({start,configure}:{start:(c:Config)=>void;configure:(c:Config)=>void}) {
  const {data}=useData();const results=allResults(data);const progress=stats(results);const due=dueMemories(data);const active=data.active;const last=data.sessions.filter(s=>s.results.length>0).at(-1);
  const [mode,setMode]=useState(0);const [count,setCount]=useState(22);const [index,setIndex]=useState(3);const [revealed,setRevealed]=useState(false);const [direction,setDirection]=useState(1);const amino=AMINOS[index];
  const turn=(delta:number)=>{setDirection(delta);setIndex(i=>(i+delta+22)%22);setRevealed(false);};
  const config={...modeConfig(mode),count};
  return <div className="page home-page"><div className="workspace-heading"><h1>开始学习</h1><span>{new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',timeZone:'Asia/Shanghai'}).format(new Date())}</span></div>
    {active&&<a href="#training" className="resume-line"><Play size={16}/><span>继续 {trainingTitle(active.config)}</span><span>{active.results.length} / {active.config.count} 题</span><ArrowRight size={16}/></a>}
    <div className="study-workspace"><section className="practice-modes" aria-label="练习方向"><div className="section-label">练习方向</div>{MODES.map((item,i)=><button key={item.title} className={mode===i?'active':''} onClick={()=>{setMode(i);setRevealed(false);}} aria-pressed={mode===i}>{mode===i&&<motion.span className="mode-marker" layoutId="home-mode"/>}<span>{item.title}</span>{mode===i&&<Check size={15}/>}</button>)}<button className="configure-link" onClick={()=>configure(config)}><SlidersHorizontal size={16}/>更多配置</button></section>
      <section className="study-desk"><div className="desk-top"><strong>{MODES[mode].title}</strong><div className="desk-count"><label htmlFor="home-count">题量</label><select id="home-count" value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,10,22,50,100].map(n=><option value={n} key={n}>{n} 题</option>)}</select></div></div>
        <div className="memory-card"><div className="card-corner"><span>随手翻看</span><span>{index+1} / 22</span></div>
          <AnimatePresence mode="wait" initial={false}><motion.div className="home-molecule" key={amino.id} initial={{opacity:0,x:direction*12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:direction*-8}} transition={{duration:0.15,ease}}><Structure id={amino.id} anonymous compact/></motion.div></AnimatePresence>
          <div className="recall-strip"><PanelTransition id={revealed?amino.id+'answer':amino.id+'hidden'}>{revealed?<div className="recall-answer"><strong>{amino.name}</strong><span>{amino.three}</span><b>{amino.one}</b></div>:<button className="reveal-card" onClick={()=>setRevealed(true)}><RotateCw size={16}/>回想后，揭晓答案</button>}</PanelTransition></div>
        </div><div className="desk-bottom"><div className="deck-controls"><button className="icon-button" aria-label="翻看上一种氨基酸" onClick={()=>turn(-1)}><ChevronLeft size={19}/></button><button className="icon-button" aria-label="翻看下一种氨基酸" onClick={()=>turn(1)}><ChevronRight size={19}/></button></div><button className="button primary" onClick={()=>start(config)}>开始 {count} 题练习<ArrowRight size={18}/></button></div>
      </section><aside className="review-dock"><section><div className="section-label"><Clock3 size={16}/>到期复习</div><strong className="due-number">{due.length}<span>个方向</span></strong><p>{due.length?'现在适合再回忆一次':'今天没有到期复习'}</p>{due.length>0&&<button className="button soft" onClick={()=>start({...DEFAULT_CONFIG,title:'到期复习',scope:'due',count:due.length,mixed:true})}>开始复习<ArrowRight size={15}/></button>}</section>
        <section className="coverage-note"><div className="coverage-dots" role="img" aria-label={`已接触${progress.coverage}种氨基酸`}>{AMINOS.map(a=><span key={a.id} className={results.some(r=>r.question.amino===a.id)?'seen':''}/>)}</div><strong>{progress.coverage} / 22</strong><span>已接触的氨基酸</span><a href="#records">查看记录<ArrowRight size={14}/></a></section>
        {last&&<section className="last-study"><div className="section-label">上次练习</div><p>{last!.config.title}</p><b>{stats(last!.results).correct} / {last!.results.length} 题正确</b></section>}
        <a className="library-note" href="#atlas"><strong>对照侧链</strong><span className="code">Asp / Asn · Leu / Ile</span><ArrowRight size={16}/></a>
      </aside>
    </div><div className="home-footnote"><span>20 种标准 + 2 种特殊编码</span><button className="text-button" onClick={()=>configure(config)}>调整考察内容</button></div>
  </div>;
}
