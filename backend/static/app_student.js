
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

function escapeHtml(s){
  return (s??'').toString().replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

let quiz=null;
let chosen=[];
let submittedResults=null;


function qsParam(name){
  const u=new URL(location.href);
  return u.searchParams.get(name);
}

async function loadQuiz(code){
  $('status').textContent='Loading...';
  const res=await fetch(`/api/student/quiz/${encodeURIComponent(code)}`);
  const data=await res.json();
  if(!res.ok){ $('status').textContent='Error: '+(data.detail||JSON.stringify(data)); return; }
  quiz=data;
  chosen=new Array(quiz.questions.length).fill(-1);
  submittedResults=null;
  $('downloadForms').disabled=false;
  $('submit').disabled=false;
  $('reset').disabled=false;
  $('results').innerHTML='Submit to see your score.';
  $('status').textContent=`Loaded: ${quiz.topic} (${quiz.questions.length} questions)`;
  renderQuiz(false);
}

function renderQuiz(locked){
  const area=$('quizArea');
  if(!quiz){ area.textContent='No quiz loaded.'; return; }

  let correctMap = null;
  if(locked && Array.isArray(submittedResults)){
    correctMap = new Map(submittedResults.map(r=>[r.id,r]));
  }

  area.innerHTML = `
    <div class="kv">
      <div><b>Quiz:</b> ${escapeHtml(quiz.topic)}</div>
      <div><b>Code:</b> ${quiz.quiz_code}</div>
      <div><b>Questions:</b> ${quiz.questions.length}</div>
    </div>
    <div id="qwrap"></div>
  `;
  const wrap=area.querySelector('#qwrap');
  quiz.questions.forEach((q,qi)=>{
    const r = correctMap ? correctMap.get(q.id) : null;
    const statusTxt = locked && r ? (r.is_correct?'<span class="tag good">Correct</span>':'<span class="tag bad">Wrong</span>') :
                     (chosen[qi]===-1?'Not answered':('Selected: '+String.fromCharCode(65+chosen[qi])));
    const div=document.createElement('div');
    div.className='q';
    div.innerHTML=`
      <div class="qhead">
        <div><b>Q${q.id}.</b> ${escapeHtml(q.question)}</div>
        <div class="small">${statusTxt}</div>
      </div>
      <div class="opts">
        ${q.options.map((o,oi)=>{
          let cls='opt';
          if(chosen[qi]===oi) cls+=' selected';
          if(locked && r){
            if(oi===r.correct_index) cls+=' correct';
            if(oi===r.chosen_index && !r.is_correct) cls+=' wrong';
          }
          return `<div class="${cls}" data-qi="${qi}" data-oi="${oi}">${escapeHtml(String.fromCharCode(65+oi)+'. '+o)}</div>`;
        }).join('')}
      </div>
      ${(locked && r && r.explanation)?`<div class="small" style="margin-top:8px">Explanation: ${escapeHtml(r.explanation)}</div>`:''}
    `;
    wrap.appendChild(div);
  });

  // Click handlers only when not locked
  wrap.querySelectorAll('.opt').forEach(el=>{
    el.onclick=()=>{
      if(locked) return;
      const qi=parseInt(el.dataset.qi,10);
      const oi=parseInt(el.dataset.oi,10);
      chosen[qi]=oi;
      renderQuiz(false);
    };
  });
}


$('load').onclick=()=>{
  const code=($('code').value.trim()||qsParam('code')||'').toUpperCase();
  if(code.length<3){ $('status').textContent='Enter a quiz code.'; return; }
  $('code').value=code;
  loadQuiz(code);
};

$('downloadForms').onclick=()=>{
  if(!quiz) return;
  const a=document.createElement('a');
  a.href=`/api/forms/script/${encodeURIComponent(quiz.quiz_code)}`;
  a.download=`google_forms_${quiz.quiz_code}.gs`;
  document.body.appendChild(a);
  a.click(); a.remove();
};

$('reset').onclick=()=>{
  if(!quiz) return;
  chosen=new Array(quiz.questions.length).fill(-1);
  submittedResults=null;
  $('results').innerHTML='Submit to see your score.';
  renderQuiz(false);
};

$('submit').onclick=async ()=>{
  if(!quiz) return;
  // Require answering all questions
  const missing = chosen.map((v,i)=>v===-1?i+1:null).filter(v=>v!==null);
  if(missing.length){
    $('status').textContent = 'Please answer all questions before submitting. Missing: ' + missing.join(', ');
    return;
  }
  $('status').textContent='Submitting...';
  const res=await fetch('/api/student/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quiz_code:quiz.quiz_code,answers:chosen})});
  const data=await res.json();
  if(!res.ok){ $('status').textContent='Error: '+(data.detail||JSON.stringify(data)); return; }

  $('status').textContent='Submitted.';
  $('results').innerHTML=`
    <div class="kv">
      <div><b>Score:</b> ${data.score}/${data.total}</div>
      <div><b>Percent:</b> ${data.percent}%</div>
    </div>
    <div class="small" style="margin-top:8px">Correct answers are shown below.</div>
  `;

  // Summary like: 1 - B, 2 - C ...
  const letters = (i)=>String.fromCharCode(97+i);
  const summary = data.results
    .slice()
    .sort((a,b)=>a.id-b.id)
    .map(r=>`${r.id} - ${letters(r.correct_index)}`)
    .join(', ');
  const sumEl=document.createElement('div');
  sumEl.className='small';
  sumEl.style.marginTop='8px';
  sumEl.innerHTML = `<b>Answer key:</b> ${escapeHtml(summary)}`;
  $('results').appendChild(sumEl);

  submittedResults = data.results;
  renderQuiz(true);
};

(function init(){
  const code=qsParam('code');
  if(code){
    $('code').value=code.toUpperCase();
    loadQuiz(code.toUpperCase());
  }
})();
