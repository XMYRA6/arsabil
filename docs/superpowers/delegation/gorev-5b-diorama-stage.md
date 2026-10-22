# Görev 5b — DioramaStage bileşeni

Sen bir kıdemli React/TypeScript geliştiricisisin. Next.js 16 + React 19, CSS Modules. Aşağıdaki testlerin TAMAMI geçmeli. Testleri değiştirme.

## Kurallar
- Her bileşen `src/components/ui/` altında `X.tsx` + `X.module.css`. Named export (`export const X` ya da `export function X`). `React.FC` kullanma.
- Renkleri ASLA hex yazma; yalnızca bu CSS değişkenleri: `--ink --ink-secondary --line --surface --surface-2 --canvas --amber --amber-text --amber-soft --blue --blue-on --blue-soft --ok --bad --radius-pill --radius-card --radius-field --shadow-card --ease-out --ease-in-out --dur-press --dur-ui --focus-ring`. Siyah (#000) yok, gradient yok, `transition: all` yok.
- Hareket: yalnız `transform`/`opacity`/`background-color`/`color`/`border-color` geçişi; süre `var(--dur-press)` (basma) ve `var(--dur-ui)`; eğri `var(--ease-out)`. Basma: `:active { transform: scale(0.97) }`.
- Hover yalnız `@media (hover: hover) and (pointer: fine)` içinde.
- `@media (prefers-reduced-motion: reduce)` içinde `transition: none; transform: none`.
- Odak: `:focus-visible { outline: none; box-shadow: var(--focus-ring) }`.
- Mobilde (`max-width: 768px`) dokunma hedefi min 44px yükseklik (Button ve Chip, SegmentedControl öğeleri).
- Sınıf adı testleri regex ile bakıyor: CSS Modules `identity-obj-proxy` ile anahtar adını aynen döndürür. Bu yüzden sınıflara tam bu adları ver: Button → `primary secondary tertiary amber sizeS sizeM sizeL fullWidth`, Badge → `badge neutral ok bad amber blue`, Chip → `chip selected`.

## Ek kurallar
- Bu görevde renk gereken yerlerde yalnız tokenlar; hava efektlerinin RENKLERİ (yağmur çizgisi, kar, bulut gölgesi, parıltı) fiziksel efekt olduğu için `rgba()` serbest. Efekt renkleri CSS değişkenine koyma, kanvas için JS'te sabit.
- Animasyonlar: yalnız `transform` ve `opacity`. CSS animasyonları (rüzgâr, parıltı, bulut) CSS Modules `@keyframes`. Eğriler `var(--ease-in-out)` / `var(--ease-out)`.
- `@media (prefers-reduced-motion: reduce)` ve `motion="off"` durumunda hareketli katmanlar HİÇ render edilmez (CSS ile gizleme değil; testler DOM'da yokluğa bakıyor).
- Ekran dışındayken (IntersectionObserver, yoksa görünür varsay) ve sekme gizliyken (`document.hidden`) CSS animasyonları `animation-play-state: paused` (kök veri niteliği `data-paused`) ve kanvas döngüsü durur.
- `window.matchMedia('(prefers-reduced-motion: reduce)')` jsdom'da testlerde mock'lanır; ek olarak dinleyiciyi (`addEventListener('change')`) güvenle kullan (mock'ta no-op var).
- `canvas.getContext('2d')` null dönebilir (jsdom): null ise sessizce çizim yapma.
- Referans: aşağıdaki çalışan prototip (`hero-prototype.html`) davranışın kaynağıdır; CSS'i ve JS'i React'e ve CSS Modules'a taşı, değerleri (süreler, açılar, yoğunluklar) koru. Prototipteki `.tag` (fiyat etiketi), paralaks ve demo kontrol çubuğu bu görevin DIŞINDA.


## Yazılacak dosyalar
2. `src/components/home/DioramaStage.tsx` + `DioramaStage.module.css` — `'use client'`. Props: `{ scene: SceneValue; weather: 'gunesli'|'bulutlu'|'yagmurlu'|'karli'; motion?: 'auto'|'off'; className?: string }`. `resolveScene(scene)` ile çözümle; `getFx(resolved.id)` ile veri al. Kök: `<div data-testid="diorama-stage" data-scene-id data-weather data-motion="on|off" [data-paused]>`; `motion==='off'` veya reduced-motion ise `data-motion="off"` ve hareketli katmanlar yok.
   Katmanlar (hepsi kökün içinde, aynı oranlı `.pic` kabında `position:absolute; inset:0`; kap `aspect-ratio` = resolved.aspect):
   - poster `<img>` (src1600, srcSet 800w/1600w, alt = `${etiket} · ${egim==='yamac'?'yamaç':'düz'} · ${zaman==='gece'?'gece':'gündüz'}`).
   - `data-layer="weather-variant"`: yağmurlu → fx.weather.wet, karlı → fx.weather.snow; yalnız fx.weather varsa. `<img>`; opacity 0→1 geçişi 900ms `var(--ease-out)` (mount sonrası bir kare gecikmeyle `data-on` ile).
   - `data-layer="sway"` (her ağaç için bir `div`): poster kopyasını `background-image` olarak taşır (resolved.src1600; yağmur/karda varyant görselinin kopyası ek bir iç katman olarak ya da `background-image` değişimiyle — basit tut: aynı div, hava varyantı varsa onun src'si), `transform-origin: b[0]*100% b[1]*100%`, `mask-image: radial-gradient(ellipse rx% ry% at cx% cy%, #000 58%, transparent 100%)` (+ -webkit-), `animation: sway calc(5.2s / spd) var(--ease-in-out) infinite alternate` ile `rotate()`; genlik `a * w` derece (`w`: güneşli .8, bulutlu 1, yağmurlu 1.5, karlı .45; `spd`: yağmurlu 1.5, karlı .7, diğer 1), faz gecikmesi negatif `-d` sn. Değişkenler inline `style` ile CSS custom property (`--a`, `--w`, `--spd`, `--dl`).
   - `data-layer="cloud"`: yalnız gündüz; `mask-image: url(src1600)` (diorama silüetine maskeli), içinde iki radial-gradient'li `i` kaydırılır (34sn, `drift` keyframes, ease-in-out alternate). Hava `bulutlu`/`yagmurlu` iken içeri ek `b` örtü katmanı opacity .55/.95; `karli` .3.
   - `data-layer="glint"` (gündüz, hava gunesli|bulutlu, her fx.water noktası için bir `i`, `left/top %`, gecikme `(i*.53)%3.2` sn, `twinkle` 3.2sn).
   - `data-layer="lamp"` (gece, her fx.glow için `[x,y,boyut]`: çap % = `min(4.2,max(1.4, sqrt(boyut)*.2))`, `breathe` 4.6sn, gecikme `(i*.7)%4.6`).
   - `data-layer="crop-wave"`: `fx.crop` varsa ve hava `karli` değilse; `mask-image: url(fx.crop)`; iki `i` açık bant, `gust` 7sn / 5.2sn (yağmurda 3.6sn); gündüz ılık, gece mavimsi.
   - `data-layer="particles"`: `<canvas>` kökü kaplar (`position:absolute; inset:0; pointer-events:none`), yalnız hava yağmurlu|karlı. Döngü `requestAnimationFrame`; DPR en fazla 2; `ResizeObserver` ile boyut (yoksa pencere boyutu). Yağmur: 360 damla, 3 derinlik bandı (z/3 aralıkları), `rainBand`, eğim `tilt = .20 + .30*windAt(clock)`, çizgi renk gündüz `92,114,140` gece `200,218,245`, alpha `rainBand.alpha * yoğunluk`. Zemin sıçraması: dt*46*yoğunluk olasılıkla, `fx.surface` noktalarından (poster kabının piksel koordinatına çevrilmiş: x*genişlik, y*yükseklik) rastgele biri seçilip elips halka + iki zerre, 420ms. Kar: 340 tane, `snowKind` bantlarına göre küçük keskin / orta / büyük yumuşak sprite (radial gradient ile `createElement('canvas')` sprite, gece/gündüz ayrı), alpha far .55 mid .8 near .5. Yoğunluk `easeIntensity` ile hedefe yaklaşır; hedef 0'a inince çizim durur ve kanvas temizlenir. Rastgelelik `createRng` (sabit tohum).
   Efektler hareket kapalıyken (reduced/off) HİÇ eklenmez; hava varyantı (`weather-variant`) ise statik olarak gösterilir.
   Verisi olmayan sahnede (getFx boş): ağaç/su/lamba/varyant/ürün katmanı yok ama poster ve (gündüzse) bulut + (yağmur/kar ise) kanvas çalışabilir.


## Hazır modüller (import et, yeniden yazma)
```ts
// '@/lib/dioramas/scene'
export type Tur = 'arsa'|'tarla'|'villa'|'ticari'|'bag'|'kat'; export type Egim = 'duz'|'yamac'; export type Zaman = 'gunduz'|'gece'
export interface SceneValue { tur: Tur; varyant: string; egim: Egim; zaman: Zaman }
export function resolveScene(q: SceneValue-benzeri {tur, varyant?, egim, zaman}): { id: string; tur; varyant; egim; zaman; egimYedek: boolean; src800: string; src1600: string; aspect: number; etiket: string }
// '@/lib/dioramas/fx/fx'
export interface Tree {
  /** taç merkezi (0-1) */ c: [number, number]
  /** taç yarıçapı (0-1) */ r: [number, number]
  /** sallanma pivotu: gövde tabanı (0-1) */ b: [number, number]
  /** genlik çarpanı */ a: number
  /** faz gecikmesi (sn) */ d: number
}
export type Point = [number, number]
/** [x, y, boyut(piksel sayısı)] */
export type Glow = [number, number, number]

export interface SceneFx {
  trees: Tree[]
  water: Point[]
  glow: Glow[]
  surface: Point[]
  weather: { snow: string; wet: string } | null
  crop: string | null
}

export function getFx(sceneId: string): SceneFx  // verisi olmayan sahne için boş katmanlar
// '@/lib/dioramas/fx/particles' (hazır)
export function createRng(seed:number): ()=>number; export function windAt(t:number):number
export function rainBand(z:number): {len:number;speed:number;width:number;alpha:number}
export type Drop={x:number;y:number;z:number}; export function createRain(n:number,rng:()=>number):Drop[]
export function stepRain(drops:Drop[],dt:number,height:number,width:number,tilt:number,rng:()=>number):void
export type Flake={x:number;y:number;z:number;p:number;f:number;s:number}; export function createSnow(n:number,rng:()=>number):Flake[]
export function snowKind(z:number):'far'|'mid'|'near'
export function stepSnow(flakes:Flake[],dt:number,clock:number,wind:number,height:number,width:number,rng:()=>number):void
export function easeIntensity(cur:number,target:number,dt:number):number
```

## Referans (çalışan prototipten CSS ve JS; davranış kaynağı)
```css

:root{
  --ease-out:cubic-bezier(0.23,1,0.32,1);
  --ease-in-out:cubic-bezier(0.77,0,0.175,1);
  --bg-top:#E4EEF2;--bg-bot:#F4F1EA;--ink:#2F3B34;--sec:#6A7268;--line:#DDD6C6;--glass:rgba(255,255,255,.85);--amber:#E5A52B;
}
body[data-time="gece"]{--bg-top:#1B2B4A;--bg-bot:#0F1A2E;--ink:#F3F1EC;--sec:#9AA3B2;--line:#26324A;--glass:rgba(22,35,59,.88);--amber:#F2B84B}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:var(--ink);background:linear-gradient(var(--bg-top),var(--bg-bot) 70%) fixed;min-height:100vh}
.bar{display:flex;gap:24px;flex-wrap:wrap;align-items:center;padding:16px 24px;font-size:13px}
.bar b{color:var(--sec);font-weight:600;margin-right:8px}
.seg{display:inline-flex;background:var(--glass);border:1px solid var(--line);border-radius:999px;padding:3px}
.seg button{all:unset;cursor:pointer;padding:6px 14px;border-radius:999px;font-size:13px;color:var(--sec);transition:background-color .15s ease,color .15s ease,transform .15s var(--ease-out)}
.seg button[aria-pressed="true"]{background:var(--amber);color:#0F1A2E;font-weight:600}
.seg button:active{transform:scale(.97)}
.stage{position:relative;width:min(1040px,94vw);margin:12px auto 24px;aspect-ratio:1040/700}
.halo{position:absolute;inset:8% 6%;border-radius:50%;background:radial-gradient(closest-side,rgba(229,165,43,.16),transparent 70%);will-change:transform}
body[data-time="gece"] .halo{background:radial-gradient(closest-side,rgba(76,141,255,.14),transparent 70%)}
.scene{position:absolute;inset:0;display:grid;place-items:center;will-change:transform}
.pic{position:relative;width:100%;aspect-ratio:var(--ar);max-height:100%}
.pic img,.pic .fx{position:absolute;inset:0;width:100%;height:100%}
.pic img{object-fit:contain;transition:opacity .4s var(--ease-out)}
.pic img[data-off]{opacity:0}
/* bulut gölgesi: diorama silüetine maskelenir, içindeki katman kayar */
.cloud{-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;overflow:hidden;pointer-events:none}
.cloud i{position:absolute;inset:-20% -40%;background:
  radial-gradient(26% 22% at 30% 40%,rgba(15,26,46,.30),transparent 100%),
  radial-gradient(20% 18% at 62% 58%,rgba(15,26,46,.22),transparent 100%);
  animation:drift 34s var(--ease-in-out) infinite alternate;will-change:transform}
body[data-time="gece"] .cloud{display:none}
@keyframes drift{from{transform:translate3d(-14%,2%,0)}to{transform:translate3d(14%,-2%,0)}}
.glint,.lamp{position:absolute;border-radius:50%;pointer-events:none;opacity:0}
.glint{width:.7%;aspect-ratio:1;background:#fff;box-shadow:0 0 8px 3px rgba(255,255,255,.75);transform:translate(-50%,-50%) scale(.5);animation:twinkle 3.2s var(--ease-in-out) infinite}
@keyframes twinkle{0%,70%,100%{opacity:0;transform:translate(-50%,-50%) scale(.5)}35%{opacity:.95;transform:translate(-50%,-50%) scale(1)}}
.lamp{background:radial-gradient(closest-side,rgba(255,196,102,.75),rgba(255,196,102,0));transform:translate(-50%,-50%);animation:breathe 4.6s var(--ease-in-out) infinite;mix-blend-mode:screen}
@keyframes breathe{0%,100%{opacity:.45}50%{opacity:.95}}
body[data-time="gece"] .glint{display:none}
/* rüzgâr: ağaç tacı kopyası, gövde tabanından sallanır (yumuşak kenarlı maske) */
.sway{background-size:100% 100%;background-repeat:no-repeat;pointer-events:none;will-change:transform;
  animation:sway calc(5.2s / var(--spd,1)) var(--ease-in-out) var(--dl,0s) infinite alternate}
@keyframes sway{0%{transform:rotate(calc(var(--a,1) * var(--w,.8) * -1deg))}38%{transform:rotate(calc(var(--a,1) * var(--w,.8) * .55deg))}100%{transform:rotate(calc(var(--a,1) * var(--w,.8) * 1deg))}}
body[data-wx="bulutlu"]{--w:1}body[data-wx="yagmurlu"]{--w:1.5;--spd:1.5}body[data-wx="karli"]{--w:.45;--spd:.7}
/* hava: örtü katmanı (diorama alfasına maskeli) */
.cloud b{position:absolute;inset:0;opacity:0;transition:opacity .6s var(--ease-out);
  background:radial-gradient(70% 60% at 50% 30%,rgba(30,42,60,.34),rgba(30,42,60,.22))}
body[data-wx="bulutlu"] .cloud b{opacity:.55}body[data-wx="yagmurlu"] .cloud b{opacity:.95}body[data-wx="karli"] .cloud b{opacity:.3}
body[data-time="gece"] .cloud{display:block}
body[data-time="gece"] .cloud i{display:none}
/* rüzgâr dalgası: buğday ve asma/bahçe yaprağı üzerinde açık bantlar kayar (ürün maskesine kırpılı) */
.wave{display:none;overflow:hidden;pointer-events:none;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.wave.on{display:block}
.wave i{position:absolute;inset:0 -60%;mix-blend-mode:screen;will-change:transform;
  background:linear-gradient(105deg,transparent 40%,rgba(255,240,190,.26) 50%,transparent 60%);animation:gust 7s var(--ease-in-out) infinite}
.wave i.b{background:linear-gradient(98deg,transparent 44%,rgba(255,240,190,.16) 50%,transparent 56%);animation-duration:5.2s;animation-delay:-2.4s}
body[data-time="gece"] .wave i{background:linear-gradient(105deg,transparent 40%,rgba(160,190,245,.16) 50%,transparent 60%)}
body[data-time="gece"] .wave i.b{background:linear-gradient(98deg,transparent 44%,rgba(160,190,245,.10) 50%,transparent 56%)}
@keyframes gust{from{transform:translate3d(-30%,0,0)}to{transform:translate3d(30%,0,0)}}
body[data-wx="yagmurlu"] .wave i{animation-duration:3.6s}
body[data-wx="karli"] .wave{display:none}
body[data-motion="off"] .wave{display:none!important}
@media (prefers-reduced-motion:reduce){.wave{display:none!important}}
/* hava: parçacıklar tek canvas'ta; diorama ıslak/kar örtülü sürümüne geçer */
.wxc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
.pic .wv{opacity:0;transition:opacity .9s var(--ease-out)}
body[data-wxv="wet"] .pic .wv,body[data-wxv="snow"] .pic .wv{opacity:1}
.sway i{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat}
.sway i.s1{opacity:0;transition:opacity .9s var(--ease-out)}
body[data-wxv="wet"] .sway i.s1,body[data-wxv="snow"] .sway i.s1{opacity:1}
body[data-wx="karli"] .cloud b{opacity:1;background:rgba(236,243,250,.20)}
body[data-wx="yagmurlu"] .glint,body[data-wx="karli"] .glint{display:none}
body[data-motion="off"] .wxc,body[data-motion="off"] .sway{display:none}
@media (prefers-reduced-motion:reduce){.wxc,.sway{display:none}}
.tag{position:absolute;z-index:3;left:5%;top:14%;display:flex;gap:10px;align-items:baseline;padding:12px 20px;border-radius:999px;background:var(--glass);border:1px solid var(--line);box-shadow:0 10px 30px rgba(26,20,8,.12);font-size:28px;font-weight:700;opacity:0}
.tag small{font-size:14px;font-weight:500;color:var(--sec)}
.tag::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--amber);align-self:center}
/* giriş: bir kez, ease-out, kademeli */
.stage[data-ready] .pic{animation:enter .42s var(--ease-out) both}
.stage[data-ready] .tag{animation:tagin .22s var(--ease-out) .30s forwards}
@keyframes enter{from{opacity:0;transform:translate3d(0,12px,0) scale(.97)}to{opacity:1;transform:none}}
@keyframes tagin{from{opacity:0;transform:translate3d(0,6px,0)}to{opacity:1;transform:none}}
.stage[data-paused] .cloud i,.stage[data-paused] .glint,.stage[data-paused] .lamp{animation-play-state:paused}
/* hareketi azalt: poster + sabit etiket; kayma, parıltı, paralaks yok */
body[data-motion="off"] .cloud,body[data-motion="off"] .glint,body[data-motion="off"] .lamp{display:none}
body[data-motion="off"] .pic,body[data-motion="off"] .tag{animation:none!important;opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){
  .cloud,.glint,.lamp{display:none}
  .stage[data-ready] .pic{animation:fade .2s ease both}
  .stage[data-ready] .tag{animation:fade .2s ease .1s both}
}
@keyframes fade{from{opacity:0}to{opacity:1}}
.note{max-width:1040px;margin:0 auto 40px;padding:0 24px;color:var(--sec);font-size:13px;line-height:1.6}

```
```js
<script>
const $=s=>document.querySelector(s), body=document.body, st=$('#stage');
const state={tur:'arsa_agacli',zaman:'gunduz',wx:'gunesli'};
const key=()=>`${state.tur}_duz_${state.zaman}`;
const url=k=>`../dioramas/webp/${k}-1600.webp`;
let front='imgA';
function render(first){
  const k=key(), hs=HOTSPOTS[k]; body.dataset.time=state.zaman;
  $('#pic').style.setProperty('--ar',hs.aspect);
  const next=front==='imgA'?'imgB':'imgA', n=$('#'+next), f=$('#'+front);
  $('#sways').innerHTML='';
  const wv=$('#wave'), crop=/^(tarla_bugday|bag_asma)_/.test(k);
  wv.classList.toggle('on',crop);
  if(crop) wv.style.webkitMaskImage=wv.style.maskImage=`url(weather/${k}-crop.webp)`;
  if(first){f.removeAttribute('data-off');f.src=url(k);f.onload=()=>sways(k);}
  else{n.onload=()=>{n.removeAttribute('data-off');f.setAttribute('data-off','');front=next;sways(k);};n.src=url(k);}
  const cloud=$('#cloud'); cloud.style.webkitMaskImage=cloud.style.maskImage=`url(${url(k)})`;
  const sp=$('#spots'); sp.innerHTML='';
  if(state.zaman==='gunduz') hs.water.forEach((p,i)=>{const e=document.createElement('i');e.className='glint';e.style.cssText=`left:${p[0]*100}%;top:${p[1]*100}%;animation-delay:${(i*0.53)%3.2}s`;sp.appendChild(e);});
  else hs.glow.forEach((p,i)=>{const d=Math.min(4.2,Math.max(1.4,Math.sqrt(p[2])*0.2));const e=document.createElement('i');e.className='lamp';e.style.cssText=`left:${p[0]*100}%;top:${p[1]*100}%;width:${d}%;aspect-ratio:1;animation-delay:${(i*0.7)%4.6}s`;sp.appendChild(e);});
}
function sways(k){
  const box=$('#sways'); box.innerHTML='';
  (TREES[k]||[]).forEach(t=>{
    const e=document.createElement('div'); e.className='fx sway';
    const [cx,cy]=t.c.map(v=>v*100), [rx,ry]=t.r.map(v=>v*100);
    e.style.cssText=`transform-origin:${t.b[0]*100}% ${t.b[1]*100}%;--a:${t.a};--dl:${-t.d}s;`+
      `-webkit-mask-image:radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%,#000 58%,transparent 100%);mask-image:radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%,#000 58%,transparent 100%)`;
    e.innerHTML=`<i class="s0" style="background-image:url(${url(k)})"></i><i class="s1"></i>`;
    box.appendChild(e);
  });
  applyVariant();
}
// hava varyantı: yağmurda ıslak, karda kar örtülü diorama (önceden üretilmiş); ağaç kopyaları dahil
const variantOf=()=>state.wx==='yagmurlu'?'wet':state.wx==='karli'?'snow':'';
function applyVariant(){
  const v=variantOf(), k=key(), img=$('#imgW');
  if(!v){body.dataset.wxv='';return;}
  const src=`weather/${k}-${v}.webp`;
  document.querySelectorAll('.sway .s1').forEach(e=>e.style.backgroundImage=`url(${src})`);
  if(img.getAttribute('src')===src&&img.complete){body.dataset.wxv=v;return;}
  img.onload=()=>{body.dataset.wxv=v;}; img.src=src;
}
/* ---- hava parçacıkları (canvas 2D, derinlik bantlı) ---- */
const cv=$('#wxc'), c2=cv.getContext('2d'); let CW=0,CH=0,DPR=1;
const sizeCanvas=()=>{const r=st.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);CW=r.width;CH=r.height;cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);};
new ResizeObserver(sizeCanvas).observe(st); sizeCanvas();
const R=(a,b)=>a+Math.random()*(b-a);
const drops=Array.from({length:360},()=>({x:R(-.1,1.1),y:R(0,1),z:Math.random()}));
const flakes=Array.from({length:340},()=>({x:R(0,1),y:R(0,1),z:Math.random(),p:R(0,6.28),f:R(.6,1.4),s:Math.random()}));
const splashes=[];
const sprite=(blur,day)=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  if(day){const h=g.createRadialGradient(32,34,2,32,34,30);h.addColorStop(0,'rgba(95,120,155,.30)');h.addColorStop(1,'rgba(95,120,155,0)');g.fillStyle=h;g.fillRect(0,0,64,64);}
  const r=g.createRadialGradient(32,32,0,32,32,blur?30:20);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(blur?.15:.55,'rgba(255,255,255,'+(blur?.55:.95)+')');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;};
