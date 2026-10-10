import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadData, saveData } from '../core/storage';
import { freshData, type AppData } from '../core/types';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, Info, CircleAlert } from 'lucide-react';
type Update=(value:AppData|((d:AppData)=>AppData))=>void;
interface Context {data:AppData;update:Update;toast:(text:string,tone?:'success'|'info'|'error')=>void;storageError:string;flush:()=>Promise<void>;}
const DataContext=createContext<Context|null>(null);
export function DataProvider({children}:{children:ReactNode}) {
  const [data,setData]=useState<AppData|null>(null);const [error,setError]=useState('');const [storageError,setStorageError]=useState('');const [notice,setNotice]=useState<{text:string;tone:'success'|'info'|'error'}|null>(null);
  const queue=useRef(Promise.resolve());const initial=useRef(true);const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
  const load=()=>loadData().then(d=>{initial.current=true;setData(d);setError('');}).catch(()=>setError('本地记录无法读取。请先导出原有备份或检查浏览器存储权限。'));
  useEffect(()=>{void load();return()=>clearTimeout(timer.current);},[]);
  useEffect(()=>{
    if(!data)return;if(initial.current){initial.current=false;return;}
    const snapshot=data;queue.current=queue.current.catch(()=>{}).then(()=>saveData(snapshot)).then(()=>setStorageError('')).catch(()=>{setStorageError('本地保存失败，请导出备份并检查浏览器存储空间。');});
  },[data]);
  const toast=(text:string,tone:'success'|'info'|'error'='success')=>{clearTimeout(timer.current);setNotice({text,tone});timer.current=setTimeout(()=>setNotice(null),3000);};
  if(error) return <main className="load-screen"><h1>本地记录暂时无法打开</h1><p>{error}</p><button className="button primary" onClick={()=>void load()}>重试读取</button></main>;
  if(!data)return <main className="load-screen"><div className="spinner"/><p>正在读取学习记录</p></main>;
  const update:Update=value=>setData(previous=>{if(!previous)return previous;const next=typeof value==='function'?value(previous):value;return next===previous?previous:{...next,updated:new Date().toISOString()};});
  return <DataContext.Provider value={{data,update,toast,storageError,flush:()=>queue.current}}>{children}<AnimatePresence>{notice&&<motion.div key={notice.text} className={`toast ${notice.tone}`} role={notice.tone==='error'?'alert':'status'} initial={{opacity:0,y:12,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:5}} transition={{duration:0.18}}>{notice.tone==='error'?<CircleAlert size={16}/>:notice.tone==='info'?<Info size={16}/>:<Check size={16}/>}<span>{notice.text}</span><button aria-label="关闭提示" onClick={()=>setNotice(null)}><X size={15}/></button></motion.div>}</AnimatePresence></DataContext.Provider>;
}
export const useData=()=>{const c=useContext(DataContext);if(!c)throw new Error('DataProvider missing');return c;};
export const resetData=freshData;
