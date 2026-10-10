import {test,expect} from '@playwright/test';
test('small phone, landscape, dark theme and reduced motion',async({page})=>{
  await page.goto('/#settings');await page.getByLabel('界面主题').selectOption('dark');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const viewport of [{width:375,height:667},{width:844,height:390}]){await page.setViewportSize(viewport);for(const route of ['home','atlas','custom','records','settings']){await page.goto('/#'+route);await expect(page.locator('.page')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/screenshots/dark-${viewport.width}-${route}.png`,fullPage:true});}}
  await page.goto('/#custom');await page.getByRole('button',{name:'开始练习',exact:true}).filter({visible:true}).click();await expect(page.getByRole('heading',{name:'写出对应的答案'})).toBeVisible();await page.screenshot({path:'test-results/screenshots/dark-landscape-training.png',fullPage:true});
  await expect(page.locator('.progress>span')).toHaveCSS('transition-duration','1e-05s');
});
test('public structure assets retain atom labels, charges and contain no answer labels',async({request})=>{
  const ids=['Gly','Ala','Val','Leu','Ile','Ser','Thr','Cys','Met','Asp','Glu','Asn','Gln','Lys','Arg','His','Phe','Tyr','Trp','Pro','Sec','Pyl'];
  for(const id of ids){const res=await request.get(`/structures/${id}.svg`);expect(res.status()).toBe(200);const body=await res.text();expect(body).toContain('COO⁻');expect(body).not.toMatch(/[\u4e00-\u9fff]/);expect(body).not.toContain(`>${id}<`);expect(body).toContain('viewBox="0 0 420 460"');}
  expect(await(await request.get('/structures/Sec.svg')).text()).toContain('SeH');expect(await(await request.get('/structures/Pyl.svg')).text()).toContain('NH⁺');expect(await(await request.get('/structures/Pro.svg')).text()).toContain('H₂N⁺');
  for(const id of ids){const full=await(await request.get(`/structures/${id}.svg`)).text();const compact=await(await request.get(`/structures/compact/${id}.svg`)).text();expect(compact.slice(compact.indexOf('<g'))).toBe(full.slice(full.indexOf('<g')));}
});
test('no console errors through the main pages and dialogs',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['home','atlas','custom','records','settings']){await page.goto('/#'+route);await expect(page.locator('.page')).toBeVisible();}
  await page.goto('/#atlas');await page.getByRole('button',{name:'并排对照',exact:true}).first().click();await page.keyboard.press('Escape');expect(errors).toEqual([]);
});
test('GitHub Pages subpath: route refresh, structure assets and offline navigation',async({page,context})=>{
  test.skip(!process.env.TEST_SUBPATH,'Run with TEST_SUBPATH=1 and the subpath QA server on 4174.');
  await page.goto('http://127.0.0.1:4174/amino-memory/#atlas');await page.getByRole('tab',{name:'并列浏览',exact:true}).click();await expect(page.locator('.amino-card')).toHaveCount(22);await expect.poll(()=>page.locator('.amino-card img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.reload();await expect(page.getByRole('heading',{name:'氨基酸图鉴',exact:true})).toBeVisible();await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);await page.reload();await page.getByRole('tab',{name:'并列浏览',exact:true}).click();await expect(page.locator('.amino-card')).toHaveCount(22);await expect.poll(()=>page.locator('.amino-card img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);await page.getByRole('link',{name:'开始学习',exact:true}).first().click();await expect(page.getByRole('heading',{name:'开始学习',exact:true})).toBeVisible();
});