const SPR={dayS:sprite(false,true),dayB:sprite(true,true),nightS:sprite(false,false),nightB:sprite(true,false)};
const wind=t=>Math.sin(t*.35)*.5+Math.sin(t*.91+1.3)*.25;
const inten={rain:0,snow:0}; let tgt={rain:0,snow:0}, last=0, loopId=0, clock=0;
// dioramanın yüzey noktası (yağmur sıçraması için), sahne koordinatında
const surfaceXY=()=>{const pts=SURFACE[key()];if(!pts)return null;const p=pts[(Math.random()*pts.length)|0];
  const a=$('#pic').getBoundingClientRect(), b=st.getBoundingClientRect();
  return [a.left-b.left+p[0]*a.width, a.top-b.top+p[1]*a.height];};
function frame(ts){
  loopId=0; const dt=Math.min(.05,(ts-last)/1000||.016); last=ts; clock+=dt;
  for(const k of ['rain','snow']) inten[k]+=(tgt[k]-inten[k])*Math.min(1,dt*3);
  const night=body.dataset.time==='gece', w=wind(clock);
  c2.setTransform(DPR,0,0,DPR,0,0); c2.clearRect(0,0,CW,CH);
  if(inten.rain>.01){
    const col=night?'200,218,245':'92,114,140', tilt=.20+.30*w;
    for(let band=0;band<3;band++){
      const lo=band/3, hi=(band+1)/3, zc=(lo+hi)/2;
      const len=9+38*zc, sp=620+950*zc, wd=.6+1.05*zc, al=(.16+.40*zc)*inten.rain;
      c2.lineWidth=wd; c2.lineCap='round'; c2.strokeStyle=`rgba(${col},${al.toFixed(3)})`; c2.beginPath();
      for(const d of drops){ if(d.z<lo||d.z>=hi)continue;
        d.y+=sp*dt/CH; d.x+=sp*tilt*dt/CW; if(d.y>1.05){d.y=-.05-R(0,.1);d.x=R(-.2,1.1);}
        const x=d.x*CW, y=d.y*CH; c2.moveTo(x,y); c2.lineTo(x-len*tilt,y-len);}
      c2.stroke();
    }
    // zemine çarpan damlalar: dioramanın yüzey noktalarında halka + iki sıçrama zerresi
    if(Math.random()<dt*46*inten.rain){const p=surfaceXY(); if(p) splashes.push({x:p[0],y:p[1],t:0,r:R(4,10),dx:[R(-5,5),R(-5,5)]});}
    for(let i=splashes.length-1;i>=0;i--){const s=splashes[i]; s.t+=dt; const u=s.t/.42; if(u>=1){splashes.splice(i,1);continue;}
      const e=1-Math.pow(1-u,2), a=(1-u)*.55*inten.rain;
      c2.lineWidth=1; c2.strokeStyle=night?`rgba(210,225,250,${a.toFixed(3)})`:`rgba(255,255,255,${(a*1.2).toFixed(3)})`;
      c2.beginPath(); c2.ellipse(s.x,s.y,s.r*e,s.r*e*.42,0,0,6.283); c2.stroke();
      c2.fillStyle=c2.strokeStyle; for(const dx of s.dx){const h=Math.sin(u*Math.PI)*9; c2.fillRect(s.x+dx*e*2,s.y-h,1.4,1.4);} }
  } else splashes.length=0;
  if(inten.snow>.01){
    const S=night?{s:SPR.nightS,b:SPR.nightB}:{s:SPR.dayS,b:SPR.dayB};
    for(const f of flakes){ const z=f.z, near=z>.78, far=z<.34;
      const vy=(far?26:near?96:52)*(0.8+.4*f.f)/CH*(1+.25*Math.sin(clock*1.3+f.p));
      f.y+=vy*dt; f.x+=((w*38+Math.sin(clock*.9*f.f+f.p)*15)*(.4+z))*dt/CW;
      if(f.y>1.04){f.y=-.04;f.x=R(0,1);} if(f.x>1.05)f.x=-.05; if(f.x<-.05)f.x=1.05;
      const r=far?1.3+f.s*.5:near?4.2+z*2:2.1+z*1.6, a=(far?.55:near?.5:.8)*inten.snow;
      c2.globalAlpha=a; c2.drawImage(near?S.b:S.s,f.x*CW-r*2,f.y*CH-r*2,r*4,r*4);
    }
    c2.globalAlpha=1;
  }
  if(running()) loopId=requestAnimationFrame(frame); else c2.clearRect(0,0,CW,CH);
}
const motionOK=()=>!rm.matches&&body.dataset.motion!=='off';
const running=()=>motionOK()&&!st.hasAttribute('data-paused')&&(tgt.rain>0||tgt.snow>0||inten.rain>.01||inten.snow>.01);
const wake=()=>{if(!loopId&&running()){last=performance.now();loopId=requestAnimationFrame(frame);}};
const setWx=v=>{body.dataset.wx=v;state.wx=v;tgt={rain:v==='yagmurlu'?1:0,snow:v==='karli'?1:0};applyVariant();wake();};
function seg(id,fn){document.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>{document.querySelectorAll(`#${id} button`).forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset.v);});}
seg('tur',v=>{state.tur=v;render();});
seg('zaman',v=>{state.zaman=v;render();});
seg('hareket',v=>{body.dataset.motion=v;wake();});
seg('wx',setWx);
render(true); requestAnimationFrame(()=>st.dataset.ready='');
// paralaks: yalnız hover + ince imleç, hareket açıkken; rAF yalnız hareket varken döner
const fine=matchMedia('(hover:hover) and (pointer:fine)'), rm=matchMedia('(prefers-reduced-motion:reduce)');
let tx=0,ty=0,cx=0,cy=0,raf=0;
const loop=()=>{cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;
  $('#scene').style.transform=`translate3d(${cx}px,${cy}px,0)`;$('#halo').style.transform=`translate3d(${-cx*.6}px,${-cy*.6}px,0)`;
  raf=(Math.abs(tx-cx)>.05||Math.abs(ty-cy)>.05)?requestAnimationFrame(loop):0;};
