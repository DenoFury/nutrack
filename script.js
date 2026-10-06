const KEY = 'fittrack-v2', $ = s => document.querySelector(s);
const DN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], CATS = ['Breakfast','Lunch','Dinner','Snacks'];
const MUS = ['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Abs','Quads','Hamstrings','Glutes','Calves'];
const GUESS = [[/leg curl|hamstring|romanian|rdl|stiff/i,'Hamstrings'],[/hip thrust|glute|bridge/i,'Glutes'],[/calf/i,'Calves'],[/squat|leg press|lunge|leg ext/i,'Quads'],
  [/tricep|pushdown|skull|dip|close.?grip/i,'Triceps'],[/curl/i,'Biceps'],[/wrist|forearm|farmer/i,'Forearms'],[/crunch|plank|sit.?up|abs|leg raise/i,'Abs'],
  [/shoulder|overhead|lateral|raise|face pull|military|shrug|arnold/i,'Shoulders'],[/bench|chest|fly|push.?up|pec|press|incline/i,'Chest'],[/row|pulldown|pull.?up|chin|lat |deadlift|back/i,'Back']];
const guess = n => (GUESS.find(([r]) => r.test(n)) || [0, ''])[1];
const uid = () => Math.random().toString(36).slice(2, 9);
const mk = (name, list) => ({id:uid(), name, ex:list.map(([n, sets, reps, kg]) => ({id:uid(), name:n, m:guess(n), s:[...Array(sets)].map((_, i) => ({kg:Array.isArray(kg) ? kg[i] : kg, reps}))}))});
const fresh = () => ({ goals:{kcal:2200, water:2500, protein:140, carbs:250, fat:70}, days:{}, done:{}, log:{}, sel:{}, sched:{}, last:'', saved:[], hdone:{},
  habits:[{id:uid(), name:'Take creatine'}, {id:uid(), name:'Sleep 7+ hours'}, {id:uid(), name:'10,000 steps'}],
  routines:[mk('Push day', [['Bench press',4,8,[50,60,60,65]],['Overhead press',3,10,35],['Incline dumbbell press',3,10,22],['Triceps pushdown',3,12,25]]),
            mk('Pull day', [['Deadlift',3,5,90],['Lat pulldown',4,10,50],['Seated cable row',3,10,45],['Barbell curl',3,12,25]])] });
const MAXB = 1.5e6, DATE = /^\d{4}-\d{2}-\d{2}$/, IDK = k => /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(k);
const sidk = s => String(s == null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '').replace(/^_+/, '').slice(0, 40), sid = s => sidk(s) || uid();
const str = (s, n = 80) => String(s == null ? '' : s).slice(0, n), nn = (v, d = 0) => Number.isFinite(+v) ? +v : d, pos = v => Math.max(0, nn(v));
const arr = a => Array.isArray(a) ? a : [], obj = o => (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
const dict = (o, keep, f) => Object.fromEntries(Object.entries(obj(o)).filter(([k]) => keep(k)).map(([k, v]) => [k, f(v)]));
const item = i => { i = obj(i); return {n:str(i.n), kcal:pos(i.kcal), p:pos(i.p), cb:pos(i.cb), f:pos(i.f)}; };
// Rebuilds the whole data object from known fields only, so imported or cloud data can never inject markup or odd keys.
function sanitize(raw){
  const o = obj(raw), F = fresh(), g = obj(o.goals);
  const legacy = e => { e = obj(e); if (!Array.isArray(e.s)) e.s = [...Array(Math.min(10, nn(e.sets, 3)))].map(() => ({kg:e.kg, reps:e.reps || 10})); return e; };
  return {
    goals: Object.fromEntries(Object.entries(F.goals).map(([k, d]) => [k, g[k] === undefined ? d : pos(g[k])])),
    routines: (o.routines === undefined ? F.routines : arr(o.routines)).slice(0, 50).map(r => { r = obj(r);
      return {id:sid(r.id), name:str(r.name, 60), ex:arr(r.ex).slice(0, 60).map(e => { e = legacy(e); const nm = str(e.name, 60);
        return {id:sid(e.id), name:nm, m:e.m === undefined ? guess(nm) : (MUS.includes(e.m) ? e.m : ''), s:e.s.slice(0, 12).map(s => ({kg:pos(obj(s).kg), reps:Math.max(1, nn(obj(s).reps, 1))}))}; })}; }),
    habits: (o.habits === undefined ? F.habits : arr(o.habits)).slice(0, 50).map(h => ({id:sid(obj(h).id), name:str(obj(h).name, 60)})),
    saved: arr(o.saved).slice(0, 300).map(x => ({id:sid(obj(x).id), n:str(obj(x).n, 60), items:arr(obj(x).items).slice(0, 40).map(item)})),
    days: dict(o.days, k => DATE.test(k), v => ({meals:arr(obj(v).meals).slice(0, 300).map(m => ({id:sid(obj(m).id), c:CATS.includes(obj(m).c) ? m.c : 'Snacks', ...item(m)})), water:arr(obj(v).water).slice(0, 200).map(pos)})),
    done: dict(o.done, k => DATE.test(k), v => dict(v, IDK, a => arr(a).slice(0, 12).map(Boolean))),
    log: dict(o.log, k => DATE.test(k), v => dict(v, IDK, x => { x = obj(x); return {n:str(x.n, 60), m:MUS.includes(x.m) ? x.m : '', r:str(x.r, 60), s:arr(x.s).slice(0, 12).map(s => ({kg:pos(obj(s).kg), reps:pos(obj(s).reps), d:!!obj(s).d}))}; })),
    sel: dict(o.sel, k => DATE.test(k), sidk), sched: dict(o.sched, k => /^[0-6]$/.test(k), sidk), last: sidk(o.last),
    hdone: dict(o.hdone, k => DATE.test(k), a => arr(a).slice(0, 60).map(sidk))
  };
}
let S;
try { const raw = localStorage.getItem(KEY); S = sanitize(raw && raw.length < MAXB ? JSON.parse(raw) : null); } catch(e) { S = sanitize(null); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} markDirty(); };

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dt = s => new Date(s + 'T12:00:00');
const add = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
const wd = s => (dt(s).getDay() + 6) % 7;
let fx = [], cur = iso(new Date()), view = 'dash', rng = 7, sq = '', results = [], status = '';

