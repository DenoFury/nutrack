const KEY = 'fittrack-v1';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const $ = id => document.getElementById(id);

let state = { goals:{kcal:2200, water:2500}, days:{}, plan:{}, done:{} };
try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch(e){}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} };

const iso = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
let current = iso(new Date());
let gymDay = (new Date().getDay() + 6) % 7; // Monday = 0

const day = () => (state.days[current] ||= { meals:[], water:[] });
const weekdayOf = s => (new Date(s + 'T12:00:00').getDay() + 6) % 7;

function setBar(el, value, goal){
  const pct = goal ? Math.min(100, value/goal*100) : 0;
  el.style.width = pct + '%';
  el.classList.toggle('done', el.classList.contains('water') && value >= goal && goal > 0);
  el.classList.toggle('over', el.classList.contains('kcal') && value > goal && goal > 0);
}

function renderToday(){
  const d = day();
  const kcal = d.meals.reduce((s,m) => s + m.kcal, 0);
  const water = d.water.reduce((s,n) => s + n, 0);
  $('kcalTotal').textContent = kcal;
  $('waterTotal').textContent = water;
  $('kcalGoal').value = state.goals.kcal;
  $('waterGoal').value = state.goals.water;
  setBar($('kcalBar'), kcal, state.goals.kcal);
  setBar($('waterBar'), water, state.goals.water);

  const list = $('mealList');
  list.innerHTML = '';
  if (!d.meals.length) list.innerHTML = '<li class="empty">Nothing logged yet. Add your first meal above.</li>';
  d.meals.forEach((m, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="grow"></span><span class="meta">' + m.kcal + ' kcal</span>' +
      '<button class="del" aria-label="Delete">×</button>';
    li.querySelector('.grow').textContent = m.name;
    li.querySelector('.del').onclick = () => { d.meals.splice(i,1); save(); renderToday(); };
    list.appendChild(li);
  });
}

function renderGym(){
  const picker = $('dayPicker');
  picker.innerHTML = '';
  DAYS.forEach((n, i) => {
    const b = document.createElement('button');
    b.textContent = n.slice(0,3);
    b.setAttribute('aria-label', n);
    if (i === gymDay) b.classList.add('active');
    b.onclick = () => { gymDay = i; renderGym(); };
    picker.appendChild(b);
  });
  $('dayTitle').textContent = DAYS[gymDay];

  const exs = state.plan[gymDay] || [];
  const done = state.done[current] || [];
  const list = $('exList');
  list.innerHTML = '';
  if (!exs.length) list.innerHTML = '<li class="empty">Rest day, or add your first exercise below.</li>';
  exs.forEach((ex, i) => {
    const li = document.createElement('li');
    if (done.includes(ex.id)) li.classList.add('done');
    li.innerHTML = '<input type="checkbox" aria-label="Done">' +
      '<span class="grow"><strong></strong><div class="meta"></div></span>' +
      '<button class="del" aria-label="Delete">×</button>';
    li.querySelector('strong').textContent = ex.name;
    li.querySelector('.meta').textContent = ex.sets + ' × ' + ex.reps + (ex.kg ? ' @ ' + ex.kg + ' kg' : '');
    const cb = li.querySelector('input');
    cb.checked = done.includes(ex.id);
    cb.onchange = () => {
      const arr = state.done[current] ||= [];
      if (cb.checked) arr.push(ex.id); else arr.splice(arr.indexOf(ex.id), 1);
      save(); renderGym();
    };
    li.querySelector('.del').onclick = () => { exs.splice(i,1); save(); renderGym(); };
    list.appendChild(li);
  });
}

function setDate(s){
  current = s;
  $('date').value = s;
  gymDay = weekdayOf(s);
  renderToday(); renderGym();
}
const shift = n => { const d = new Date(current + 'T12:00:00'); d.setDate(d.getDate() + n); setDate(iso(d)); };

$('prev').onclick = () => shift(-1);
$('next').onclick = () => shift(1);
$('date').onchange = e => e.target.value && setDate(e.target.value);

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  $('today').hidden = t.dataset.tab !== 'today';
  $('gym').hidden = t.dataset.tab !== 'gym';
});

$('mealForm').onsubmit = e => {
  e.preventDefault();
  day().meals.push({ name: $('mealName').value.trim(), kcal: +$('mealKcal').value });
  e.target.reset(); save(); renderToday();
};

document.querySelectorAll('[data-ml]').forEach(b => b.onclick = () => {
  day().water.push(+b.dataset.ml); save(); renderToday();
});
$('waterUndo').onclick = () => { day().water.pop(); save(); renderToday(); };

$('kcalGoal').onchange = e => { state.goals.kcal = +e.target.value || 0; save(); renderToday(); };
$('waterGoal').onchange = e => { state.goals.water = +e.target.value || 0; save(); renderToday(); };

$('exForm').onsubmit = e => {
  e.preventDefault();
  (state.plan[gymDay] ||= []).push({
    id: Date.now().toString(36), name: $('exName').value.trim(),
    sets: +$('exSets').value, reps: +$('exReps').value, kg: +$('exKg').value || 0
  });
  e.target.reset(); save(); renderGym();
};

setDate(current);
