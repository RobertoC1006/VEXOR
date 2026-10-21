import express from 'express';
import { generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';

export interface TestUser {id:string;email:string;confirmed?:boolean;role?:string;metadata?:Record<string,unknown>}
export async function startAuthServer(database:Client,initial:TestUser[],browserPassword?:string) {
  const users=new Map(initial.map(u=>[u.id,u]));
  const delivered:{email:string;kind:string}[]=[];
  const rejected=new Set<string>();
  const keys=await generateKeyPair('RS256');
  const otherKeys=await generateKeyPair('RS256');
  const api=express();api.use((_req,res,next)=>{res.setHeader('X-Supabase-Api-Version','2024-01-01');next();});api.use(express.json());
  let origin='';
  const issuer=()=>`${origin}/auth/v1`;
  // Optional browser-only fixture support. Never mounted by the application.
  if(browserPassword) {
    api.use((_req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','http://localhost:5174');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');if(_req.method==='OPTIONS'){res.sendStatus(204);return;}next();});
    const payload=(user:TestUser)=>({id:user.id,email:user.email,aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
    const refreshes=new Map<string,string>();
    api.post('/auth/v1/token',async(req,res)=>{
      const user=req.query.grant_type==='refresh_token'?users.get(refreshes.get(req.body.refresh_token)??''):[...users.values()].find(u=>u.email===req.body.email&&req.body.password===browserPassword);
      if(!user){res.status(400).json({code:'invalid_credentials',error_code:'invalid_credentials',msg:'Invalid credentials'});return;}
      const refresh=randomUUID();refreshes.set(refresh,user.id);
      res.json({access_token:await token(user.id),refresh_token:refresh,token_type:'bearer',expires_in:600,user:payload(user)});
    });
    api.post('/auth/v1/logout',(_req,res)=>{res.json({});});
  }
  api.get('/auth/v1/user',async(req,res)=>{
    const token=req.headers.authorization?.replace(/^Bearer /i,'');
    if(token==='auth-outage') {res.status(503).json({msg:'Unavailable',code:'unexpected_failure'});return;}
    try {
      const {payload}=await jwtVerify(token??'',keys.publicKey,{issuer:issuer(),audience:'authenticated',algorithms:['RS256']});
      const user=users.get(payload.sub??'');
      if(!user) throw new Error('Unknown user');
      res.json({id:user.id,email:user.email,aud:'authenticated',role:user.role??'authenticated',
        email_confirmed_at:user.confirmed===false?null:new Date().toISOString(),
        app_metadata:user.metadata??{},user_metadata:payload.user_metadata??{},is_anonymous:false,
        created_at:new Date().toISOString()});
    } catch {res.status(401).json({msg:'Invalid JWT',code:'bad_jwt'});}
  });
  api.post('/auth/v1/invite',async(req,res)=>{
    if(req.headers.apikey!=='test-secret') {res.status(401).json({msg:'Bad key'});return;}
    const email=req.body.email as string;
    if(rejected.has(email)) {res.status(422).json({msg:'Rejected address',code:'email_address_invalid'});return;}
    if([...users.values()].some(u=>u.email===email)) {res.status(422).json({msg:'User exists',code:'email_exists'});return;}
    const user={id:randomUUID(),email,confirmed:false};
    users.set(user.id,user);await database.query('insert into auth.users(id) values($1)',[user.id]);
    delivered.push({email,kind:'invite'});
    res.json({id:user.id,email,aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()});
  });
  api.post('/auth/v1/otp',(req,res)=>{
    if(req.body.create_user!==false || ![...users.values()].some(u=>u.email===req.body.email)) {res.status(400).json({msg:'Unexpected account creation'});return;}
    delivered.push({email:req.body.email as string,kind:'otp'});res.json({});
  });
  const server=api.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();if(!address || typeof address==='string') throw new Error('Auth mock sin puerto');
  origin=`http://127.0.0.1:${address.port}`;
  async function token(id:string,options:{expired?:boolean;wrongSignature?:boolean;audience?:string;issuer?:string;metadata?:Record<string,unknown>}={}) {
    return new SignJWT({role:'authenticated',user_metadata:options.metadata??{}}).setProtectedHeader({alg:'RS256'}).setSubject(id)
      .setIssuer(options.issuer??issuer()).setAudience(options.audience??'authenticated').setIssuedAt()
      .setExpirationTime(options.expired?Math.floor(Date.now()/1000)-10:'10m').sign(options.wrongSignature?otherKeys.privateKey:keys.privateKey);
  }
  return {url:origin,users,delivered,rejected,token,async close(){await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