const get = d => S.days[d] || {meals:[], water:[]};
const day = () => S.days[cur] || (S.days[cur] = {meals:[], water:[]});
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const tot = (d, k) => sum(get(d).meals, m => m[k] || 0), kc = d => tot(d, 'kcal'), wt = d => sum(get(d).water, x => x);
const rt = () => S.routines.find(r => r.id === (S.sel[cur] || S.sched[wd(cur)] || S.last)) || S.routines[0];
const plan = () => (rt() || {ex:[]}).ex, exOf = id => plan().find(x => x.id === id);
const dn = (d, e) => { const v = (S.done[d] || {})[e.id]; return Array.isArray(v) ? v.filter(Boolean).length : 0; };
const pct = (v, g) => g ? v / g : 0;
const logEx = e => { const v = (S.done[cur] || {})[e.id] || [], L = S.log[cur] || (S.log[cur] = {});
  if (!v.some(Boolean)) { delete L[e.id]; return; }
  L[e.id] = {n:e.name, m:e.m, r:(rt() || {}).name, s:e.s.map((s, i) => ({kg:s.kg, reps:s.reps, d:!!v[i]}))}; };
const lastOf = e => { const d = Object.keys(S.log).filter(d => d < cur && S.log[d][e.id]).sort().pop(); return d ? S.log[d][e.id] : null; };
function muscles(days){ const v = {}, n = {};
  for (let i = 0; i < days; i++) Object.values(S.log[add(cur, -i)] || {}).forEach(x => x.s.forEach(s => { if (s.d && x.m) { v[x.m] = (v[x.m] || 0) + (s.kg * s.reps || s.reps); n[x.m] = (n[x.m] || 0) + 1; } }));
  return {v, n}; }
const heat = (v, max) => { if (!v) return 'var(--line)'; const t = v / max, c = (a, b) => Math.round(a + (b - a) * t); return `rgb(${c(250,217)},${c(204,48)},${c(21,38)})`; };

const T = 'M100 56 L114 60 Q146 62 154 84 L140 112 L132 200 L130 224 L100 224Z', AR = 'M152 82 Q172 86 172 108 L166 150 L150 148 L146 112Z', FA = 'M150 152 L166 154 L172 208 L162 212 L150 174Z',
  TH = 'M104 228 L130 226 L134 290 Q122 300 104 296Z', LG = 'M106 306 L122 306 L124 372 L112 376 L106 340Z', DL = 'M122 62 Q150 58 158 86 L148 106 Q136 96 130 82Z', UA = 'M150 104 L168 106 L164 146 L151 144Z';
const BM = {front:[['Chest','M101 68 L124 66 Q134 80 132 94 Q118 106 101 100Z'],['Shoulders',DL],['Biceps',UA],['Forearms',FA],['Abs','M101 104 L122 100 L124 160 Q116 176 101 178Z'],['Quads',TH],['Calves',LG]],
  back:[['Back','M101 62 L120 64 Q140 72 142 92 L134 140 L132 168 Q116 176 101 172Z'],['Shoulders',DL],['Triceps',UA],['Forearms',FA],['Glutes','M101 180 L128 178 Q136 202 130 226 L101 226Z'],['Hamstrings',TH],['Calves',LG]]};
const both = d => `<path d="${d}"/><path d="${d}" transform="translate(200 0) scale(-1 1)"/>`;
function figure(v, max){
  const side = (k, x) => `<g transform="translate(${x} 0)"><g class="sil"><circle cx="100" cy="32" r="18"/><rect x="92" y="44" width="16" height="16"/>${[T,AR,FA,TH,LG].map(d => both(d)).join('')}</g>` +
    BM[k].map(([m, d]) => `<g class="mu" fill="${heat(v[m] || 0, max)}"><title>${m}: ${Math.round(v[m] || 0)} kg</title>${both(d)}</g>`).join('') +
    `<text x="100" y="410" text-anchor="middle">${k === 'front' ? 'Front' : 'Back'}</text></g>`;
  return `<svg viewBox="0 0 440 416" class="body" role="img" aria-label="Muscle heat map">${side('front', 0)}${side('back', 230)}</svg>`; }