const kick=()=>{if(!raf)raf=requestAnimationFrame(loop);};
st.addEventListener('pointermove',e=>{if(!fine.matches||rm.matches||body.dataset.motion==='off')return;const r=st.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*-14;ty=((e.clientY-r.top)/r.height-.5)*-9;kick();});
st.addEventListener('pointerleave',()=>{tx=ty=0;kick();});
// ekran dışı / gizli sekme: döngüler durur
let vis=true;
const pause=()=>{if(document.hidden||!vis)st.setAttribute('data-paused','');else st.removeAttribute('data-paused');wake();};
new IntersectionObserver(([e])=>{vis=e.isIntersecting;pause();}).observe(st); document.addEventListener('visibilitychange',pause);

```

## Çıktı biçimi
Her dosyayı ayrı kod bloğunda ver; bloğun üstünde tek satır: `// FILE: <yol>`. Açıklama yazma.

## Test (değiştirme)
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { DioramaStage } from './DioramaStage'
import type { SceneValue } from '@/lib/dioramas/scene'

const villaGunduz: SceneValue = { tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' }
const villaGece: SceneValue = { ...villaGunduz, zaman: 'gece' }

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
const layer = (name: string) => document.querySelectorAll(`[data-layer="${name}"]`)

beforeEach(() => mockReducedMotion(false))

describe('DioramaStage · temel', () => {
  it('poster görseli çözülen sahneyi gösterir, kök data nitelikleri', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    const root = screen.getByTestId('diorama-stage')
    expect(root).toHaveAttribute('data-scene-id', 'villa_modern_duz_gunduz')
    expect(root).toHaveAttribute('data-weather', 'gunesli')
    expect(root).toHaveAttribute('data-motion', 'on')
    const img = screen.getByRole('img', { name: /Villa · Modern/ })
    expect(img.getAttribute('src')).toBe('/dioramas/villa_modern_duz_gunduz-1600.webp')
  })
  it('className kökte', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" className="ek" />)
    expect(screen.getByTestId('diorama-stage').className).toMatch(/ek/)
  })
})

