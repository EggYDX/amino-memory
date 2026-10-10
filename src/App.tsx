import { useEffect, useState } from 'react';
import { BookOpen, ChartNoAxesCombined, House, SlidersHorizontal, Settings2, Dna, ArrowRight, WifiOff } from 'lucide-react';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DataProvider, useData } from './components/DataContext';
import { Modal } from './components/Ui';
import { ModalHost, PageTransition, settle } from './components/Motion';
import { Home } from './pages/Home';
import { Atlas } from './pages/Atlas';
import { Custom } from './pages/Custom';
import { Training } from './pages/Training';
import { Records, SessionSummary } from './pages/Records';
import { Settings } from './pages/Settings';
import { finish, pause, startSession } from './core/engine';
import { DEFAULT_CONFIG, type Config } from './core/types';
const NAV=[['home','开始学习','学习',House],['atlas','氨基酸图鉴','图鉴',BookOpen],['custom','自定义训练','自定义',SlidersHorizontal],['records','学习记录','记录',ChartNoAxesCombined],['settings','设置','设置',Settings2]] as const;
function Shell() {
  const reduced=useReducedMotion();const {data,update,toast,storageError}=useData();const [route,setRoute]=useState(location.hash.slice(1)||'home');const [setup,setSetup]=useState<Config>({...DEFAULT_CONFIG});const [setupKey,setSetupKey]=useState(0);const [pending,setPending]=useState<Config|null>(null);
  const {needRefresh:[needRefresh],offlineReady:[offlineReady],updateServiceWorker}=useRegisterSW({onRegisterError(){toast('离线资源暂未缓存，联网后可重试','info');}});
  useEffect(()=>{const change=()=>setRoute(location.hash.slice(1)||'home');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});},[route]);
  useEffect(()=>{if(route!=='training'&&data.active&&!data.active.paused)update(d=>pause(d,true));},[route]);
  useEffect(()=>{const preference=matchMedia('(prefers-color-scheme: dark)');const apply=()=>document.documentElement.dataset.theme=data.settings.theme==='system'?(preference.matches?'dark':'light'):data.settings.theme;apply();preference.addEventListener('change',apply);return()=>preference.removeEventListener('change',apply);},[data.settings.theme]);
  useEffect(()=>{const onHidden=()=>{if(document.hidden)update(d=>pause(d,true));};document.addEventListener('visibilitychange',onHidden);return()=>document.removeEventListener('visibilitychange',onHidden);},[]);
  useEffect(()=>{const viewport=window.visualViewport;const keyboard=()=>{document.documentElement.dataset.keyboard=viewport&&viewport.height<window.innerHeight*0.76?'open':'closed';};viewport?.addEventListener('resize',keyboard);return()=>viewport?.removeEventListener('resize',keyboard);},[]);
  const configure=(c:Config)=>{setSetup(structuredClone(c));setSetupKey(k=>k+1);location.hash='custom';};
  const launch=(c:Config)=>{try{const session=startSession(c,data);update(d=>({...d,active:session}));location.hash='training';}catch(e){toast((e as Error).message,'error');}};
  const start=(c:Config)=>{if(data.active){setPending(c);return;}launch(c);};
  const session=route.startsWith('summary/')?data.sessions.find(s=>s.id===route.split('/')[1]):undefined;
  const training=route==='training';const section=route.startsWith('summary/')?'records':route;
  return <div className={`app-shell ${training?'training-shell':''}`}>
    {!training&&<header className="app-bar"><a href="#home" className="brand"><span className="brand-mark"><Dna size={24}/></span><span>氨基酸<small>记忆练习</small></span></a>
      <nav className="desktop-nav" aria-label="主导航">{NAV.map(([id,title,short])=><a href={`#${id}`} key={id} aria-label={title} aria-current={section===id?'page':undefined} className={section===id?'active':''}>{section===id&&<motion.span className="nav-indicator" layoutId="desktop-nav" transition={reduced?{duration:0}:settle}/>}<span>{short}</span></a>)}</nav>
      <div className="app-status">{offlineReady?<><span className="status-dot"/>可离线</>:<><WifiOff size={14}/>本机记录</>}</div>
    </header>}
    <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>跳到学习内容</a><main id="main-content" tabIndex={-1} className="main-content">{storageError&&<div className="storage-error" role="alert">{storageError}<a href="#settings">导出备份</a></div>}{needRefresh&&<div className="update-banner">有新版本可用<button onClick={()=>{if(data.active)toast('完成或退出练习后再更新','info');else void updateServiceWorker(true);}}>更新</button></div>}
      <PageTransition id={route}>{route==='home'?<Home start={start} configure={configure}/>:route==='atlas'?<Atlas configure={configure}/>:route==='custom'?<Custom key={setupKey} initial={setup} start={start}/>:route==='records'?<Records start={start}/>:route==='settings'?<Settings/>:training?<Training onFinished={id=>location.hash=`summary/${id}`}/>:session?<SessionSummary session={session} start={start}/>:<div className="page"><h1>页面未找到</h1><a href="#home" className="button">返回开始学习</a></div>}</PageTransition>
    </main>{!training&&<nav className="mobile-nav" aria-label="底部导航">{NAV.map(([id,title,short,Icon])=><a href={`#${id}`} aria-label={title} key={id} className={section===id?'active':''} aria-current={section===id?'page':undefined}>{section===id&&<motion.span className="nav-indicator" layoutId="mobile-nav" transition={reduced?{duration:0}:settle}/>}<Icon size={20}/><span>{short}</span></a>)}</nav>}
    <ModalHost>{pending&&<Modal title="已有未完成的练习" onClose={()=>setPending(null)}><p>结束原练习后，已作答的题目会保留在学习记录中。</p><div className="modal-actions"><button className="button" onClick={()=>{setPending(null);location.hash='training';}}>继续原练习</button><button className="button primary" onClick={()=>{const c=pending;try{const next=finish(data);const active=startSession(c,next);update({...next,active});setPending(null);location.hash='training';}catch(e){toast((e as Error).message,'error');}}}>结束原练习并开始<ArrowRight size={17}/></button></div></Modal>}</ModalHost>
  </div>;
}
export default function App(){return <MotionConfig reducedMotion="user"><DataProvider><Shell/></DataProvider></MotionConfig>;}