const ring = (p, c, big, sub, cls = '') => `<svg viewBox="0 0 100 100" class="ring ${p >= 1 ? 'full ' : ''}${cls}" style="--c:${c}" role="img" aria-label="${big} ${sub}">
<circle cx="50" cy="50" r="42"/>${p >= 1 ? '<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter></defs><circle class="glow" cx="50" cy="50" r="42"/>' : ''}<circle class="v" cx="50" cy="50" r="42" transform="rotate(-90 50 50)" style="stroke:${c};stroke-dasharray:${Math.min(1,p)*263.9} 263.9"/>
<text x="50" y="52" text-anchor="middle">${big}</text><text class="s" x="50" y="65" text-anchor="middle">${sub}</text></svg>`;
function bars(fn, goal, color){
  const ds = [...Array(7)].map((_, i) => add(cur, i - 6)), vs = ds.map(d => fn(d)), max = Math.max(goal, ...vs, 1);
  return `<div class="plot">${vs.map((v, i) => `<i class="${ds[i]===cur?'on':''}" style="height:${v/max*100}%;background:${color};--i:${i}" title="${v}"></i>`).join('')}<hr style="bottom:${goal/max*100}%"></div>
<div class="lbl">${ds.map(d => `<span>${DN[wd(d)][0]}</span>`).join('')}</div>`; }
const mbar = (l, v, g, c) => `<div class="mb"><span>${l} <b>${Math.round(v)}</b> / ${g} g</span><div class="bar"><i style="width:${Math.min(100, pct(v,g)*100)}%;background:${c}"></i></div></div>`;
const num = (n, ph, extra = '') => `<input name="${n}" type="number" min="0" step="any" placeholder="${ph}" ${extra}>`;

