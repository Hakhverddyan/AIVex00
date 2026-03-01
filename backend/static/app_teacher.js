
async function safeJson(res){
  const txt = await res.text();
  try{ return { ok: res.ok, data: JSON.parse(txt) }; }
  catch{ return { ok: res.ok, data: { detail: txt || 'Unknown error' } }; }
}
const $ = (id)=>document.getElementById(id);
window.addEventListener('DOMContentLoaded', ()=>{
  document.body.classList.add('ready');
  document.querySelectorAll('.btn, .opt, .card').forEach((el)=>{
    el.addEventListener('mousemove', (e)=>{
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--x', x+'%');
      el.style.setProperty('--y', y+'%');
    });
  });
});

function getPw(){ return sessionStorage.getItem('teacher_pw') || ''; }
function setPw(v){ sessionStorage.setItem('teacher_pw', v); }

$('pw').value = getPw();

$('savePw').onclick = ()=>{
  setPw($('pw').value.trim());
  $('status').textContent = 'Password saved for this browser session.';
};
$('clearPw').onclick = ()=>{
  sessionStorage.removeItem('teacher_pw');
  $('pw').value='';
  $('status').textContent = 'Password cleared.';
};

$('demo').onclick = ()=>{
  $('topic').value = 'Normal Distribution';
  $('material').value =
`A normal distribution is a continuous probability distribution characterized by mean μ and standard deviation σ.
The pdf is f(x)=1/(σ√(2π)) exp(-(x-μ)^2/(2σ^2)). Standard normal has μ=0 and σ=1.
About 68% of data lie within 1σ, 95% within 2σ, 99.7% within 3σ. Z-score: z=(x-μ)/σ.
Central Limit Theorem: sums/averages approach normal under broad conditions.`;
};

let lastQuiz = null;

function escapeHtml(s){
  return (s??'').toString().replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderQuiz(quiz){
  const wrap = $('quizView');
  wrap.innerHTML='';
  quiz.questions.forEach(q=>{
    const div = document.createElement('div');
    div.className='q';
    div.innerHTML = `
      <div class="qhead">
        <div><b>Q${q.id}.</b> ${escapeHtml(q.question)}</div>
        <div class="small">Answer: <b>${String.fromCharCode(65+q.correct_index)}</b></div>
      </div>
      <div class="opts">
        ${q.options.map((o,i)=>`<div class="opt ${i===q.correct_index?'correct':''}">${escapeHtml(String.fromCharCode(65+i)+'. '+o)}</div>`).join('')}
      </div>
      ${q.explanation?`<div class="small" style="margin-top:8px">Explanation: ${escapeHtml(q.explanation)}</div>`:''}
    `;
    wrap.appendChild(div);
  });
}

$('generate').onclick = async ()=>{
  const pw = (getPw() || $('pw').value.trim());
  if(!pw){ $('status').textContent='Enter teacher password first.'; return; }
  setPw(pw);

  const payload = {
    topic: $('topic').value.trim(),
    material: $('material').value.trim(),
    language: $('lang').value,
    difficulty: $('diff').value,
    num_questions: parseInt($('n').value,10)
  };
  if(payload.topic.length<2){ $('status').textContent='Topic is required.'; return; }
  if(payload.material.length<10){ $('status').textContent='Please paste more source material.'; return; }

  $('status').textContent='Generating...';
  $('generate').disabled=true;

  try{
    const res = await fetch('/api/teacher/generate', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-Teacher-Password': pw },
      body: JSON.stringify(payload)
    });
    const parsed = await safeJson(res);
    const data = parsed.data;
    if(!res.ok){ $('status').textContent='Error: '+(data.detail||JSON.stringify(data)); return; }

    lastQuiz = data;
    const link = `${location.origin}/student?code=${encodeURIComponent(data.quiz_code)}`;
    $('outMeta').innerHTML = `
      <div class="flex flex-wrap gap-3 items-center mb-3">
        <div class="rounded-xl bg-emerald-500/20 border border-emerald-400/50 px-4 py-2">
          <span class="text-[11px] uppercase tracking-wider text-emerald-300">Quiz code</span>
          <p class="text-lg font-bold text-emerald-100 font-mono">${data.quiz_code}</p>
        </div>
        <div class="rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2">
          <span class="text-[11px] uppercase tracking-wider text-slate-400">Topic</span>
          <p class="text-sm font-semibold text-slate-100">${escapeHtml(data.topic)}</p>
        </div>
        <div class="rounded-xl bg-sky-500/20 border border-sky-400/50 px-4 py-2">
          <span class="text-[11px] uppercase tracking-wider text-sky-300">Questions</span>
          <p class="text-sm font-semibold text-slate-100">${data.questions.length}</p>
        </div>
      </div>
      <div class="text-xs text-slate-300">
        <span class="text-slate-400">Student link:</span>
        <a href="${link}" class="text-sky-300 hover:underline break-all" target="_blank">${link}</a>
      </div>
    `;
    $('copyLink').disabled=false;
    $('copyCode').disabled=false;
    $('downloadForms').disabled=false;

    renderQuiz(data);
    $('status').textContent='Done.';
    const outSection = document.getElementById('quizOutputSection');
    if (outSection) outSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }catch(e){
    $('status').textContent='Error: '+e;
  }finally{
    $('generate').disabled=false;
  }
};

$('copyLink').onclick = async ()=>{
  if(!lastQuiz) return;
  const link = `${location.origin}/student?code=${encodeURIComponent(lastQuiz.quiz_code)}`;
  await navigator.clipboard.writeText(link);
  $('status').textContent='Student link copied.';
};
$('copyCode').onclick = async ()=>{
  if(!lastQuiz) return;
  await navigator.clipboard.writeText(lastQuiz.quiz_code);
  $('status').textContent='Quiz code copied.';
};
$('downloadForms').onclick = ()=>{
  if(!lastQuiz) return;
  const a = document.createElement('a');
  a.href = `/api/forms/script/${encodeURIComponent(lastQuiz.quiz_code)}`;
  a.download = `google_forms_${lastQuiz.quiz_code}.gs`;
  document.body.appendChild(a);
  a.click(); a.remove();
};
