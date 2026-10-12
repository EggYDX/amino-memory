import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BY_ID } from '../src/data/amino';
import { finish, startSession, submit } from '../src/core/engine';
import { DEFAULT_CONFIG, freshData, type AppData } from '../src/core/types';
async function read(page:Page):Promise<AppData>{return page.evaluate(async()=>new Promise(resolve=>{const req=indexedDB.open('amino-memory',1);req.onsuccess=()=>{const db=req.result;const get=db.transaction('state').objectStore('state').get('main');get.onsuccess=()=>{db.close();resolve(get.result??null);};};})) as Promise<AppData>;}
async function seed(page:Page,data:AppData){await page.evaluate(async data=>new Promise<void>((resolve,reject)=>{const req=indexedDB.open('amino-memory',1);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('state','readwrite');tx.objectStore('state').put(data,'main');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),data);await page.reload();}
async function home(page:Page){await page.goto('/#home');await expect(page.getByRole('heading',{name:'开始学习',exact:true})).toBeVisible();}
async function begin(page:Page){await page.getByRole('button',{name:'开始 22 题练习',exact:true}).click();await page.getByRole('dialog',{name:'准备开始'}).getByRole('button',{name:'开始练习',exact:true}).click();await expect(page.getByRole('button',{name:'提交答案',exact:true})).toBeVisible();}
test.beforeEach(async({page})=>{await page.setViewportSize({width:402,height:874});await home(page);});
test('preflight cancellation and configuration do not create a session; zero-answer exit creates no history',async({page})=>{
  await page.getByRole('button',{name:'开始 22 题练习',exact:true}).click();await expect(page.getByRole('dialog',{name:'准备开始'})).toBeVisible();expect((await read(page))?.active??null).toBeNull();
  await page.getByRole('button',{name:'取消',exact:true}).click();expect((await read(page))?.sessions??[]).toHaveLength(0);
  await page.getByRole('button',{name:'开始 22 题练习',exact:true}).click();await page.getByRole('button',{name:'调整配置',exact:true}).click();await expect(page.getByRole('heading',{name:'自定义训练'})).toBeVisible();expect((await read(page))?.active??null).toBeNull();
  await page.getByRole('button',{name:'开始练习',exact:true}).click();await page.getByRole('dialog',{name:'准备开始'}).getByRole('button',{name:'开始练习',exact:true}).click();await page.getByRole('button',{name:'退出练习',exact:true}).click();await page.getByRole('button',{name:'结束练习',exact:true}).click();await expect(page.getByRole('heading',{name:'开始学习',exact:true})).toBeVisible();
  await expect.poll(async()=>(await read(page)).sessions.length).toBe(0);expect((await read(page)).memories).toEqual({});
});
test('resume toast stays compact and closes in portrait, landscape, dark mode and reduced motion',async({page})=>{
  await begin(page);await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.getByRole('button',{name:'继续练习',exact:true}).click();await expect(page.getByRole('status')).toContainText('练习已恢复');
  const check=async()=>{const box=await page.locator('.toast').boundingBox();expect(box!.height).toBeLessThan(90);expect(box!.width).toBeLessThanOrEqual((page.viewportSize()?.width??402)-24);expect(box!.y).toBeGreaterThanOrEqual(0);};
  await check();await expect(page.getByRole('dialog')).toHaveCount(0);await page.screenshot({path:'test-results/screenshots/optimized-iPhone-toast.png',fullPage:true});await page.getByRole('button',{name:'关闭提示',exact:true}).click();await expect(page.locator('.toast')).toHaveCount(0);
  await page.setViewportSize({width:874,height:402});await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.getByRole('button',{name:'继续练习',exact:true}).click();await check();
});
test('Enter moves to the missing field, respects edits, and does not submit twice',async({page})=>{
  await begin(page);await expect.poll(async()=>!!(await read(page))?.active?.question).toBe(true);const q=(await read(page)).active!.question!;
  const three=page.getByRole('textbox',{name:'三字母缩写',exact:true});const one=page.getByRole('textbox',{name:'单字母缩写',exact:true});
  await three.fill(BY_ID[q.amino].three);await three.press('Enter');await expect(one).toBeFocused();expect((await read(page)).active!.results).toHaveLength(0);
  await one.press('Enter');await expect(page.locator('.field-error')).toContainText('请填写单字母缩写');
  await one.fill(BY_ID[q.amino].one);await three.fill('');await one.press('Enter');await expect(three).toBeFocused();expect((await read(page)).active!.results).toHaveLength(0);
  await three.fill(BY_ID[q.amino].three);await three.press('Enter');await expect(one).toBeFocused();await one.press('Enter');await expect(page.getByText('全部正确',{exact:true})).toBeVisible();
  await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect.poll(async()=>(await read(page)).active!.results.length).toBe(1);expect((await read(page)).active!.question!.id).toBe(q.id);
});
test('browser back uses the exit flow, cancellation restores the same question and partial exit is labeled',async({page})=>{
  await begin(page);await expect.poll(async()=>!!(await read(page))?.active).toBe(true);const id=(await read(page)).active!.question!.id;
  await page.goto('/#atlas');await expect(page.getByRole('heading',{name:'退出本次练习'})).toBeVisible();await page.getByRole('button',{name:'继续本次练习',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect((await read(page)).active!.question!.id).toBe(id);
  await page.getByRole('button',{name:'跳过',exact:true}).click();await page.locator('.training-back').click();await page.getByRole('button',{name:'结束并查看成绩',exact:true}).click();await expect(page.getByRole('heading',{name:'练习已结束',exact:true})).toBeVisible();await expect(page.locator('.score-main')).not.toContainText('0 / 0');await expect(page.locator('.summary-note')).toContainText('已完成 1 / 22 题');
});
test('existing empty records are hidden without deleting data; confusion opens analysis and waits for confirmation',async({page})=>{
  let data=freshData();data.active=startSession({...DEFAULT_CONFIG,scope:'selected',selected:['Ser'],count:5},data);data.active.draft={three:'Trp',one:'W'};data=finish(submit(data,'answer'));
  const empty={...startSession(DEFAULT_CONFIG,data),ended:new Date().toISOString(),question:null};data.sessions.push(empty);await page.goto('/#records');await seed(page,data);
  await expect(page.locator('.history-row')).toHaveCount(1);await expect(page.locator('.history-row')).toContainText('提前结束');await expect(page.locator('.history-row')).not.toContainText('全部正确');expect((await read(page)).sessions).toHaveLength(2);
  await page.getByRole('button',{name:'Ser/Trp · 1 次'}).click();await expect(page.getByRole('dialog',{name:'混淆分析'})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('你的答案：Trp');expect((await read(page)).active).toBeNull();
  await page.getByRole('button',{name:'配置针对性练习'}).click();await expect(page.getByRole('dialog',{name:'准备开始'})).toBeVisible();await expect(page.getByRole('dialog',{name:'准备开始'})).toContainText('色氨酸');expect((await read(page)).active).toBeNull();await page.getByRole('button',{name:'取消',exact:true}).click();expect((await read(page)).active).toBeNull();
});
test('atlas numeric focus and independent visibility stay consistent in detail, enlargement and comparison',async({page})=>{
  await page.goto('/#atlas');await page.getByRole('combobox',{name:'分类筛选'}).selectOption('properties');await expect(page.locator('.specimen-index button')).toHaveCount(5);
  await page.getByRole('textbox',{name:'搜索氨基酸'}).fill('Lys');await expect(page.locator('.chemical-values')).toContainText('10.53');await expect(page.locator('.chemical-values')).toContainText('9.74');
  await page.getByRole('button',{name:'显示内容',exact:true}).click();await page.getByLabel('pKₐ(R)',{exact:true}).uncheck();await page.getByRole('button',{name:'显示内容',exact:true}).click();await expect(page.locator('.chemical-values')).not.toContainText('10.53');await expect(page.locator('.chemical-values')).toContainText('9.74');
  await page.getByRole('button',{name:'放大当前结构'}).click();await expect(page.getByRole('dialog')).not.toContainText('10.53');await expect(page.getByRole('dialog')).toContainText('9.74');await page.getByRole('button',{name:'关闭弹窗'}).click();
  await page.getByRole('button',{name:'显示内容',exact:true}).click();await page.getByRole('button',{name:'隐藏全部答案',exact:true}).click();await page.getByRole('button',{name:'并排对照',exact:true}).click();await expect(page.locator('.compare-grid')).not.toContainText('天冬');await expect(page.locator('.compare-grid')).not.toContainText('Asp');await expect(page.locator('.compare-picks')).not.toContainText('天冬');
  await page.getByRole('dialog').getByRole('button',{name:'揭晓答案',exact:true}).first().click();await expect(page.locator('.compare-grid').first()).toContainText('10.53');await page.getByRole('button',{name:'关闭弹窗'}).click();
});
test('long classification labels, optional notes and dark mode remain readable without overflow',async({page})=>{
  await page.goto('/#settings');await page.getByLabel('界面主题').selectOption('dark');await page.goto('/#atlas');await page.getByRole('tab',{name:'并列浏览',exact:true}).click();await expect(page.locator('.amino-card')).toHaveCount(22);
  for(const width of [320,375,402,874]){await page.setViewportSize({width,height:width===874?402:874});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize({width:402,height:874});await page.getByRole('textbox',{name:'搜索氨基酸'}).fill('Met');await expect(page.locator('.amino-card')).toHaveCount(1);await page.getByText('侧链特点',{exact:true}).click();await expect(page.locator('.property-notes')).toContainText('本教材归为极性不带电');await expect(page.locator('.amino-card .category-tag')).toHaveText('极性不带电');
  await page.screenshot({path:'test-results/screenshots/optimized-mobile-atlas.png',fullPage:true});const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
});
test('training title and placeholders never reveal hidden answers even with an old named preset',async({page})=>{
  const data=freshData();data.active=startSession({...DEFAULT_CONFIG,title:'Ile / I 专项',scope:'selected',selected:['Ile']},data);await page.goto('/#training');await seed(page,data);await page.getByRole('button',{name:'继续练习',exact:true}).click();
  await expect(page.locator('.training-header')).not.toContainText('Ile');await expect(page.locator('.training-header')).not.toContainText('专项');await expect(page.getByRole('textbox',{name:'三字母缩写'})).toHaveAttribute('placeholder','输入三字母缩写');await expect(page.locator('.question-prompt img')).toHaveAttribute('alt','氨基酸结构图');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations).toEqual([]);
});
test('IBM Plex Mono loads locally and remains available in an offline production session',async({page,context})=>{
  await page.goto('/#atlas');await page.getByRole('textbox',{name:'搜索氨基酸'}).fill('Ile');await expect.poll(()=>page.evaluate(()=>document.fonts.check('20px "IBM Plex Mono"'))).toBe(true);await expect(page.locator('.specimen-caption dd').last()).toHaveText('I');
  await expect.poll(()=>page.locator('.specimen-figure').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');await expect.poll(()=>page.locator('.specimen-figure img').evaluate(img=>(img as HTMLImageElement).naturalWidth>0)).toBe(true);await page.screenshot({path:'test-results/screenshots/optimized-Ile-font.png',fullPage:true});await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'氨基酸图鉴',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.fonts.check('20px "IBM Plex Mono"'))).toBe(true);
});

test('mobile atlas keeps the current structure, identifiers, numeric values and notes above navigation',async({page})=>{
  await page.goto('/#atlas');await expect(page.getByRole('button',{name:'显示内容',exact:true})).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('group',{name:'图鉴显示字段'})).toHaveCount(0);
  const check=async()=>{await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);const card=await page.locator('.specimen-detail').boundingBox();const nav=await page.locator('.mobile-nav').boundingBox();expect(card!.y+card!.height).toBeLessThanOrEqual(nav!.y);};
  await check();await page.getByRole('combobox',{name:'分类筛选'}).selectOption('properties');await expect(page.locator('.specimen-index button')).toHaveCount(5);await check();
  await page.locator('.specimen-index').getByRole('button',{name:'His 组氨酸',exact:true}).click();await expect(page.locator('.specimen-caption h2')).toHaveText('组氨酸');await page.locator('.property-notes summary').click();await check();
  await page.screenshot({path:'test-results/screenshots/optimized-atlas-one-screen.png',fullPage:true});await page.getByRole('button',{name:'显示内容',exact:true}).click();await expect(page.getByRole('group',{name:'图鉴显示字段'})).toBeVisible();await expect(page.locator('.visibility-popover')).toHaveCSS('opacity','1');await page.screenshot({path:'test-results/screenshots/optimized-atlas-fields.png',fullPage:true});
});
test('font fallback remains legible and usable when the local font request fails',async({browser,baseURL,page:loaded})=>{
  await loaded.evaluate(()=>document.fonts.ready);const glyph=await loaded.evaluate(()=>{
    const paint=(letter:string)=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.font='72px "IBM Plex Mono"';ctx.fillText(letter,20,100);const pixels=ctx.getImageData(0,0,128,128).data;const widths:number[]=[];for(let y=0;y<128;y++){const xs=[];for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>120)xs.push(x);if(xs.length)widths.push(xs.at(-1)!-xs[0]+1);}return {widths,image:canvas.toDataURL()};};
    return {capital:paint('I'),lower:paint('l'),digit:paint('1')};
  });
  const widths=glyph.capital.widths;const middle=widths[Math.floor(widths.length/2)];expect(Math.max(...widths.slice(0,Math.floor(widths.length/3)))).toBeGreaterThan(middle*1.5);expect(Math.max(...widths.slice(Math.ceil(widths.length*2/3)))).toBeGreaterThan(middle*1.5);expect(new Set([glyph.capital.image,glyph.lower.image,glyph.digit.image]).size).toBe(3);
  const context=await browser.newContext({baseURL,viewport:{width:402,height:874},serviceWorkers:'block'});const page=await context.newPage();
  await page.route('**/fonts/*.woff2',route=>route.abort());await page.goto('/#atlas');await page.getByRole('textbox',{name:'搜索氨基酸'}).fill('Ile');await expect(page.locator('.specimen-caption dd').last()).toHaveText('I');
  await expect.poll(()=>page.evaluate(()=>document.fonts.status)).toBe('loaded');expect(await page.evaluate(()=>document.fonts.check('20px "IBM Plex Mono"'))).toBe(false);
  await expect(page.locator('.specimen-caption dd').last()).toHaveCSS('font-family',/Courier New/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/screenshots/optimized-font-fallback.png',fullPage:true});await context.close();
});
test('single-input Enter shows inline validation and then submits once',async({page})=>{
  await page.getByRole('button',{name:'缩写互相转换',exact:true}).click();await begin(page);const input=page.getByRole('textbox',{name:'单字母缩写',exact:true});await input.press('Enter');await expect(page.locator('.field-error')).toContainText('请填写单字母缩写');
  const q=(await read(page)).active!.question!;await input.fill(BY_ID[q.amino].one);await input.press('Enter');await expect(page.getByText('全部正确',{exact:true})).toBeVisible();await expect.poll(async()=>(await read(page)).active!.results.length).toBe(1);
});
