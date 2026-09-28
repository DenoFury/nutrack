const KEY = 'fittrack-v2', $ = s => document.querySelector(s);
const DN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], CATS = ['Breakfast','Lunch','Dinner','Snacks'];
const fresh = () => ({ goals:{kcal:2200, water:2500, protein:140}, days:{}, plan:{}, done:{} });
let S = fresh();
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY))); } catch(e){}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} };

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dt = s => new Date(s + 'T12:00:00');
const add = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
const wd = s => (dt(s).getDay() + 6) % 7;
let cur = iso(new Date()), view = 'dash';

const get = d => S.days[d] || {meals:[], water:[]};
const day = () => S.days[cur] || (S.days[cur] = {meals:[], water:[]});
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const kc = d => sum(get(d).meals, m => m.kcal), pr = d => sum(get(d).meals, m => m.p || 0), wt = d => sum(get(d).water, x => x);
const plan = d => S.plan[wd(d)] || [];
const dn = (d, e) => Math.min(e.sets, (S.done[d] || {})[e.id] || 0);
const pct = (v, g) => g ? v / g : 0;

const ring = (p, c, big, sub) => `<svg viewBox="0 0 100 100" class="ring" role="img" aria-label="${big} ${sub}">
<circle cx="50" cy="50" r="42"/><circle class="v" cx="50" cy="50" r="42" transform="rotate(-90 50 50)" style="stroke:${c};stroke-dasharray:${Math.min(1,p)*263.9} 263.9"/>
<text x="50" y="52" text-anchor="middle">${big}</text><text class="s" x="50" y="65" text-anchor="middle">${sub}</text></svg>`;

function bars(fn, goal, color){
  const ds = [...Array(7)].map((_, i) => add(cur, i - 6)), vs = ds.map(fn), max = Math.max(goal, ...vs, 1);
  return `<div class="plot">${vs.map((v, i) => `<i class="${ds[i]===cur?'on':''}" style="height:${v/max*100}%;background:${color}" title="${v}"></i>`).join('')}<hr style="bottom:${goal/max*100}%"></div>
<div class="lbl">${ds.map(d => `<span>${DN[wd(d)][0]}</span>`).join('')}</div>`;
}

const V = {
  dash(){
    const g = S.goals, k = kc(cur), w = wt(cur), ex = plan(cur), tot = sum(ex, e => e.sets), d = sum(ex, e => dn(cur, e)), left = g.kcal - k;
    return `<div class="grid">
<div class="card"><h3>Calories</h3>${ring(pct(k,g.kcal), left<0?'var(--bad)':'var(--kcal)', Math.abs(left), left<0?'kcal over':'kcal left')}
<p class="det">${k} eaten of ${g.kcal}<br>Protein ${pr(cur)} of ${g.protein} g</p></div>
<div class="card"><h3>Water</h3>${ring(pct(w,g.water), 'var(--water)', +(w/1000).toFixed(2), 'of ' + +(g.water/1000).toFixed(2) + ' L')}
<div class="acts"><button data-act="water" data-ml="250">+250 ml</button><button data-act="water" data-ml="500">+500 ml</button><button class="ghost" data-act="undo">Undo</button></div></div>
<div class="card"><h3>Training</h3>${ring(pct(d,tot), 'var(--train)', tot ? d + '/' + tot : 'Rest', tot ? 'sets done' : 'no plan')}
<p class="det">${ex.length ? ex.map(e => esc(e.name)).join(', ') : 'Nothing planned for ' + DN[wd(cur)] + '.'}</p>
<div class="acts" style="margin-top:10px"><button class="ghost" data-act="nav" data-v="train">Open workout</button></div></div>
<div class="card wide"><h3>Last 7 days</h3><div class="two">
<div><h4>Calories (dashed line is your goal)</h4>${bars(kc, g.kcal, 'var(--kcal)')}</div>
<div><h4>Water</h4>${bars(wt, g.water, 'var(--water)')}</div></div></div></div>`;
  },
  food(){
    const h = new Date().getHours(), def = h < 11 ? 0 : h < 16 ? 1 : h < 21 ? 2 : 3, m = get(cur).meals;
    return `<form id="mf" class="card row"><select name="c" aria-label="Meal">${CATS.map((c,i) => `<option ${i===def?'selected':''}>${c}</option>`).join('')}</select>
<input name="n" placeholder="Food, e.g. Greek yoghurt" required><input name="k" type="number" min="0" placeholder="kcal" required><input name="p" type="number" min="0" placeholder="Protein g"><button class="pri">Add food</button></form>` +
    CATS.map(c => { const l = m.filter(x => x.c === c);
      return `<div class="card"><div class="sh"><h3>${c}</h3><span>${sum(l, x => x.kcal)} kcal</span></div>` +
      (l.length ? l.map(x => `<div class="li"><div class="g">${esc(x.n)}${x.p ? `<small>${x.p} g protein</small>` : ''}</div><b>${x.kcal}</b><button class="x" data-act="delm" data-id="${x.id}" aria-label="Delete ${esc(x.n)}">×</button></div>`).join('') : '<p class="empty">Nothing added yet.</p>') + '</div>'; }).join('');
  },
  train(){
    const mon = add(cur, -wd(cur)), ex = plan(cur), dd = S.done[cur] || {};
    return `<div class="week">${DN.map((n, i) => { const d = add(mon, i);
      return `<button class="wk ${d===cur?'on':''}" data-act="go" data-d="${d}" aria-label="${n}"><small>${n}</small><b>${dt(d).getDate()}</b><i class="${(S.plan[i]||[]).length?'dot':''}"></i></button>`; }).join('')}</div>
<div class="card"><h3>${DN[wd(cur)]} workout: tap a set when you finish it</h3>` +
    (ex.length ? ex.map(e => { const n = dn(cur, e);
      return `<div class="ex ${n>=e.sets?'fin':''}"><div class="top"><div><strong>${esc(e.name)}</strong><br><small>${e.sets} sets of ${e.reps} reps</small></div>
<div><button class="kg" data-act="kg" data-id="${e.id}">${e.kg ? e.kg + ' kg' : 'Add weight'}</button><button class="x" data-act="dele" data-id="${e.id}" aria-label="Remove ${esc(e.name)}">×</button></div></div>
<div class="chips">${[...Array(e.sets)].map((_, i) => `<button class="chip ${i<n?'on':''}" data-act="set" data-id="${e.id}" data-i="${i+1}" aria-label="Set ${i+1}">${i+1}</button>`).join('')}</div></div>`; }).join('')
      : '<p class="empty">No exercises for this day yet. Add one below, or leave it as a rest day.</p>') + `</div>
<details class="card" ${ex.length?'':'open'}><summary>Add exercise to ${DN[wd(cur)]}</summary><form id="ef" class="row">
<input name="n" placeholder="Exercise, e.g. Back squat" required><input name="s" type="number" min="1" placeholder="Sets" required><input name="r" type="number" min="1" placeholder="Reps" required><input name="w" type="number" min="0" step="0.5" placeholder="kg"><button class="pri">Add exercise</button></form></details>`;
  },
  set(){
    const g = S.goals;
    return `<h2>Settings</h2><form id="gf" class="card row"><label class="f">Daily calories<input name="k" type="number" min="0" value="${g.kcal}"></label>
<label class="f">Daily water (ml)<input name="w" type="number" min="0" value="${g.water}"></label><label class="f">Daily protein (g)<input name="p" type="number" min="0" value="${g.protein}"></label>
<button class="pri" style="align-self:flex-end">Save goals</button></form>
<div class="card"><h3>Your data lives only in this browser. Back it up regularly.</h3><div class="acts" style="justify-content:flex-start">
<button class="ghost" data-act="export">Export backup</button><label class="btn">Import backup<input type="file" id="imp" accept=".json" hidden></label>
<button class="ghost" data-act="reset" style="color:var(--bad)">Delete all data</button></div></div>`;
  }
};

