(() => {
  const $ = id => document.getElementById(id);
  const categories = ["Animals","Things found in a kitchen","Famous characters","Things at the beach","Sports","Foods","Things that are round","Video games","Things you bring on a trip","Things that make noise","School supplies","Things in outer space"];
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  let channel=null, myId=crypto.randomUUID(), myName="", room="", isHost=false, state=null, presencePlayers=[];
  const show = id => { ["home","lobby","game","results"].forEach(x=>$(x).classList.toggle("hidden",x!==id)); };
  const err = (id,msg="") => $(id).textContent=msg;
  const clean = s => String(s||"").trim().replace(/\s+/g," ");
  const code = () => Math.random().toString(36).slice(2,7).toUpperCase();
  const alive = () => (state?.players||[]).filter(p=>p.hearts>0);
  const current = () => alive()[state?.turnIndex % Math.max(1,alive().length)];
  const send = async (event,payload) => { if(channel) await channel.send({type:"broadcast",event,payload}); };
  function setConnection(text,ok=false){$("connection").textContent=text;$("connection").classList.toggle("online",ok);}
  function syncPresence(){
    if(!channel)return;
    const raw=channel.presenceState(); const list=[];
    Object.values(raw).flat().forEach(p=>{if(p.id&&!list.some(x=>x.id===p.id))list.push({id:p.id,name:p.name});});
    presencePlayers=list;
    if(isHost && (!state || state.status==="lobby")){
      const prior=state?.players||[];
      const players=list.map(p=>{const old=prior.find(x=>x.id===p.id);return old?{...old,name:p.name}:{...p,hearts:3,score:0};});
      if(state) state.players=players;
      renderLobby();
      if(state) send("state",{state});
    } else renderLobby();
  }
  async function connectRoom(roomCode,host){
    room=roomCode;isHost=host;myName=clean($("nickname").value)||"Player";
    setConnection("Connecting…");
    channel=client.channel("puffer-room-"+room,{config:{presence:{key:myId},broadcast:{self:false}}});
    channel.on("presence",{event:"sync"},syncPresence);
    channel.on("broadcast",{event:"state"},({payload})=>{
      if(payload?.state){state=payload.state;render();}
    });
    channel.on("broadcast",{event:"request_state"},()=>{if(isHost&&state)send("state",{state});});
    channel.on("broadcast",{event:"action"},({payload})=>{if(isHost)handleAction(payload);});
    channel.on("broadcast",{event:"start"},()=>{});
    const status=await new Promise(resolve=>channel.subscribe(s=>{if(s==="SUBSCRIBED")resolve(s);if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")resolve(s);}));
    if(status!=="SUBSCRIBED"){setConnection("Connection failed");err(host?"homeError":"homeError","Couldn't connect. Check your Supabase project and try again.");return;}
    await channel.track({id:myId,name:myName});
    setConnection("Connected",true);
    if(host){
      state={status:"lobby",players:[{id:myId,name:myName,hearts:3,score:0}],category:"",answers:[],turnIndex:0,round:1,fuse:0,fuseLimit:5+Math.floor(Math.random()*4),winner:null};
      show("lobby");renderLobby();await send("state",{state});
    }else{
      show("lobby");$("roomCodeDisplay").textContent=room;await send("request_state",{});
      setTimeout(()=>{if(!state)err("lobbyError","Waiting for the host… If this doesn't change, check the room code.");},2500);
    }
  }
  function renderLobby(){
    if(!channel)return;
    $("roomCodeDisplay").textContent=room;
    const people=presencePlayers.length?presencePlayers:(state?.players||[]);
    $("lobbyPlayers").innerHTML=people.map((p,i)=>`<div class="player-card">${escapeHtml(p.name)}${p.id===state?.players?.[0]?.id?' 👑':''}<small>${p.id===myId?'You':'Player '+(i+1)}</small></div>`).join("");
    $("startGame").classList.toggle("hidden",!isHost);
    $("startGame").disabled=people.length<2;
    $("lobbyNote").textContent=people.length<2?"Waiting for at least one more player…":`${people.length} players connected. ${isHost?"You're the host — start whenever you're ready!":"Waiting for the host to start."}`;
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function render(){
    if(!state)return;
    if(state.status==="lobby"){show("lobby");renderLobby();return;}
    if(state.status==="game"){show("game");renderGame();return;}
    if(state.status==="finished"){show("results");renderResults();}
  }
  function renderGame(){
    $("category").textContent=state.category;$("roundLabel").textContent="Round "+state.round;
    const alivePlayers=alive(), turn=current(), mine=turn?.id===myId;
    $("turnLabel").textContent=turn?`${turn.name}'s turn`:"Game over";
    $("answerArea").classList.toggle("hidden",!mine);
    $("waitingArea").classList.toggle("hidden",mine);
    $("waitingArea").textContent=turn?`It's ${turn.name}'s turn. Think of an answer!`:"Waiting…";
    $("heartsLabel").textContent=(state.players.find(p=>p.id===myId)?.hearts||0)>0?"❤️ ".repeat(state.players.find(p=>p.id===myId).hearts):"Eliminated";
    $("gamePlayers").innerHTML=state.players.map(p=>`<div class="score-item ${p.hearts<=0?'out':''}"><span>${escapeHtml(p.name)}${p.id===myId?' (you)':''}</span><b>${"❤️".repeat(p.hearts)} ${p.score} pts</b></div>`).join("");
    $("answerList").innerHTML=(state.answers||[]).slice().reverse().map(a=>`<div class="answer-item"><span>${escapeHtml(a.answer)}</span><span>${escapeHtml(a.name)}</span></div>`).join("")||'<div class="answer-item">No answers yet</div>';
    const pct=Math.min(100,(state.fuse/state.fuseLimit)*100);$("fuseBar").style.width=pct+"%";
    $("puffer").classList.toggle("wobble",state.fuse>=state.fuseLimit-2);
    $("pufferMessage").textContent=state.fuse>=state.fuseLimit-2?"Uh oh… the puffer is getting BIG!":"Pass the puffer before it pops!";
    $("submitAnswer").disabled=!mine;
    if(!mine)$("answerInput").value="";
  }
  function renderResults(){
    const winner=state.winner;$("winnerTitle").textContent=winner?`${winner.name} wins!`:"Game over!";
    $("winnerText").textContent="The puffer has settled. Nice playing!";
    $("finalPlayers").innerHTML=state.players.slice().sort((a,b)=>b.hearts-a.hearts||b.score-a.score).map(p=>`<div class="score-item"><span>${escapeHtml(p.name)}</span><b>${"❤️".repeat(p.hearts)} · ${p.score} pts</b></div>`).join("");
  }
  async function hostStart(){
    if(!isHost||presencePlayers.length<2)return;
    state.status="game";state.category=categories[Math.floor(Math.random()*categories.length)];state.answers=[];state.turnIndex=0;state.round=1;state.fuse=0;state.fuseLimit=5+Math.floor(Math.random()*4);state.players=presencePlayers.map(p=>({ ...p,hearts:3,score:0}));
    await send("state",{state});render();
  }
  async function handleAction(payload){
    if(!state||state.status!=="game"||payload?.type!=="answer")return;
    const turn=current();if(!turn||turn.id!==payload.playerId)return;
    const answer=clean(payload.answer);if(answer.length<1||answer.length>36)return;
    if(state.answers.some(a=>a.answer.toLowerCase()===answer.toLowerCase())){send("notice",{message:"That answer was already used!"});return;}
    const points=answer.length>=11?3:answer.length>=7?2:1;
    turn.score+=points;state.answers.push({answer,name:turn.name});state.fuse++;
    let popped=false;
    if(state.fuse>=state.fuseLimit){turn.hearts=Math.max(0,turn.hearts-1);popped=true;state.fuse=0;state.fuseLimit=5+Math.floor(Math.random()*4);state.answers=[];state.round++;}
    const remaining=alive();if(remaining.length<=1){state.status="finished";state.winner=remaining[0]||null;}
    else{const oldIndex=state.players.findIndex(p=>p.id===turn.id);let next=oldIndex;for(let i=0;i<state.players.length;i++){next=(next+1)%state.players.length;if(state.players[next].hearts>0)break;}state.turnIndex=state.players.filter(p=>p.hearts>0).findIndex(p=>p.id===state.players[next].id);}
    await send("state",{state});render();
    if(popped){$("puffer").classList.add("pop");$("pufferMessage").textContent=`POP! ${turn.name} lost a heart!`;setTimeout(()=>$("puffer").classList.remove("pop"),600);}
  }
  $("createRoom").onclick=()=>{err("homeError");if(!clean($("nickname").value)){err("homeError","Enter a nickname first.");return;}connectRoom(code(),true);};
  $("joinRoom").onclick=()=>{err("homeError");const c=clean($("roomCodeInput").value).toUpperCase();if(!clean($("nickname").value)){err("homeError","Enter a nickname first.");return;}if(c.length!==5){err("homeError","Enter the 5-character room code.");return;}connectRoom(c,false);};
  $("startGame").onclick=hostStart;
  $("submitAnswer").onclick=async()=>{const answer=clean($("answerInput").value);if(!answer){err("gameError","Type an answer first.");return;}if(!state||current()?.id!==myId)return;await send("action",{type:"answer",playerId:myId,answer});$("answerInput").value="";};
  $("answerInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("submitAnswer").click();});
  $("copyCode").onclick=async()=>{try{await navigator.clipboard.writeText(room);$("copyCode").textContent="Copied!";setTimeout(()=>$("copyCode").textContent="Copy invite code",1400);}catch{$("lobbyError") .textContent="Your room code is "+room;}};
  $("leaveLobby").onclick=()=>leave();
  $("backHome").onclick=()=>leave();
  $("playAgain").onclick=async()=>{if(isHost){state.players=presencePlayers.map(p=>({...p,hearts:3,score:0}));state.status="lobby";state.winner=null;await send("state",{state});render();}else{$("winnerText").textContent="Ask the host to start another game.";}}
  async function leave(){if(channel){await channel.untrack();await client.removeChannel(channel);}channel=null;state=null;room="";isHost=false;presencePlayers=[];setConnection("Disconnected");show("home");}
  setConnection("Ready");
})();