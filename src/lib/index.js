export const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...(extra.headers||{})}});
export const bad=(message,status=400)=>json({error:message},status);
export const safeText=(v,max=500)=>String(v).replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max);
export const randomToken=(n=32)=>{const b=crypto.getRandomValues(new Uint8Array(n));return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")};
export async function hashPassword(password,salt=randomToken(16)){const enc=new TextEncoder(),key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:310000,hash:"SHA-256"},key,256);return {salt,hash:hex(bits)}}
export async function verifyPassword(password,salt,expected){if(!salt||!expected)return false;const got=await hashPassword(password,salt);return constantTime(got.hash,expected)}
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
function constantTime(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function sha(s){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))}
function cookie(req,n){return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(n+"="))?.slice(n.length+1)||""}
export async function getSession(req,env){const token=cookie(req,"tl_session");if(!token)return null;return await env.DB.prepare("SELECT u.id,u.email,u.name,u.role,s.csrf_hash,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(await sha(token),Date.now()).first()}
export async function requireAdmin(req,env){const s=await getSession(req,env);return s?.role==="admin"?s:null}
export async function rateLimit(req,env,key,max,windowMs){const ip=req.headers.get("CF-Connecting-IP")||"unknown",k="rl:"+key+":"+ip;let x=Number(await env.CONFIG.get(k)||0);if(x>=max)return false;await env.CONFIG.put(k,String(x+1),{expirationTtl:Math.ceil(windowMs/1000)});return true}
