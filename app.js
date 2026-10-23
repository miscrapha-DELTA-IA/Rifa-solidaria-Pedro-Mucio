(() => {
  "use strict";
  const cfg=window.RIFA_CONFIG||{}, E=id=>document.getElementById(id);
  const format=n=>String(n).padStart(3,"0"), price=n=>n.toFixed(2).replace(".",",");
  let client=null, ready=false, admin=false, panel=false, saving=false;
  let sold=new Set(), selected=new Set();
  function notify(msg,bad=false) {
    const el=E("site-notice");el.textContent=msg;
    el.className="text-sm rounded-xl p-3 mb-4 "+(bad?"bg-rose-50 text-rose-900 border border-rose-200":"bg-blue-50 text-slate-800");
  }
  function status(msg,ok=false) {
    E("sync-badge").textContent=msg;
    E("sync-badge").className="text-xs font-semibold px-2 py-1 rounded-full "+(ok?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-900");
  }
  function redraw() {
    E("available-count").textContent=ready?(200-sold.size)+" / 200":"— / 200";
    const grid=E("numbers-grid");grid.replaceChildren();
    for(let n=1;n<=200;n++) {
      const b=document.createElement("button"), taken=sold.has(n), picked=selected.has(n);
      b.type="button";b.textContent=format(n);
      b.disabled=!ready||saving||(taken&&!admin);
      b.className="py-2.5 rounded-xl font-bold text-xs transition border "+(!ready?"bg-slate-100 text-slate-400 border-slate-200":taken?"bg-rose-500 text-white border-rose-600 line-through":picked?"bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-500":"bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200");
      b.setAttribute("aria-pressed",String(picked));b.setAttribute("aria-label","Número "+format(n)+(taken?" vendido":" disponível"));
      b.onclick=()=>onNumber(n);grid.appendChild(b);
    }
    const show=ready&&!admin&&selected.size>0;
    E("checkout-bar").classList.toggle("hidden",!show);
    if(show) {
      E("selected-list").textContent=[...selected].sort((a,b)=>a-b).map(format).join(", ");
      E("total-price").textContent=price(selected.size*20);
    }
  }
  async function refresh(quiet=false) {
    if(!client)return false;
    const result=await client.from("rifa_numeros").select("numero,vendido").order("numero");
    if(result.error||!result.data||result.data.length!==200) {
      ready=false;status("● Sem sincronização");
      notify("Cartela temporariamente indisponível. Atualize a página mais tarde.",true);
      redraw();return false;
    }
    sold=new Set(result.data.filter(v=>v.vendido).map(v=>v.numero));
    const removed=[...selected].filter(n=>sold.has(n));
    removed.forEach(n=>selected.delete(n));ready=true;status("● Sincronizado",true);
    if(removed.length)notify("Números "+removed.map(format).join(", ")+" foram vendidos e saíram da seleção.",true);
    else if(!quiet)E("site-notice").classList.add("hidden");
    redraw();return true;
  }
  function adminUI() {
    E("admin-panel").classList.toggle("hidden",!panel);
    E("admin-login-panel").classList.toggle("hidden",admin);
    E("admin-controls").classList.toggle("hidden",!admin);
    E("admin-toggle").textContent=admin?"Modo Organizador (conectado)":"Modo Organizador";
  }
  async function validateAdmin() {
    const res=await client.auth.getUser(),user=res.data&&res.data.user;
    admin=false;
    if(user) {
      const check=await client.from("rifa_admins").select("user_id").eq("user_id",user.id).maybeSingle();
      admin=!check.error&&!!check.data;
      if(!admin) {await client.auth.signOut();notify("Conta sem permissão de organizador.",true);}
    }
    adminUI();redraw();
  }
  async function login(ev) {
    ev.preventDefault();
    if(!client)return notify("Configure o Supabase primeiro.",true);
    const b=E("admin-login-button");b.disabled=true;
    try {
      const r=await client.auth.signInWithPassword({email:E("admin-email").value.trim(),password:E("admin-password").value});
      E("admin-password").value="";
      if(r.error)notify("E-mail ou senha incorretos.",true);
      else await validateAdmin();
    } catch(e) {console.error(e);notify("Erro ao entrar.",true);}
    finally {b.disabled=false;}
  }
  async function onNumber(n) {
    if(!ready||saving)return;
    if(admin) {
      const next=!sold.has(n);
      if(!confirm((next?"Marcar ":"Desmarcar ")+format(n)+" como vendido?"))return;
      saving=true;redraw();
      try {
        const r=await client.from("rifa_numeros").update({vendido:next}).eq("numero",n).select("numero,vendido").single();
        if(r.error||!r.data)throw r.error||new Error("Falha");
        await refresh(true);
      } catch(e) {console.error(e);notify("Não foi possível salvar a venda.",true);await refresh(true);}
      finally {saving=false;redraw();}
    } else {
      if(sold.has(n))return;
      if(selected.has(n))selected.delete(n);else selected.add(n);
      redraw();
    }
  }
  E("pick-random").onclick=()=>{
    if(!ready||admin)return;
    const choices=Array.from({length:200},(_,i)=>i+1).filter(n=>!sold.has(n)&&!selected.has(n));
    if(choices.length) {selected.add(choices[Math.floor(Math.random()*choices.length)]);redraw();}
  };
  E("copy-pix").onclick=async()=>{
    try {await navigator.clipboard.writeText("10048318388");E("copy-feedback").classList.remove("hidden");setTimeout(()=>E("copy-feedback").classList.add("hidden"),3000);}
    catch {notify("Selecione manualmente a chave Pix.",true);}
  };
  E("send-whatsapp").onclick=async()=>{
    if(!ready||!selected.size)return;
    const phone=(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,"");
    if(!/^55\d{10,11}$/.test(phone))return notify("Configure o WhatsApp no arquivo config.js.",true);
    if(!await refresh(true)||!selected.size)return;
    const nums=[...selected].sort((a,b)=>a-b).map(format).join(", "), total=price(selected.size*20);
    const text="Olá! Tenho interesse nos números *"+nums+"* da Rifa Solidária do Pedro Múcio (obra de Ilton Silva).\n\nTotal: *R$ "+total+"*\nPix CPF: 10048318388 (Pedro Múcio)\n\nVou enviar o comprovante. Aguardo confirmação de disponibilidade!";
    window.location.assign("https://wa.me/"+phone+"?text="+encodeURIComponent(text));
  };
  E("admin-toggle").onclick=()=>{panel=!panel;adminUI();};
  E("admin-login-form").onsubmit=login;
  E("admin-logout").onclick=async()=>{if(client)await client.auth.signOut();admin=false;adminUI();redraw();};
  E("copy-table").onclick=async()=>{
    if(!admin)return;
    let text="🎟️ RIFA SOLIDÁRIA — PEDRO MÚCIO (R$ 20,00)\n";
    for(let n=1;n<=200;n++)text+=(sold.has(n)?"❌":format(n))+(n%10===0?"\n":" - ");
    try {await navigator.clipboard.writeText(text);notify("Tabela copiada.");}
    catch {notify("Não foi possível copiar.",true);}
  };
  async function init() {
    redraw();
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY) {
      status("● Aguardando Supabase");notify("Cartela temporariamente indisponível: configurar Supabase.",true);return;
    }
    if(!window.supabase)return notify("Biblioteca Supabase indisponível.",true);
    try {
      client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
      await refresh();
      client.channel("rifa-pedro-numeros").on("postgres_changes",{event:"UPDATE",schema:"public",table:"rifa_numeros"},()=>{void refresh(true);}).subscribe();
      window.setInterval(()=>{if(document.visibilityState==="visible")void refresh(true);},30000);
      await validateAdmin();
    } catch(e) {console.error(e);ready=false;status("● Sem conexão");notify("Falha ao conectar ao Supabase.",true);redraw();}
  }
  void init();
})();