import { defineConfig, devices } from '@playwright/test';
const port=Number(process.env.TEST_PORT||4173);
export default defineConfig({
  testDir:'./tests', fullyParallel:false, timeout:60000, retries:0,
  reporter:[['list']], outputDir:'test-results',
  use:{baseURL:`http://127.0.0.1:${port}`,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},...(process.env.TEST_WEBKIT?[{name:'webkit',testMatch:/optimization\.spec\.ts/,use:{...devices['iPhone 13 Pro'],viewport:{width:402,height:874},deviceScaleFactor:3}}]:[])],
  webServer:{command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:process.env.TEST_REUSE==='1'},
});