function render(){
  const t = new Date(), l = dt(cur).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
  $('#date').textContent = cur === iso(t) ? 'Today, ' + l : l;
  $('header').hidden = view === 'set';
  document.querySelectorAll('nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  $('#view').innerHTML = V[view]();
}
let tt; const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 2200); };

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, D = t.dataset;
  if (a === 'nav') view = D.v;
  else if (a === 'd') cur = add(cur, +D.n);
  else if (a === 'today') cur = iso(new Date());
  else if (a === 'go') cur = D.d;
  else if (a === 'water') day().water.push(+D.ml);
  else if (a === 'undo') day().water.pop();
  else if (a === 'delm') day().meals = day().meals.filter(m => m.id !== D.id);
  else if (a === 'set') { const m = S.done[cur] || (S.done[cur] = {}), i = +D.i; m[D.id] = m[D.id] === i ? i - 1 : i; }
  else if (a === 'dele') S.plan[wd(cur)] = plan(cur).filter(x => x.id !== D.id);
  else if (a === 'kg') { const x = plan(cur).find(x => x.id === D.id), v = prompt('Weight in kg', x.kg || ''); if (v === null) return; x.kg = +v || 0; }
  else if (a === 'export') {
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S)], {type:'application/json'}));
    l.download = 'fittrack-backup-' + iso(new Date()) + '.json'; l.click(); return;
  }
  else if (a === 'reset') { if (!confirm('Delete all your data? This cannot be undone.')) return; S = fresh(); toast('All data deleted'); }
  save(); render();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), id = e.target.id, uid = Date.now().toString(36);
  if (id === 'mf') day().meals.push({id:uid, c:f.c, n:f.n.trim(), kcal:+f.k, p:+f.p || 0});
  if (id === 'ef') (S.plan[wd(cur)] || (S.plan[wd(cur)] = [])).push({id:uid, name:f.n.trim(), sets:+f.s, reps:+f.r, kg:+f.w || 0});
  if (id === 'gf') { S.goals = {kcal:+f.k || 0, water:+f.w || 0, protein:+f.p || 0}; toast('Goals saved'); }
  save(); render();
});

document.addEventListener('change', e => {
  if (e.target.id !== 'imp' || !e.target.files[0]) return;
  const r = new FileReader();
  r.onload = () => { try { S = Object.assign(fresh(), JSON.parse(r.result)); save(); render(); toast('Backup imported'); } catch(x) { toast('That file is not a valid backup'); } };
  r.readAsText(e.target.files[0]);
});

render();