const V = {
  dash(){
    const g = S.goals, k = kc(cur), w = wt(cur), ex = plan(), t = sum(ex, e => e.s.length), d = sum(ex, e => dn(cur, e)), left = g.kcal - k, hd = S.hdone[cur] || [], hn = S.habits.filter(h => hd.includes(h.id)).length;
    return `<div class="grid">
<div class="card"><h3>Calories</h3>${ring(pct(k,g.kcal), left<0?'var(--bad)':'var(--kcal)', Math.abs(left), left<0?'kcal over':'kcal left')}
<p class="det">${k} eaten of ${g.kcal}<br>P ${Math.round(tot(cur,'p'))}/${g.protein}, C ${Math.round(tot(cur,'cb'))}/${g.carbs}, F ${Math.round(tot(cur,'f'))}/${g.fat} g</p></div>
<div class="card"><h3>Water</h3>${ring(pct(w,g.water), 'var(--water)', +(w/1000).toFixed(2), 'of ' + +(g.water/1000).toFixed(2) + ' L', 'wr')}
<div class="acts"><button data-act="water" data-ml="250">+250 ml</button><button data-act="water" data-ml="500">+500 ml</button><button class="ghost" data-act="undo">Undo</button></div></div>
<div class="card"><h3>Training${rt() ? ': ' + esc(rt().name) : ''}</h3>${ring(pct(d,t), 'var(--train)', t ? d + '/' + t : 'Rest', t ? 'sets done' : 'no plan')}
<p class="det">${ex.length ? ex.map(e => esc(e.name)).join(', ') : 'Create a routine in Training.'}</p>
<div class="acts" style="margin-top:10px"><button class="ghost" data-act="nav" data-v="train">Open workout</button></div></div>
<div class="card"><div class="sh"><h3>Daily checklist</h3><span>${hn}/${S.habits.length}</span></div>${S.habits.length ? S.habits.map(h => `<label class="chk"><input type="checkbox" data-act="hab" data-id="${h.id}" ${hd.includes(h.id)?'checked':''}>${esc(h.name)}</label>`).join('') : '<p class="empty">Add daily goals in Settings.</p>'}</div>
<div class="card wide"><h3>Last 7 days</h3><div class="two">
<div><h4>Calories (dashed line is your goal)</h4>${bars(kc, g.kcal, 'var(--kcal)')}</div>
<div><h4>Water</h4>${bars(wt, g.water, 'var(--water)')}</div></div></div></div>`;
  },
  food(){
    const h = new Date().getHours(), def = h < 11 ? 0 : h < 16 ? 1 : h < 21 ? 2 : 3, m = get(cur).meals, g = S.goals;
    return `<div class="card"><div class="sh"><h3>Today</h3><span>${kc(cur)} / ${g.kcal} kcal</span></div><div class="three">${mbar('Protein', tot(cur,'p'), g.protein, 'var(--kcal)')}${mbar('Carbs', tot(cur,'cb'), g.carbs, 'var(--water)')}${mbar('Fat', tot(cur,'f'), g.fat, 'var(--train)')}</div></div>
<form id="mf" class="card row"><select name="c" aria-label="Meal">${CATS.map((c,i) => `<option ${i===def?'selected':''}>${c}</option>`).join('')}</select>
<input name="n" placeholder="Food, e.g. Greek yoghurt" required>${num('k','kcal','required')}${num('p','Protein g')}${num('cb','Carbs g')}${num('f','Fat g')}<button class="pri">Add food</button></form>
<div class="card"><h3>Search food database or type a barcode</h3><form id="sf" class="row"><input name="q" placeholder="e.g. banana, or 5449000000996" value="${esc(sq)}" style="flex:1 1 200px" required><button class="pri">Search</button></form>
${status ? `<p class="empty" style="margin-top:10px">${status}</p>` : ''}${results.map((r, i) => `<div class="li"><div class="g">${esc(r.n)}<small>per 100 g: ${r.k} kcal, P ${r.p}, C ${r.cb}, F ${r.f}</small></div>
<input id="g${i}" type="number" min="1" value="100" style="width:76px" aria-label="Grams"><button class="ghost" data-act="addr" data-i="${i}">Add g</button></div>`).join('')}</div>
<details class="card"><summary>My foods and meals (${S.saved.length})</summary>${S.saved.length ? S.saved.map(x => `<div class="li"><div class="g">${esc(x.n)}<small>${x.items.length > 1 ? x.items.length + ' items, ' : ''}${Math.round(sum(x.items, i => i.kcal))} kcal, P ${Math.round(sum(x.items, i => i.p || 0))}</small></div>
<button class="ghost" data-act="addsv" data-id="${x.id}">Add</button><button class="x" data-act="delsv" data-id="${x.id}" aria-label="Delete">×</button></div>`).join('') : '<p class="empty">Tap ☆ next to a food, or "Save as meal" on a meal, to keep it here. "Add" puts it in the meal chosen in the form above.</p>'}</details>` +
    CATS.map(c => { const l = m.filter(x => x.c === c);
      return `<div class="card"><div class="sh"><h3>${c}</h3><span>${Math.round(sum(l, x => x.kcal))} kcal ${l.length > 1 ? `<button class="ghost sm" data-act="savem" data-c="${c}">Save as meal</button>` : ''}</span></div>` +
      (l.length ? l.map(x => `<div class="li"><div class="g">${esc(x.n)}<small>P ${x.p||0}, C ${x.cb||0}, F ${x.f||0}</small></div><b>${x.kcal}</b><button class="x" data-act="savei" data-id="${x.id}" aria-label="Save ${esc(x.n)} to my foods">☆</button><button class="x" data-act="delm" data-id="${x.id}" aria-label="Delete ${esc(x.n)}">×</button></div>`).join('') : '<p class="empty">Nothing added yet.</p>') + '</div>'; }).join('');
  },
  train(){
    const R = S.routines, r = rt(), ex = r ? r.ex : [], isDone = e => dn(cur, e) >= e.s.length, fin = ex.filter(isDone).length;
    return `<div class="rts">${R.map(x => `<button class="rt ${r && x.id === r.id ? 'on' : ''}" data-act="pick" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>` +
    (r ? `<div class="card"><div class="sh"><h3>${esc(r.name)}</h3><span>${fin} of ${ex.length} done</span></div>` +
      (ex.length ? ex.map(e => { const ok = isDone(e), dd = (S.done[cur] || {})[e.id] || [], L = lastOf(e);
        return `<div class="ex ${ok ? 'fin' : ''}"><div class="top"><strong>${esc(e.name)}</strong><button class="dn ${ok ? 'on' : ''}" data-act="done" data-id="${e.id}">${ok ? 'All done ✓' : 'Mark all done'}</button></div>
${e.s.map((s, i) => { const p = L && L.s[i]; return `<div class="sr"><button class="chip ${dd[i] ? 'on' : ''}" data-act="set" data-id="${e.id}" data-i="${i}" aria-label="Set ${i+1} done">${i+1}</button>
<label>kg<input type="number" min="0" step="0.5" value="${s.kg}" data-f="kg" data-i="${i}" data-id="${e.id}"></label>
<label>Reps<input type="number" min="1" value="${s.reps}" data-f="reps" data-i="${i}" data-id="${e.id}"></label>${p && p.d ? `<small>Last time: ${p.kg} kg × ${p.reps}</small>` : ''}</div>`; }).join('')}
<div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="ghost" data-act="addset" data-id="${e.id}">+ Add set</button><button class="ghost" data-act="delset" data-id="${e.id}">− Remove set</button></div></div>`; }).join('')
        : '<p class="empty">No exercises yet. Add some under Edit routines.</p>') +
      `<p class="note">Set the kg and reps for each set. Any change is saved as your default for next time.</p></div>` : '<p class="empty">Create your first routine below.</p>') +
`<details class="card" ${r ? '' : 'open'}><summary>Edit routines and weekly schedule</summary>
<form id="rf" class="row"><input name="n" placeholder="New routine, e.g. Leg day" required><button class="pri">Create routine</button></form>
<h3 style="margin-top:18px">Weekly schedule (opens the right routine automatically)</h3><div class="sched">${DN.map((n, i) => `<label class="f">${n}<select data-sch="${i}"><option value="">None</option>${R.map(x => `<option value="${x.id}" ${S.sched[i] === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`).join('')}</div>` +
(r ? `<h3 style="margin-top:18px">${esc(r.name)}</h3><form id="ef" class="row"><input name="n" placeholder="New exercise" required><input name="s" type="number" min="1" max="10" placeholder="Sets" required><input name="r" type="number" min="1" placeholder="Reps" required><input name="w" type="number" min="0" step="0.5" placeholder="kg">
<select name="m" aria-label="Muscle"><option value="">Muscle: auto</option>${MUS.map(m => `<option>${m}</option>`).join('')}</select><button class="pri">Add</button></form>` +
  ex.map(e => `<div class="li"><div class="g">${esc(e.name)}<small><select class="ms" data-mu="${e.id}" aria-label="Muscle"><option value="">No muscle</option>${MUS.map(m => `<option ${e.m === m ? 'selected' : ''}>${m}</option>`).join('')}</select></small></div>
<button class="x" data-act="up" data-id="${e.id}" aria-label="Move up">▲</button><button class="x" data-act="down" data-id="${e.id}" aria-label="Move down">▼</button><button class="x" data-act="ren" data-id="${e.id}" aria-label="Rename">✎</button><button class="x" data-act="dele" data-id="${e.id}" aria-label="Remove ${esc(e.name)}">×</button></div>`).join('') +
  `<div class="acts" style="justify-content:flex-start;margin-top:12px"><button class="ghost" data-act="renr">Rename routine</button><button class="ghost" data-act="clearday">Reset today's ticks</button><button class="ghost" data-act="delr" style="color:var(--bad)">Delete routine</button></div>` : '') + '</details>';
  },
  prog(){
    const {v, n} = muscles(rng), max = Math.max(0, ...Object.values(v)), list = MUS.filter(m => v[m]).sort((a, b) => v[b] - v[a]);
    const dates = Object.keys(S.log).filter(d => Object.keys(S.log[d]).length).sort().reverse().slice(0, 30);
    return `<div class="rts"><button class="rt ${rng===7?'on':''}" data-act="rng" data-n="7">Last 7 days</button><button class="rt ${rng===30?'on':''}" data-act="rng" data-n="30">Last 30 days</button></div>
<div class="card"><h3>Muscle heat map: weight lifted per muscle (up to ${dt(cur).toLocaleDateString('en-GB', {day:'numeric', month:'short'})})</h3>${figure(v, max)}<div class="lg"><span>Less</span><i></i><span>More</span></div></div>
<div class="card"><h3>Volume by muscle (kg × reps)</h3>${list.length ? list.map(m => `<div class="mrow"><span>${m}</span><div class="bar"><i style="width:${v[m]/max*100}%;background:${heat(v[m], max)}"></i></div><b>${Math.round(v[m]).toLocaleString('en-GB')}</b><small>${n[m]} sets</small></div>`).join('') : '<p class="empty">Tick some sets in Training and your muscles will light up here.</p>'}</div>
<div class="card"><h3>Workout history</h3>${dates.length ? dates.map(d => { const es = Object.values(S.log[d]), vol = sum(es, x => sum(x.s.filter(s => s.d), s => s.kg * s.reps));
  return `<details class="hs"><summary><b>${dt(d).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})}</b> ${esc(es[0].r || '')} <span>${Math.round(vol).toLocaleString('en-GB')} kg</span></summary>${es.map(x => `<p class="hl"><strong>${esc(x.n)}</strong> ${x.s.filter(s => s.d).map(s => s.kg + '×' + s.reps).join(', ')}</p>`).join('')}</details>`; }).join('') : '<p class="empty">No workouts logged yet.</p>'}</div>`;
  },
  set(){
    const acct = () => !sb ? `<div class="card"><h3>Account and sync</h3><p class="empty">Cloud sync is not available in this preview. It works on your GitHub Pages site.</p></div>`
      : user ? `<div class="card"><h3>Account and sync</h3><p class="empty" style="color:var(--ink)">Signed in as <b>${esc(user.email || '')}</b><br><span class="muted">Status: <span id="syncTxt">${LBL[syncSt] || ''}</span></span></p>
<div class="acts" style="justify-content:flex-start;margin-top:12px"><button class="ghost" data-act="syncnow">Sync now</button><button class="ghost" data-act="signout">Sign out</button></div></div>`
      : `<div class="card"><h3>Account and sync</h3><p class="note" style="margin:0 0 10px">${authStep === 'up' ? 'Create an account to back up your data and use it on all your devices.' : 'Sign in to sync your data across your devices.'}</p>
<form id="af" class="row"><input name="e" type="email" autocomplete="email" maxlength="254" placeholder="you@email.com" required value="${esc(authEmail)}" style="flex:1 1 100%">
<input name="pw" type="password" autocomplete="${authStep === 'up' ? 'new-password' : 'current-password'}" minlength="8" maxlength="72" placeholder="Password (8+ characters)" required style="flex:1 1 100%">
<button class="pri">${authStep === 'up' ? 'Create account' : 'Sign in'}</button><button type="button" class="ghost" data-act="authmode">${authStep === 'up' ? 'I already have an account' : 'Create an account'}</button></form>
${authMsg ? `<p class="note" role="status">${authMsg}</p>` : ''}</div>`;
    const g = S.goals;
    return `<h2>Settings</h2><form id="gf" class="card row"><label class="f">Daily calories<input name="k" type="number" min="0" value="${g.kcal}"></label>
<label class="f">Water (ml)<input name="w" type="number" min="0" value="${g.water}"></label><label class="f">Protein (g)<input name="p" type="number" min="0" value="${g.protein}"></label>
<label class="f">Carbs (g)<input name="c" type="number" min="0" value="${g.carbs}"></label><label class="f">Fat (g)<input name="f" type="number" min="0" value="${g.fat}"></label>
<button class="pri" style="align-self:flex-end">Save goals</button></form>
<div class="card"><h3>Daily checklist goals</h3>${S.habits.map(h => `<div class="li"><div class="g">${esc(h.name)}</div><button class="x" data-act="delh" data-id="${h.id}" aria-label="Delete">×</button></div>`).join('')}
<form id="hf" class="row" style="margin-top:10px"><input name="n" placeholder="New goal, e.g. Stretch 10 minutes" style="flex:1 1 200px" required><button class="pri">Add</button></form></div>
${acct()}<div class="card"><h3>Your data lives only in this browser. Back it up regularly.</h3><div class="acts" style="justify-content:flex-start">
<button class="ghost" data-act="export">Export backup</button><label class="btn">Import backup<input type="file" id="imp" accept=".json" hidden></label>
<button class="ghost" data-act="reset" style="color:var(--bad)">Delete all data</button></div></div>`;
  }
};

function render(){
  const l = dt(cur).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
  $('#date').textContent = cur === iso(new Date()) ? 'Today, ' + l : l;
  $('header').hidden = view === 'set';
  document.querySelectorAll('nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  const key = view + cur, ch = key !== render.k; render.k = key;
  $('#view').classList.toggle('in', ch);
  $('#view').innerHTML = V[view]();
  fx.forEach(([s, c]) => document.querySelectorAll(s).forEach(el => c === 'burst' ? burst(el) : el.classList.add(c)));
  fx = []; countUp(); setSync(syncSt);
}
const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);
function burst(el){
  if (calm()) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, cols = ['#ff9500','#34c759','#007aff','#ff375f','#ffd60a','#bf5af2'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i'), a = Math.PI * 2 * i / 14 + Math.random() * .5, d = 38 + Math.random() * 52;
    p.className = 'cf'; p.style.cssText = `left:${cx}px;top:${cy}px;background:${cols[i % 6]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 800);
  }
}
function countUp(){
  const P = countUp.p || (countUp.p = {}), fresh = $('#view').classList.contains('in');
  document.querySelectorAll('#view .ring text:not(.s)').forEach((el, i) => {
    const to = +el.textContent, k = view + i; if (el.textContent.trim() === '' || isNaN(to)) return;
    const from = fresh ? 0 : (P[k] ?? to); P[k] = to; if (calm() || from === to) return;
    const t0 = performance.now(), dec = String(to).includes('.') ? 2 : 0;
    const step = n => { const p = Math.min(1, (n - t0) / 700), e = 1 - Math.pow(1 - p, 3); el.textContent = +(from + (to - from) * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
document.addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } });
let tt; const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 2200); };

async function search(q){
  q = q.trim(); status = 'Searching…'; results = []; render();
  const fields = 'product_name,brands,nutriments';
  try {
    let items;
    if (/^\d{8,14}$/.test(q)) { const r = await (await fetch('https://world.openfoodfacts.org/api/v2/product/' + q + '.json?fields=' + fields)).json(); items = r.status === 1 ? [r.product] : []; }
    else { const r = await (await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=8&fields=' + fields + '&search_terms=' + encodeURIComponent(q))).json(); items = r.products || []; }
    const f1 = x => +(+x || 0).toFixed(1);
    results = items.filter(p => p.product_name && p.nutriments).map(p => ({ n:p.product_name + (p.brands ? ' (' + p.brands.split(',')[0] + ')' : ''),
      k:Math.round(p.nutriments['energy-kcal_100g'] || 0), p:f1(p.nutriments.proteins_100g), cb:f1(p.nutriments.carbohydrates_100g), f:f1(p.nutriments.fat_100g) }));
    status = results.length ? '' : 'Nothing found. Try another name or check the barcode.';
  } catch(e) { status = 'Search failed. Check your internet connection and try again.'; }
  render();
}

const putItems = (items, c, k = 1) => items.forEach(i => day().meals.push({id:uid(), c, n:i.n, kcal:Math.round(i.kcal * k), p:+(i.p * k).toFixed(1), cb:+(i.cb * k).toFixed(1), f:+(i.f * k).toFixed(1)}));
const mealCat = () => ($('#mf select') || {}).value || CATS[0];

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, D = t.dataset, x = D.id ? exOf(D.id) : null;
  if (a === 'nav') view = D.v;
  else if (a === 'd') cur = add(cur, +D.n);
  else if (a === 'today') cur = iso(new Date());
  else if (a === 'go') cur = D.d;
  else if (a === 'rng') rng = +D.n;
  else if (a === 'water') day().water.push(+D.ml);
  else if (a === 'undo') day().water.pop();
  else if (a === 'delm') day().meals = day().meals.filter(m => m.id !== D.id);
  else if (a === 'savei') { const m = day().meals.find(m => m.id === D.id); S.saved.push({id:uid(), n:m.n, items:[{n:m.n, kcal:m.kcal, p:m.p, cb:m.cb, f:m.f}]}); toast('Saved to My foods'); }
  else if (a === 'savem') { const l = get(cur).meals.filter(m => m.c === D.c), n = prompt('Name this meal', D.c); if (!n) return; S.saved.push({id:uid(), n:n.trim(), items:l.map(m => ({n:m.n, kcal:m.kcal, p:m.p, cb:m.cb, f:m.f}))}); toast('Meal saved'); }
  else if (a === 'addsv') { putItems(S.saved.find(s => s.id === D.id).items, mealCat()); toast('Added'); }
  else if (a === 'delsv') S.saved = S.saved.filter(s => s.id !== D.id);
  else if (a === 'addr') { const r = results[+D.i], g = +($('#g' + D.i).value) || 100; putItems([{n:r.n + ' (' + g + ' g)', kcal:r.k, p:r.p, cb:r.cb, f:r.f}], mealCat(), g / 100); toast('Added'); }
  else if (a === 'hab') { const h = S.hdone[cur] || (S.hdone[cur] = []), i = h.indexOf(D.id); i < 0 ? h.push(D.id) : h.splice(i, 1); }
  else if (a === 'delh') S.habits = S.habits.filter(h => h.id !== D.id);
  else if (a === 'set') { const m = S.done[cur] || (S.done[cur] = {}), v = m[D.id] || (m[D.id] = []); v[+D.i] = !v[+D.i]; logEx(x); }
  else if (a === 'addset') { x.s.push({...x.s[x.s.length - 1]}); logEx(x); }
  else if (a === 'delset') { if (x.s.length > 1) { x.s.pop(); const v = (S.done[cur] || {})[x.id]; if (v) v.length = Math.min(v.length, x.s.length); logEx(x); } }
  else if (a === 'pick') S.sel[cur] = S.last = D.id;
  else if (a === 'done') { const m = S.done[cur] || (S.done[cur] = {}); m[x.id] = x.s.map(() => dn(cur, x) < x.s.length); logEx(x); }
  else if (a === 'dele') rt().ex = plan().filter(y => y.id !== D.id);
  else if (a === 'up' || a === 'down') { const L = rt().ex, i = L.findIndex(y => y.id === D.id), k = i + (a === 'up' ? -1 : 1); if (L[k]) [L[i], L[k]] = [L[k], L[i]]; }
  else if (a === 'ren') { const v = prompt('Exercise name', x.name); if (v && v.trim()) x.name = v.trim(); }
  else if (a === 'renr') { const v = prompt('Routine name', rt().name); if (v && v.trim()) rt().name = v.trim(); }
  else if (a === 'clearday') { S.done[cur] = {}; delete S.log[cur]; }
  else if (a === 'delr') { if (!confirm('Delete the routine "' + rt().name + '"?')) return; S.routines = S.routines.filter(y => y !== rt()); }
  else if (a === 'syncnow') { meta.dirty ? push() : pull(); return; }
  else if (a === 'authmode') { authStep = authStep === 'up' ? 'in' : 'up'; authMsg = ''; }
  else if (a === 'signout') { sb.auth.signOut().then(() => { meta = {uid:'', at:'', dirty:false}; saveMeta(); }); return; }
  else if (a === 'export') {
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S)], {type:'application/json'}));
    l.download = 'fittrack-backup-' + iso(new Date()) + '.json'; l.click(); return;
  }
  else if (a === 'reset') { if (!confirm('Delete all your data? This cannot be undone.')) return; S = fresh(); toast('All data deleted'); }
  if (a === 'set' || a === 'done' || a === 'water' || a === 'hab') {
    navigator.vibrate && navigator.vibrate(8);
    const q = `[data-id="${D.id}"]`, full = x && dn(cur, x) >= x.s.length;
    if (a === 'set' && ((S.done[cur] || {})[D.id] || [])[+D.i]) fx.push([`.chip${q}[data-i="${D.i}"]`, 'pop']);
    if ((a === 'set' || a === 'done') && full) fx.push([`.dn${q}`, 'burst']);
    if (a === 'done' && full) fx.push([`.chip${q}`, 'pop']);
    if (a === 'water') fx.push(['.ring.wr', 'pulse']);
    if (a === 'hab' && (S.hdone[cur] || []).includes(D.id)) fx.push([`.chk input${q}`, 'pop']);
  }
  save(); render();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), id = e.target.id;
  if (id === 'sf') { sq = f.q; search(f.q); return; }
  if (id === 'af') { passAuth(f.e, f.pw); return; }
  if (id === 'mf') putItems([{n:f.n.trim(), kcal:+f.k, p:+f.p || 0, cb:+f.cb || 0, f:+f.f || 0}], f.c);
  if (id === 'ef') rt().ex.push({id:uid(), name:f.n.trim(), m:f.m || guess(f.n), s:[...Array(Math.min(10, +f.s))].map(() => ({kg:+f.w || 0, reps:+f.r}))});
  if (id === 'rf') { const r = mk(f.n.trim(), []); S.routines.push(r); S.sel[cur] = S.last = r.id; toast('Routine created'); }
  if (id === 'hf') S.habits.push({id:uid(), name:f.n.trim()});
  if (id === 'gf') { S.goals = {kcal:+f.k || 0, water:+f.w || 0, protein:+f.p || 0, carbs:+f.c || 0, fat:+f.f || 0}; toast('Goals saved'); }
  save(); render();
});

document.addEventListener('change', e => {
  const t = e.target, D = t.dataset;
  if (D.f) { const x = exOf(D.id); x.s[+D.i][D.f] = Math.max(D.f === 'kg' ? 0 : 1, +t.value || 0); if ((S.log[cur] || {})[x.id]) logEx(x); save(); toast('Saved for next session'); return; }
  if (D.mu !== undefined) { exOf(D.mu).m = t.value; save(); render(); return; }
  if (D.sch !== undefined) { S.sched[D.sch] = t.value; save(); toast('Schedule saved'); render(); return; }
  if (t.id !== 'imp' || !t.files[0]) return;
  const r = new FileReader();
  r.onload = () => { try { if (r.result.length > MAXB) throw 0; S = sanitize(JSON.parse(r.result)); save(); render(); toast('Backup imported'); } catch(x) { toast('That file is not a valid backup'); } };
  r.readAsText(t.files[0]);
});

// ---------- Cloud sync (Supabase) ----------
// The anon key is public by design. Safety comes from row-level security in the database: each account can only touch its own row.
const SUPA_URL = 'https://xpeunnqqtwdtvwvxybor.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZXVubnFxdHdkdHZ3dnh5Ym9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NDA1NjcsImV4cCI6MjEwNjUxNjU2N30.7bR16sp6uSIxawSXN9ZB1zZEgRvjABvVigR6hC2Y8-M';
let sb = null;
try { if (window.supabase) sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {auth:{flowType:'pkce', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}}); } catch(e) {}
let user = null, authStep = 'in', authEmail = '', authMsg = '', lastSend = 0, syncSt = 'off', busy = false, again = false, ver = 0, timer;
let meta = {uid:'', at:'', dirty:false};
try { const m = JSON.parse(localStorage.getItem('fittrack-sync')); if (m) meta = {uid:String(m.uid || ''), at:String(m.at || ''), dirty:!!m.dirty}; } catch(e) {}
const saveMeta = () => { try { localStorage.setItem('fittrack-sync', JSON.stringify(meta)); } catch(e) {} };
const LBL = {saved:'Synced', saving:'Syncing…', offline:'Offline', error:'Sync error'};
function setSync(st){ syncSt = st; const b = $('#sync'); if (b) { b.hidden = !user; b.textContent = LBL[st] || ''; b.className = 'sync ' + st; } const t = $('#syncTxt'); if (t) t.textContent = LBL[st] || ''; }
function markDirty(){ if (!sb) return; ver++; meta.dirty = true; saveMeta(); if (user) { clearTimeout(timer); timer = setTimeout(push, 1500); setSync('saving'); } }
const hasData = () => Object.keys(S.days).length || Object.keys(S.log).length || S.saved.length;
function adopt(row){
  const j = JSON.stringify(row.data); if (j.length > MAXB) throw new Error('size');
  S = sanitize(JSON.parse(j)); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {}
  meta = {uid:user.id, at:row.updated_at, dirty:false}; saveMeta(); render(); toast('Synced from the cloud');
}
async function pull(){
  if (!sb || !user) return; if (busy) { again = true; return; } busy = true; setSync('saving'); let next = null;
  try {
    const {data:row, error} = await sb.from('app_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const first = meta.uid !== user.id;
    if (!row) { meta = {uid:user.id, at:'', dirty:true}; saveMeta(); next = push; }
    else if (first || row.updated_at !== meta.at) {
      let cloud = true;
      if (first && hasData()) cloud = confirm('This account already has data in the cloud.\n\nOK = use the cloud data (replaces what is on this device)\nCancel = keep this device and overwrite the cloud');
      else if (meta.dirty) cloud = confirm('Your data changed here and on another device.\n\nOK = use the other device\'s data\nCancel = keep this device and overwrite the cloud');
      if (cloud) adopt(row); else { meta = {uid:user.id, at:row.updated_at, dirty:true}; saveMeta(); next = push; }
    } else if (meta.dirty) next = push;
    if (!next) setSync('saved');
  } catch(e) { setSync(navigator.onLine ? 'error' : 'offline'); }
  busy = false; if (next) return next(); if (again) { again = false; clearTimeout(timer); timer = setTimeout(push, 500); }
}
async function push(){
  if (!sb || !user) return; if (busy) { again = true; return; } busy = true; setSync('saving'); const v0 = ver; let next = null;
  try {
    if (JSON.stringify(S).length > MAXB) throw new Error('size');
    let r;
    if (meta.at) { r = await sb.from('app_state').update({data:S}).eq('user_id', user.id).eq('updated_at', meta.at).select('updated_at'); if (!r.error && !(r.data || []).length) next = pull; }
    else { r = await sb.from('app_state').insert({user_id:user.id, data:S}).select('updated_at'); if (r.error && r.error.code === '23505') next = pull; }
    if (!next) { if (r.error) throw r.error; meta = {uid:user.id, at:r.data[0].updated_at, dirty:ver !== v0}; saveMeta(); setSync(ver === v0 ? 'saved' : 'saving'); if (ver !== v0) again = true; }
  } catch(e) { setSync(navigator.onLine ? 'error' : 'offline'); }
  busy = false; if (next) return next(); if (again) { again = false; clearTimeout(timer); timer = setTimeout(push, 800); }
}
async function passAuth(email, pw){
  authEmail = str(email, 254).trim(); pw = String(pw || '');
  if (pw.length < 8 || pw.length > 72) { authMsg = 'Use a password of 8 to 72 characters.'; return render(); }
  if (Date.now() - lastSend < 4000) { authMsg = 'Please wait a few seconds and try again.'; return render(); }
  lastSend = Date.now(); authMsg = 'Please wait…'; render();
  try {
    if (authStep === 'up') {
      const {data, error} = await sb.auth.signUp({email:authEmail, password:pw});
      if (error) authMsg = /weak|short|least/i.test(error.message) ? 'That password is too weak. Use a longer, unique one.' : 'Could not create the account. Check the details, or try signing in.';
      else if (!data.session) authMsg = 'Account created. If you do not get signed in, check your email to confirm it, then sign in.';
      else authMsg = '';
    } else {
      const {error} = await sb.auth.signInWithPassword({email:authEmail, password:pw});
      authMsg = error ? 'Email or password is incorrect.' : '';
    }
  } catch(e) { authMsg = navigator.onLine ? 'Something went wrong. Try again.' : 'You are offline.'; }
  pw = ''; render();
}
if (sb) {
  sb.auth.onAuthStateChange((ev, session) => {
    user = session ? session.user : null;
    if (ev === 'TOKEN_REFRESHED') return;
    setTimeout(() => { if (user) pull(); else setSync('off'); render(); }, 0);
  });
  addEventListener('online', () => { if (user && meta.dirty) push(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && user && !meta.dirty) pull(); });
}

render();
