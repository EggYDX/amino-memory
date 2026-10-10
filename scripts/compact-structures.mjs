import { chromium } from '@playwright/test';
import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises';
const directory='public/structures';await mkdir(directory+'/compact',{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
for(const file of await readdir(directory))if(file.endsWith('.svg')){
  const source=await readFile(directory+'/'+file,'utf8');await page.setContent(source);
  const bounds=await page.locator('svg>g').evaluate(g=>{const box=g.getBBox();return {x:box.x,y:box.y,w:box.width,h:box.height};});
  const box=[Math.floor(bounds.x-12),Math.floor(bounds.y-12),Math.ceil(bounds.w+24),Math.ceil(bounds.h+24)];
  const compact=source.replace('viewBox="0 0 420 460"',`viewBox="${box.join(' ')}"`).replace('width="420" height="460"',`width="${box[2]}" height="${box[3]}"`);
  await writeFile(directory+'/compact/'+file,compact);
}
await browser.close();console.log('Created compact viewports without removing any structural content.');
