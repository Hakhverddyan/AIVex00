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

async function safeJson(res){
  const txt = await res.text();
  try{ return { ok: res.ok, data: JSON.parse(txt) }; }
  catch{ return { ok: res.ok, data: { detail: txt || 'Unknown error' } }; }
}
document.getElementById('goStudent').addEventListener('click', ()=>location.href='/student');
document.getElementById('goTeacher').addEventListener('click', ()=>location.href='/teacher');
