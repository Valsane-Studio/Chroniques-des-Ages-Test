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

function state(manifest){
  const cfg=config(manifest);
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

async function requestUnlock(manifest){
  const current=state(manifest);
  if(current.unlocked) return true;

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