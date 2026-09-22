export const getToken=()=>typeof window==='undefined'?'':localStorage.getItem('haut_token')||'';
export const setToken=(v:string)=>localStorage.setItem('haut_token',v);
export const clearToken=()=>localStorage.removeItem('haut_token');
export async function api(path:string,init:RequestInit={}){const h=new Headers(init.headers||{});h.set('Content-Type','application/json');const t=getToken();if(t)h.set('Authorization',`Bearer ${t}`);const r=await fetch(`/api/proxy${path}`,{...init,headers:h,cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(b.message)?b.message.join(', '):b.message||`HTTP ${r.status}`);return b}
