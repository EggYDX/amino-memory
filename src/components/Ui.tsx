import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X, ImageOff, ArrowRight, Check } from 'lucide-react';
import { BY_ID } from '../data/amino';
import { ease, settle } from './Motion';

export function Structure({id,anonymous=false,className='',compact=false}:{id:string;anonymous?:boolean;className?:string;compact?:boolean}) {
  const [failed,setFailed]=useState(false);
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{setFailed(false);setFallback(false);},[id,compact]);
  if(failed||!BY_ID[id]) return <div className={`structure missing ${className}`} role="status"><ImageOff size={26}/><span>结构图未能加载</span></div>;
  const source=compact&&!fallback&&BY_ID[id].compactStructure?BY_ID[id].compactStructure:BY_ID[id].structure;
  return <img className={`structure ${className}`} src={`${import.meta.env.BASE_URL}${source}`} alt={anonymous?'氨基酸结构图':`${BY_ID[id].name}的结构图`} onError={()=>{if(compact&&!fallback&&BY_ID[id].compactStructure)setFallback(true);else setFailed(true);}} draggable={false}/>;
}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);const id=useId();const reduced=useReducedMotion();
  useEffect(()=>{const el=ref.current!;const trigger=document.activeElement as HTMLElement|null;el.showModal();return()=>{el.close();if(trigger?.isConnected&&!document.querySelector('dialog[open]'))trigger.focus({preventScroll:true});};},[]);
  return <motion.dialog ref={ref} initial={{opacity:0,scale:reduced?1:0.97,y:reduced?0:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:reduced?1:0.985,y:reduced?0:7}} transition={{duration:reduced?0:0.18,ease}} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}} aria-labelledby={id}>
    <div className="modal-head"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={21}/></button></div>
    {children}
  </motion.dialog>;
}
export function Empty({children,action,onAction}:{children:ReactNode;action?:string;onAction?:()=>void}) {
  return <div className="empty"><p>{children}</p>{action&&<button className="button" onClick={onAction}>{action}<ArrowRight size={17}/></button>}</div>;
}
export function Toggle({checked,onChange,children}:{checked:boolean;onChange:()=>void;children:ReactNode}) {
  return <label className="toggle-row"><span>{children}</span><motion.button type="button" whileTap={{scale:0.97}} className={`switch ${checked?'on':''}`} role="switch" aria-label={typeof children==='string'?children:undefined} aria-checked={checked} onClick={onChange}><motion.span animate={{x:checked?18:0}} transition={settle}>{checked&&<Check size={12}/>}</motion.span></motion.button></label>;
}
export function Progress({value,max}:{value:number;max:number}) {const reduced=useReducedMotion();return <div className="progress" role="progressbar" aria-label="完成进度" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><motion.span initial={false} animate={{scaleX:Math.min(1,value/max)}} transition={{duration:reduced?0:0.22,ease:'linear'}}/></div>;}
