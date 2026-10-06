/* Livre 02 TEST — suivi détaillé des soldats.
   Enregistre les choix de groupe, pertes, captures et récupérations dans
   parcours.soldier_events au moment où la partie est envoyée à Supabase. */
(function(){
  'use strict';

  const telemetry=window.AphanesTestTelemetry;
  if(!telemetry||telemetry.__soldierTrackingInstalled)return;
  telemetry.__soldierTrackingInstalled=true;

  let latestState=null;
  const originalBeforeSave=telemetry.beforeSave.bind(telemetry);
  const originalFetch=window.fetch.bind(window);

  function n(value){return Math.max(0,Math.floor(Number(value)||0));}
  function flags(s){return s?.flags&&typeof s.flags==='object'?s.flags:{};}
  function events(s){
    if(!Array.isArray(s.__testSoldierEvents))s.__testSoldierEvents=[];
    return s.__testSoldierEvents;
  }
  function activePage(s){
    try{
      const book=window.GameRuntime?.activeBook;
      const page=book?.pageByNode?.[s?.node];
      return Number.isInteger(page)?page:null;
    }catch(e){return null;}
  }
  function snapshot(s){
    const f=flags(s);
    const crew={};
    for(const [key,battle] of Object.entries(s?.crewBattles||{})){
      crew[key]=n(battle?.round);
    }
    return{
      runId:s?.__testAnalytics?.id||null,
      node:s?.node||null,
      soldiers:n(s?.soldiers),
      expedition:n(s?.expeditionSoldiers),
      ship:n(s?.shipSoldiers),
      commander:f.commander||null,
      crewRounds:crew,
      villageRound:n(f.villageAssaultBattle?.round),
      flagState:{
        eastDrugLoss:!!f.eastDrugLoss,
        villageBridgeSoldierLost:!!f.villageBridgeSoldierLost,
        villageGatorSoldierLost:!!f.villageGatorSoldierLost,
        villageForestSoldierLost:!!f.villageForestSoldierLost,
        secondIslandPartyReady:!!f.secondIslandPartyReady,
        islandLogTrapRolled:!!f.islandLogTrapRolled,
        beachFightResolved:!!f.beachFightResolved,
        beachYielded:!!f.beachYielded,
        krakenForcedCapture:!!f.krakenForcedCapture,
        capturedSoldiersRecovered:n(f.capturedSoldiersRecovered)
      }
    };
  }
  function addEvent(s,id,type,label,count,extra){
    const list=events(s);
    if(list.some(e=>e?.id===id))return;
    const f=flags(s);
    list.push({
      id,
      type,
      label,
      count:Number.isFinite(count)?n(count):null,
      node:s?.node||null,
      page:activePage(s),
      order:Array.isArray(s?.history)?s.history.length:0,
      soldiers:n(s?.soldiers),
      expedition:n(s?.expeditionSoldiers),
      ship:n(s?.shipSoldiers),
      captured:n(f.capturedSoldiers),
      ...(extra||{})
    });
  }
  function crewLabel(key){
    if(key==='pirates1')return 'Premier abordage contre les pirates';
    if(key==='pirates2')return 'Deuxième attaque pirate';
    return 'Combat de groupe';
  }

  function detectEvents(s){
    const f=flags(s);
    const current=snapshot(s);
    const prev=s.__testSoldierSnapshot&&s.__testSoldierSnapshot.runId===current.runId
      ? s.__testSoldierSnapshot:null;

    if(prev){
      if(prev.node==='c34'&&current.node==='c35'){
        addEvent(s,'deployment-island-1','deployment','Départ vers l’île du village',n(s.expeditionSoldiers),{
          detail:n(s.expeditionSoldiers)===0?'Vous êtes descendu seul.':'Soldats emmenés à terre.'
        });
      }
      if(!prev.commander&&current.commander){
        addEvent(s,'commander-choice','command',current.commander==='hale'?'Commandement du Resolute confié à Hale':'Commandement du Resolute confié à Briggs',null);
      }

      for(const [key,battle] of Object.entries(s?.crewBattles||{})){
        const round=n(battle?.round);
        const oldRound=n(prev.crewRounds?.[key]);
        if(round>oldRound&&n(battle?.last?.soldierLoss)>0){
          addEvent(s,`crew-${key}-${round}`,'death',crewLabel(key),n(battle.last.soldierLoss),{round});
        }
      }

      const transition=(name)=>!!current.flagState[name]&&!prev.flagState[name];
      if(transition('eastDrugLoss'))addEvent(s,'east-drug-loss','death','Attaque nocturne des faux marchands',1);
      if(transition('villageBridgeSoldierLost'))addEvent(s,'village-bridge-loss','death','Chute depuis le pont fragile',1);
      if(transition('villageGatorSoldierLost'))addEvent(s,'village-gator-loss','death','Attaque de l’alligator dans le ravin',1);
      if(transition('villageForestSoldierLost'))addEvent(s,'village-forest-loss','death','Disparition dans la forêt lors du détour',1);

      if(transition('secondIslandPartyReady')){
        const killed=n(f.pirateAnonymousLoss);
        if(killed>0)addEvent(s,'ship-pirate-loss','death','Attaque pirate du Resolute pendant l’exploration de l’île',killed);
        const volunteers=n(f.haleVolunteers);
        if(volunteers>0)addEvent(s,'hale-volunteers','reinforcement','Soldats survivants repartis avec Hale',volunteers);
        const escort=n(f.haleEscortSoldier);
        if(escort>0)addEvent(s,'hale-escort','reinforcement','Soldat resté avec Hale puis ajouté au groupe',escort);
        addEvent(s,'deployment-island-2','deployment','Départ vers l’île des hommes pâles',n(s.soldiers),{
          detail:'Effectif présent dans la chaloupe avec Hale.'
        });
      }

      if(transition('islandLogTrapRolled')&&n(f.islandSoldierDeaths)>0){
        addEvent(s,'island-log-trap-loss','death','Piège des troncs sur l’île des hommes pâles',n(f.islandSoldierDeaths));
      }

      if(transition('beachFightResolved')){
        const killed=n(f.beachSoldiersLost);
        if(killed>0)addEvent(s,'beach-fight-loss','death','Combat sur la plage contre les hommes pâles',killed);
        const captured=n(f.capturedSoldiers);
        if(captured>0)addEvent(s,'beach-fight-capture','capture','Capture après le combat sur la plage',captured);
      }
      if(transition('beachYielded')){
        const captured=n(f.capturedSoldiers);
        if(captured>0)addEvent(s,'beach-yield-capture','capture','Capture après avoir renoncé au combat sur la plage',captured);
      }
      if(transition('krakenForcedCapture')){
        const captured=n(f.capturedSoldiers);
        if(captured>0)addEvent(s,'kraken-capture','capture','Capture après le retour forcé vers l’île',captured);
      }

      const recoveredNow=n(current.flagState.capturedSoldiersRecovered);
      const recoveredBefore=n(prev.flagState.capturedSoldiersRecovered);
      if(recoveredNow>recoveredBefore){
        addEvent(s,`captured-recovered-${recoveredNow}`,'recovery','Soldats libérés de captivité',recoveredNow-recoveredBefore);
      }

      const villageRound=n(f.villageAssaultBattle?.round);
      if(villageRound>prev.villageRound&&n(f.villageAssaultBattle?.last?.soldierLoss)>0){
        addEvent(s,`village-assault-${villageRound}`,'death','Assaut contre le village des hommes pâles',n(f.villageAssaultBattle.last.soldierLoss),{round:villageRound});
      }

      if(current.node==='captiveSoloFlight'&&prev.node!=='captiveSoloFlight'&&n(f.capturedSoldiers)>0){
        addEvent(s,'solo-flight-prisoners','left_behind','Évasion en solitaire : soldats laissés prisonniers',n(f.capturedSoldiers));
      }
    }

    s.__testSoldierSnapshot=current;
  }

  telemetry.beforeSave=function(state){
    const result=originalBeforeSave(state);
    try{
      latestState=state;
      if(window.GameRuntime?.activeBook?.id==='providence-02')detectEvents(state);
    }catch(error){console.warn('APHANES TEST — suivi soldats',error);}
    return result;
  };

  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      const method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();
      if(method==='POST'&&/\/rest\/v1\/test_parties(?:\?|$)/.test(url)&&latestState&&init?.body){
        const payload=JSON.parse(init.body);
        if(payload&&payload.parcours&&/Providence/i.test(String(payload.livre||''))){
          payload.parcours.soldier_events=events(latestState).map(event=>({...event}));
          payload.parcours.soldier_tracking_version=1;
          init={...init,body:JSON.stringify(payload)};
        }
      }
    }catch(error){console.warn('APHANES TEST — ajout suivi soldats au payload',error);}
    return originalFetch(input,init);
  };
})();
