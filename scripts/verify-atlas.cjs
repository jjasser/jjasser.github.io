const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.JASSER_NODE_MODULES?path.join(process.env.JASSER_NODE_MODULES,'playwright'):'playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'validation','atlas'),canonical='https://jjasser.github.io';
const run=(exe,args)=>new Promise((resolve,reject)=>{const c=cp.spawn(exe,args,{cwd:root,windowsHide:true});let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('error',reject);c.on('close',code=>code===0?resolve(out):reject(Error(err||out)));});
const files=async dir=>{let out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);out.push(...e.isDirectory()?await files(f):[f]);}return out;};
(async()=>{
 await fs.mkdir(output,{recursive:true});const dist=await fs.mkdtemp(path.join(os.tmpdir(),'jasser-atlas-check-'));
 await run(process.env.HUGO_BIN||'hugo',['--destination',dist,'--minify','--panicOnWarning']);
 const all=await files(dist),types={'.html':'text/html','.css':'text/css','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml'};
 const server=http.createServer(async(req,res)=>{try{let f=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(f!==dist&&!f.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}if((await fs.stat(f).catch(()=>null))?.isDirectory())f=path.join(f,'index.html');const b=await fs.readFile(f).catch(()=>null);res.writeHead(b?200:404,{'Content-Type':types[path.extname(f)]||'text/plain'});res.end(b||await fs.readFile(path.join(dist,'404.html')));}catch{res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...process.env.JASSER_CHROME?{executablePath:process.env.JASSER_CHROME}:{}});
 const report={build:'passed',pages:[],redirects:[],assets:[],internalLinks:[],xml:[],interactions:[],external:[],errors:[]},targets=new Set(),assets=new Set(),external=new Set();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));
  for(const f of all.filter(f=>f.endsWith('.html'))){
   const relative=path.relative(dist,f).split(path.sep).join('/'),route='/'+relative.replace(/index\.html$/,''),html=await fs.readFile(f,'utf8');
   if(/http-equiv=["']?refresh/i.test(html)){const to=html.match(/rel=["']?canonical["']?\s+href=["']?([^"'\s>]+)/)?.[1];assert(to,route+': alias canonical');const url=new URL(to);assert.equal(url.origin,canonical);assert.equal((await page.request.get(origin+url.pathname)).status(),200);report.redirects.push({from:route,to:url.pathname});continue;}
   await page.setViewportSize({width:1440,height:1000});assert.equal((await page.goto(origin+route,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('h1').count(),1,route+': heading');assert.equal(await page.locator('main').count(),1);
   assert.equal(await page.locator('.design-dock,script[src*="preview"],.hero-cipher').count(),0);
   if(route!='/404.html'){assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),canonical+route);assert.equal(await page.locator('meta[name=robots][content*="noindex"]').count(),0);}
   assert((await page.title()).includes('Jacob Jasser'));assert(await page.locator('meta[name=description]').getAttribute('content'));
   const images=await page.locator('img').evaluateAll(ns=>ns.map(n=>({src:n.src,loaded:n.complete&&n.naturalWidth>0,alt:n.getAttribute('alt')})));
   images.forEach(i=>{assert(i.loaded,route+': '+i.src);assert.notEqual(i.alt,null);});
   for(const href of await page.locator('a[href]').evaluateAll(ns=>ns.map(n=>n.getAttribute('href')))){const u=new URL(href,origin+route);if([origin,canonical].includes(u.origin))targets.add(u.pathname+u.search+u.hash);else if(/^https?:$/.test(u.protocol))external.add(u.href);assert(!u.searchParams.has('design'));}
   (await page.locator('img[src],link[rel=stylesheet],link[rel=icon]').evaluateAll(ns=>ns.map(n=>n.src||n.href))).forEach(u=>assets.add(new URL(u).pathname));
   await page.screenshot({path:path.join(output,relative.replace(/[/\\]/g,'-')+'-desktop.png'),fullPage:true});
   for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+': overflow '+width);assert(!await page.locator('.site-header').evaluate(h=>h.querySelector('.identity').getBoundingClientRect().right>h.querySelector('nav').getBoundingClientRect().left),route+': header overlap '+width);if(width===390)await page.screenshot({path:path.join(output,relative.replace(/[/\\]/g,'-')+'-mobile.png'),fullPage:true});}
   report.pages.push({route,images:images.length,widths:[320,390,768,1440],result:'passed'});console.log('Checked '+route);
  }
  for(const target of targets){const u=new URL(target,origin);assert.equal((await page.request.get(origin+u.pathname+u.search)).status(),200,'Broken link '+target);if(u.hash){await page.goto(origin+u.pathname+u.search);assert(await page.evaluate(id=>!!document.getElementById(id),decodeURIComponent(u.hash.slice(1))),'Missing anchor '+target);}}
  report.internalLinks=[...targets];
  all.filter(f=>/\.(css|svg|png|jpe?g)$/.test(f)).forEach(f=>assets.add('/'+path.relative(dist,f).split(path.sep).join('/')));
  for(const asset of assets)assert.equal((await page.request.get(origin+asset)).status(),200,'Missing asset '+asset);report.assets=[...assets];
  for(const f of all.filter(f=>f.endsWith('.xml'))){const xml=await fs.readFile(f,'utf8');assert(!xml.includes('localhost'));assert(await page.evaluate(x=>!new DOMParser().parseFromString(x,'application/xml').querySelector('parsererror'),xml),'Malformed XML '+f);report.xml.push(path.relative(dist,f));}
  assert((await fs.readFile(path.join(dist,'robots.txt'),'utf8')).includes(canonical+'/sitemap.xml'));
  await page.setViewportSize({width:1440,height:1000});await page.goto(origin);await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
  await page.locator('.hero-actions .button').click();await page.waitForURL('**/#writing');await page.locator('.post-card h3 a').first().click();await page.waitForURL('**/post/ai-security-series-part2/');assert.equal(await page.locator('.site-header a[aria-current=page]').innerText(),'Writing');
  await page.locator('.article-toc summary').click();assert.notEqual(await page.locator('.article-toc').getAttribute('open'),null);const toc=page.locator('#TableOfContents a').first(),anchor=await toc.getAttribute('href');await toc.click();assert.equal(new URL(page.url()).hash,anchor);
  await page.locator('.prose a').filter({hasText:'Part 1'}).click();await page.waitForURL('**/post/ai-security-series-part1/');await page.locator('.article-heading .text-link').click();await page.waitForURL('**/post/');assert.equal(await page.locator('.post-card').count(),3);
  await page.locator('.site-header nav a').filter({hasText:'About'}).click();await page.waitForURL('**/about/');await page.locator('.site-footer a').filter({hasText:'Certifications'}).click();await page.waitForURL('**/about/#certifications');assert(await page.locator('#certifications').isVisible());
  assert.equal((await page.request.get(origin+'/page-that-does-not-exist/')).status(),404);await page.goto(origin+'/404.html');await page.locator('main .button').click();await page.waitForURL(origin+'/');
  report.interactions=['keyboard skip link','homepage writing jump','article card','active Writing navigation','expand table of contents','heading jump','Part 2 → Part 1','back to archive','About page','certifications jump','404 recovery'];
  const noJs=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJs.newPage();await staticPage.goto(origin+'/?design=cipher');assert.equal(await staticPage.locator('h1').count(),1);assert((await staticPage.locator('h1').innerText()).includes('Across every layer'));await staticPage.locator('.site-header nav a').filter({hasText:'Writing'}).click();assert.equal(await staticPage.locator('.post-card').count(),3);await noJs.close();report.interactions.push('navigation without JavaScript; preview query ignored');
  report.external=await Promise.all([...external].map(async url=>{try{const res=await page.request.get(url,{timeout:15000});return {url,status:res.status(),result:res.ok()?'reachable':'provider rejected automated request'};}catch(e){return {url,result:'could not verify automatically',detail:e.message.split('\n')[0]};}}));
  assert.deepEqual(report.errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));console.log('PASS: '+report.pages.length+' pages, '+targets.size+' internal targets, '+assets.size+' assets.');
 }catch(e){report.failure=e.message;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');throw e;}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
