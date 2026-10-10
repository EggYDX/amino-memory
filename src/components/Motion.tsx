import { useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
export const settle = {type:'spring',stiffness:460,damping:38,mass:0.8} as const;
export const ease = [0.22,1,0.36,1] as const;
export function PageTransition({id,children}:{id:string;children:ReactNode}) {
  const reduced=useReducedMotion();
  return <AnimatePresence mode="wait" initial={false}><motion.div key={id} className="route-content" initial={{opacity:0,x:reduced?0:7}} animate={{opacity:1,x:0}} exit={{opacity:0,x:reduced?0:-4}} transition={{duration:reduced?0:0.14,ease}}>{children}</motion.div></AnimatePresence>;
}
export function Segmented({items,value,onChange,label,className='',controls}:{items:{value:string;label:ReactNode}[];value:string;onChange:(value:string)=>void;label:string;className?:string;controls?:string}) {
  const id=useId();const ref=useRef<HTMLDivElement>(null);const reduced=useReducedMotion();
  return <LayoutGroup id={id}><div ref={ref} className={`segmented ${className}`} role="tablist" aria-label={label} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=items.findIndex(x=>x.value===value);const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;onChange(items[next].value);ref.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();}}>
    {items.map(item=><button type="button" role="tab" key={item.value} aria-controls={controls} aria-selected={value===item.value} tabIndex={value===item.value?0:-1} onClick={()=>onChange(item.value)}>{value===item.value&&<motion.span className="segment-indicator" layoutId="segment" transition={reduced?{duration:0}:settle}/>}<span className="segment-label">{item.label}</span></button>)}
  </div></LayoutGroup>;
}
export function PanelTransition({id,children,className='',panelId,label}:{id:string;children:ReactNode;className?:string;panelId?:string;label?:string}) {
  const reduced=useReducedMotion();
  return <AnimatePresence mode="wait" initial={false}><motion.div key={id} id={panelId} role={panelId?'tabpanel':undefined} aria-label={label} className={className} initial={{opacity:0,y:reduced?0:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-3}} transition={{duration:reduced?0:0.13,ease}}>{children}</motion.div></AnimatePresence>;
}
export function ModalHost({children,onExitComplete}:{children:ReactNode;onExitComplete?:()=>void}){return <AnimatePresence onExitComplete={onExitComplete}>{children}</AnimatePresence>;}
