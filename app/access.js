(function(){
'use strict';

function config(manifest){
  const raw=manifest?.access;
  if(typeof raw==='string') return {mode:raw};
  return {...(raw||{mode:'free'}),mode:(raw?.mode||raw?.type||'free')};
}

function provider(){
  return window.ChroniquesPurchases || null;
}

function passwordStorageKey(manifest,cfg){
  return cfg.storageKey||('aphanes.test.password.'+(manifest?.id||manifest?.runtimeId||'book'));
}

function state(manifest){
  const cfg=config(manifest);
  if(cfg.mode==='password'){
    let unlocked=false;
    try{unlocked=localStorage.getItem(passwordStorageKey(manifest,cfg))==='1';}catch(e){}
    return {mode:'password',unlocked,productId:null,priceLabel:'',label:cfg.label||'Bientôt disponible'};
  }
  if(cfg.mode!=='paid'){
    return {mode:cfg.mode||'free',unlocked:true,productId:null,priceLabel:''};
  }

  const productId=cfg.productId||'';
  const p=provider();
  let unlocked=false;
  let priceLabel=cfg.priceLabel||'';

  try{
    if(p && typeof p.owns==='function') unlocked=p.owns(productId)===true;
    if(p && typeof p.priceFor==='function') priceLabel=p.priceFor(productId)||priceLabel;
  }catch(e){}

  return {mode:'paid',unlocked,productId,priceLabel};
}

async function requestUnlock(manifest,credential=''){
  const current=state(manifest);
  if(current.unlocked) return true;

  const cfg=config(manifest);
  if(current.mode==='password'){
    if(String(credential)===String(cfg.password||'')){
      try{localStorage.setItem(passwordStorageKey(manifest,cfg),'1');}catch(e){}
      return true;
    }
    return false;
  }

  const p=provider();
  if(p && typeof p.purchase==='function'){
    try{
      const result=await p.purchase(current.productId);
      if(result===true || result?.owned===true) return true;
      return state(manifest).unlocked;
    }catch(e){
      return false;
    }
  }

  window.dispatchEvent(new CustomEvent('chroniques:purchase-request',{
    detail:{productId:current.productId,manifest}
  }));
  return false;
}

window.LibraryAccess={config,state,requestUnlock};
})();