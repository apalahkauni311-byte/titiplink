import { json, bad, getSession, requireAdmin, hashPassword, verifyPassword, randomToken, safeText, rateLimit } from "./lib/index.js";

const corsHeaders = { "X-Content-Type-Options":"nosniff", "Referrer-Policy":"strict-origin-when-cross-origin", "Content-Security-Policy":"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests" };
const reply=(body,status=200,headers={})=>new Response(body,{status,headers:{...corsHeaders,...headers}});
async function body(req){try{return await req.json()}catch{return null}}
async function cleanup(env){await env.DB.prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at <= ?").bind(Date.now()).run()}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url), path=url.pathname;
  if(path.startsWith("/api/")){
   try {
    if(request.method==="OPTIONS") return reply("",204,{"Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-CSRF-Token","Access-Control-Allow-Origin":url.origin});
    if(path==="/api/health") return json({ok:true});
    if(path==="/api/auth/register"&&request.method==="POST"){
      if(!await rateLimit(request,env,"register",5,3600)) return bad("Terlalu banyak percobaan",429);
      const b=await body(request); if(!b||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email||"")||typeof b.password!=="string"||b.password.length<10)return bad("Email atau password tidak valid",400);
      const email=b.email.trim().toLowerCase(), exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first(); if(exists)return bad("Email sudah terdaftar",409);
      const id=crypto.randomUUID(), hp=await hashPassword(b.password);
      await env.DB.prepare("INSERT INTO users(id,email,name,password_hash,password_salt,role,created_at) VALUES(?,?,?,?,?,'user',?)").bind(id,email,safeText(b.name||email.split("@")[0],80),hp.hash,hp.salt,Date.now()).run();
      return json({ok:true},201);
    }
    if(path==="/api/auth/login"&&request.method==="POST"){
      if(!await rateLimit(request,env,"login",10,900))return bad("Terlalu banyak percobaan",429);
      const b=await body(request);if(!b)return bad("Data tidak valid",400);
      const u=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(String(b.email||"").trim().toLowerCase()).first();
      if(!u||!await verifyPassword(String(b.password||""),u.password_salt,u.password_hash))return bad("Email atau password salah",401);
      const token=randomToken(32),csrf=randomToken(24),expires=Date.now()+7*86400000;
      await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at) VALUES(?,?,?,?)").bind(await hashToken(token),u.id,await hashToken(csrf),expires).run();
      return new Response(JSON.stringify({ok:true,user:{id:u.id,email:u.email,name:u.name,role:u.role},csrf}),{headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Set-Cookie":`tl_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`}});
    }
    if(path==="/api/auth/logout"&&request.method==="POST"){
      const sess=await getSession(request,env); if(sess)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hashToken(cookie(request,"tl_session"))).run();
      return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,"Content-Type":"application/json","Set-Cookie":"tl_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"}});
    }
    const session=await getSession(request,env);
    if(path==="/api/me")return json({user:session?{id:session.id,email:session.email,name:session.name,role:session.role}:null});
    if(path==="/api/config/ads"&&request.method==="GET")return json({config:await env.CONFIG.get("ads","json")||{on:false,platforms:[]}});
    if(path==="/api/config/video"&&request.method==="GET")return json({config:await env.CONFIG.get("video","json")||{pages:{ads:true,jel:true,pw:true}}});
    if(path==="/api/config/ads"&&request.method==="PUT"){const a=await requireAdmin(request,env);if(!a)return bad("Akses ditolak",403);if(!await csrfOk(request,env))return bad("CSRF tidak valid",403);const b=await body(request);if(!b||typeof b!=="object")return bad("Konfigurasi tidak valid",400);await env.CONFIG.put("ads",JSON.stringify(b));return json({ok:true})}
    if(path==="/api/config/video"&&request.method==="PUT"){const a=await requireAdmin(request,env);if(!a)return bad("Akses ditolak",403);if(!await csrfOk(request,env))return bad("CSRF tidak valid",403);const b=await body(request);if(!b||typeof b!=="object")return bad("Konfigurasi tidak valid",400);for(const k of ["pl","hd","dl"])if(b[k]?.url&&!/^https:\/\/\S+$/i.test(b[k].url))return bad("URL harus HTTPS",400);await env.CONFIG.put("video",JSON.stringify(b));return json({ok:true})}
    if(path==="/api/pastes"&&request.method==="POST"){
      if(!session)return bad("Harus masuk untuk membuat titipan",401);
      if(!await rateLimit(request,env,"paste:"+session.id,20,3600))return bad("Batas pembuatan titipan tercapai",429);
      if(!await csrfOk(request,env))return bad("CSRF tidak valid",403);
      const b=await body(request);if(!b||typeof b.title!=="string"||typeof b.body!=="string"||b.body.length>50000)return bad("Data titipan tidak valid",400);
      const blocked=await env.DB.prepare("SELECT domain FROM blocked_domains").all();
      const text=b.body.toLowerCase();for(const d of blocked.results||[])if(text.includes(d.domain.toLowerCase()))return bad("Domain terlarang",400);
      const slug=randomToken(9).toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12), pass=b.password?await hashPassword(String(b.password)):null;
      const expires=b.ttl?Date.now()+Math.min(Number(b.ttl)||86400000,31536000000):null;
      await env.DB.prepare("INSERT INTO pastes(slug,owner_id,title,body,password_hash,password_salt,visibility,created_at,expires_at,views) VALUES(?,?,?,?,?,?,?,?,?,0)").bind(slug,session.id,safeText(b.title,160),b.body,pass?.hash||null,pass?.salt||null,b.visibility==="unlisted"?"unlisted":"public",Date.now(),expires).run();
      return json({slug},201);
    }
    const pasteMatch=path.match(/^\/api\/pastes\/([a-z0-9-]{4,32})$/);
    if(pasteMatch&&request.method==="GET"){
      const p=await env.DB.prepare("SELECT slug,title,body,password_hash,password_salt,visibility,created_at,expires_at FROM pastes WHERE slug=?").bind(pasteMatch[1]).first();
      if(!p||p.expires_at&&p.expires_at<=Date.now())return bad("Titipan tidak ditemukan",404);
      if(p.password_hash)return json({slug:p.slug,title:p.title,passwordRequired:true,noindex:true});
      if(p.visibility==="unlisted")return json({slug:p.slug,title:p.title,body:p.body,noindex:true});
      await env.DB.prepare("UPDATE pastes SET views=views+1 WHERE slug=?").bind(p.slug).run();
      return json({slug:p.slug,title:p.title,body:p.body,noindex:false});
    }
    const unlock=path.match(/^\/api\/pastes\/([a-z0-9-]{4,32})\/unlock$/);
    if(unlock&&request.method==="POST"){
      if(!await rateLimit(request,env,"unlock:"+unlock[1],8,900))return bad("Terlalu banyak percobaan",429);
      const b=await body(request),p=await env.DB.prepare("SELECT * FROM pastes WHERE slug=?").bind(unlock[1]).first();
      if(!p||!p.password_hash||!await verifyPassword(String(b?.password||""),p.password_salt,p.password_hash))return bad("Password salah atau titipan tidak ditemukan",401);
      return json({slug:p.slug,title:p.title,body:p.body,noindex:true});
    }
    if(path==="/api/reports"&&request.method==="POST"){
      if(!await rateLimit(request,env,"report",10,3600))return bad("Batas laporan tercapai",429);
      const b=await body(request);if(!b||!/^[a-z0-9-]{4,32}$/.test(b.slug||""))return bad("Laporan tidak valid",400);
      await env.DB.prepare("INSERT INTO reports(slug,reason,created_at,status) VALUES(?,?,?,'pending')").bind(b.slug,safeText(b.reason||"Laporan pengunjung",300),Date.now()).run();return json({ok:true},201);
    }
    return bad("Endpoint tidak ditemukan",404);
   } catch(e){return bad("Kesalahan server",500)}
  }
  if(path==="/ads.txt")return reply(await env.CONFIG.get("ads_txt")||"",200,{"Content-Type":"text/plain; charset=utf-8"});
  if(path==="/robots.txt")return reply("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: "+url.origin+"/sitemap.xml\n",200,{"Content-Type":"text/plain; charset=utf-8"});
  if(path==="/sitemap.xml")return reply(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url></urlset>`,200,{"Content-Type":"application/xml; charset=utf-8"});
  return env.ASSETS.fetch(request);
 },
 async scheduled(controller,env,ctx){ctx.waitUntil(cleanup(env))}
};
function cookie(req,name){return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||""}
async function hashToken(t){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function csrfOk(req,env){const s=await getSession(req,env);if(!s)return false;const token=req.headers.get("X-CSRF-Token");return !!token&&await hashToken(token)===s.csrf_hash}
