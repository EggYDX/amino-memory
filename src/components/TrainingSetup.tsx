import { ArrowRight } from 'lucide-react';
import { AMINOS, BY_ID } from '../data/amino';
import { dueMemories, poolFor } from '../core/engine';
import { LABEL, type AppData, type Config } from '../core/types';
import { questionFromKey } from '../core/learning';
import { Modal } from './Ui';
export function TrainingSetup({config,data,onClose,onStart,onConfigure,onContinue}:{config:Config;data:AppData;onClose:()=>void;onStart:()=>void;onConfigure:()=>void;onContinue:()=>void}) {
  const pool=poolFor(config,data);const due=dueMemories(data);const count=config.scope==='due'?Math.min(config.count,due.length):config.count;
  const directions=config.focusKeys?.length??pool.length*(config.mixed?8:1);
  const focusDirections=[...new Set(config.focusKeys?.map(key=>{const q=questionFromKey(key);return `${q.known.map(f=>LABEL[f]).join('＋')} → ${LABEL[q.targets[0]]}`;})??[])];
  const labels={adaptive:'自适应强化',balanced:'均衡轮换',weak:'错题强化'};
  const scopes={all:'全部项目',standard:'标准氨基酸',selected:'所选项目',favorites:'收藏',errors:'历史错题',weak:'薄弱项目',due:'到期项目'};
  return <Modal title="准备开始" onClose={onClose}>
    <dl className="training-setup"><div><dt>练习范围</dt><dd>{scopes[config.scope]} · {pool.length} 种</dd></div>
      <div><dt>考察内容</dt><dd>{config.scope==='due'?'按到期记忆方向复习':config.focusKeys?focusDirections.join('；'):config.mixed?'结构、名称与缩写交替练习':`${config.known.map(f=>LABEL[f]).join('＋')} → ${config.targets.map(f=>LABEL[f]).join('＋')}`}</dd></div>
      <div><dt>题量与策略</dt><dd>{count} 题 · {labels[config.strategy]}</dd></div></dl>
    {pool.length<AMINOS.length&&<p className="setup-range">{pool.map(id=>BY_ID[id].name).join('、')}</p>}
    {config.scope==='due'&&count<due.length&&<p className="setup-note">本轮复习 {count} 个到期方向，其余留到下一轮。</p>}
    {config.scope!=='due'&&count>directions&&<p className="setup-note">这组包含 {directions} 种题目组合，部分会重复。可以扩大范围或调整题量。</p>}
    {config.strategy==='adaptive'&&count<=pool.length&&config.scope!=='due'&&<p className="setup-note">薄弱方向会适当重练，本轮可能不会覆盖全部项目。</p>}
    {data.active&&<div className="setup-active"><strong>还有未完成的练习</strong><span>已做 {data.active.results.length} / {data.active.config.count} 题</span><button className="text-button" onClick={onContinue}>继续原练习<ArrowRight size={16}/></button></div>}
    <div className="modal-actions"><button className="button" onClick={onConfigure}>调整配置</button><button className="button primary" onClick={onStart}>{data.active?'结束原练习并开始':'开始练习'}<ArrowRight size={17}/></button></div>
    <button className="text-button setup-cancel" onClick={onClose}>取消</button>
  </Modal>;
}