describe('DioramaStage · katmanlar (hareket açık)', () => {
  it('gündüz + güneşli: ağaçlar sallanır (4), bulut gölgesi, su parıltısı; lamba yok; kanvas yok', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('sway')).toHaveLength(4)
    expect(layer('cloud')).toHaveLength(1)
    expect(layer('glint').length).toBeGreaterThan(5)
    expect(layer('lamp')).toHaveLength(0)
    expect(layer('particles')).toHaveLength(0)
  })
  it('gece: lambalar var, bulut gölgesi ve su parıltısı yok', () => {
    render(<DioramaStage scene={villaGece} weather="gunesli" />)
    expect(layer('lamp').length).toBeGreaterThan(5)
    expect(layer('cloud')).toHaveLength(0)
    expect(layer('glint')).toHaveLength(0)
  })
  it('yağmurlu: ıslak varyant görseli + parçacık kanvası; su parıltısı kapanır', () => {
    render(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    const v = layer('weather-variant')
    expect(v).toHaveLength(1)
    expect(v[0].getAttribute('src')).toBe('/dioramas/weather/villa_modern_duz_gunduz-wet.webp')
    expect(layer('particles')).toHaveLength(1)
    expect(layer('glint')).toHaveLength(0)
  })
  it('karlı: kar varyantı + kanvas', () => {
    render(<DioramaStage scene={villaGunduz} weather="karli" />)
    expect(layer('weather-variant')[0].getAttribute('src')).toBe('/dioramas/weather/villa_modern_duz_gunduz-snow.webp')
    expect(layer('particles')).toHaveLength(1)
  })
  it('bulutlu: varyant ve kanvas yok, bulut gölgesi var', () => {
    render(<DioramaStage scene={villaGunduz} weather="bulutlu" />)
    expect(layer('weather-variant')).toHaveLength(0)
    expect(layer('particles')).toHaveLength(0)
    expect(layer('cloud')).toHaveLength(1)
  })
  it('tarla: ürün dalgası (karda yok)', () => {
    const tarla: SceneValue = { tur: 'tarla', varyant: 'bugday', egim: 'duz', zaman: 'gunduz' }
    const { rerender } = render(<DioramaStage scene={tarla} weather="gunesli" />)
    expect(layer('crop-wave')).toHaveLength(1)
    rerender(<DioramaStage scene={tarla} weather="karli" />)
    expect(layer('crop-wave')).toHaveLength(0)
  })
  it('verisi olmayan sahne (yamaç) çökmez: yalnız poster ve bulut', () => {
    const yamac: SceneValue = { ...villaGunduz, egim: 'yamac' }
    render(<DioramaStage scene={yamac} weather="yagmurlu" />)
    expect(layer('sway')).toHaveLength(0)
    expect(layer('weather-variant')).toHaveLength(0)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-scene-id', 'villa_modern_yamac_gunduz')
  })
})

describe('DioramaStage · hareketi azalt', () => {
  it('prefers-reduced-motion: hiçbir animasyon katmanı ve kanvas yok, data-motion=off', () => {
    mockReducedMotion(true)
    render(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-motion', 'off')
    for (const l of ['sway', 'cloud', 'glint', 'lamp', 'particles', 'crop-wave']) expect(layer(l)).toHaveLength(0)
    // statik ıslak varyant yine gösterilir (hareket değil, durum)
    expect(layer('weather-variant')).toHaveLength(1)
  })
  it('motion="off" prop\'u aynı sonucu verir', () => {
    render(<DioramaStage scene={villaGunduz} weather="karli" motion="off" />)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-motion', 'off')
    expect(layer('particles')).toHaveLength(0)
  })
})

describe('DioramaStage · dayanıklılık', () => {
  it('canvas getContext null dönse (jsdom) bile çökmez', () => {
    expect(() => render(<DioramaStage scene={villaGunduz} weather="karli" />)).not.toThrow()
  })
  it('hava değişince yeniden render edilebilir', () => {
    const { rerender } = render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    rerender(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    expect(layer('particles')).toHaveLength(1)
    rerender(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('particles')).toHaveLength(0)
  })
})

```
