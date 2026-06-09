import { useState, useEffect, useCallback } from "react";

const NAVY="#16243F",ORANGE="#E2571E",GREEN="#16A34A",RED="#DC2626",YELLOW="#D97706",LIGHT="#F0F4F8";
const SK = k => `cpm_v1_${k}`;
const getStore = async k => { try { const v=localStorage.getItem(SK(k)); return v?JSON.parse(v):null; } catch{return null;} };
const setStore = async (k,v) => { try{localStorage.setItem(SK(k),JSON.stringify(v));return true;}catch{return false;} };
const haversine = (a,b,c,d) => { const R=6371000,f1=a*Math.PI/180,f2=c*Math.PI/180,df=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180,x=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); };
const nowTime = () => new Date().toLocaleTimeString("es-SV",{hour:"2-digit",minute:"2-digit"});
const todayKey = () => new Date().toISOString().slice(0,10);
const genId = () => Math.random().toString(36).slice(2,10);
const fmtDate = d => new Date(d+"T12:00").toLocaleDateString("es-SV",{weekday:"short",day:"numeric",month:"short"});

const DEFAULT_CFG = { fenceLat:13.7006, fenceLng:-89.2008, fenceRadius:300, locationName:"Hospital Nacional Rosales" };
const DEFAULT_CO  = { id:"cpm001", name:"Capital PM", adminPin:"1234" };

// ── Shared UI ────────────────────────────────────────────────────────────────
const Logo = ({size=32}) => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <svg width={size} height={size} viewBox="0 0 52 52">
      <polygon points="26,1 51,26 26,51 1,26" fill="#C7CFD8"/>
      <polygon points="26,1 51,26 26,26" fill={NAVY}/>
      <polygon points="51,26 26,51 26,26" fill={ORANGE}/>
      <polygon points="1,26 26,51 26,26" fill="#8A97A6"/>
    </svg>
    <div>
      <div style={{fontWeight:900,fontSize:size*0.65,color:"#C7CFD8",lineHeight:1}}>CAPITAL <span style={{color:ORANGE}}>PM</span></div>
      <div style={{fontSize:size*0.28,color:"#8A97A6",letterSpacing:1}}>GESTIÓN · SERVICIOS · SOLUCIONES</div>
    </div>
  </div>
);

const Btn = ({children,onClick,color=ORANGE,outline=false,small=false,disabled=false,full=false,style:sx={}}) => (
  <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":disabled?"#D1D5DB":color,color:outline?color:"white",border:`2px solid ${disabled?"#D1D5DB":color}`,borderRadius:12,padding:small?"8px 16px":"14px 24px",fontSize:small?13:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.6:1,...sx}}>
    {children}
  </button>
);

const Card = ({children,style:sx={}}) => (
  <div style={{background:"white",borderRadius:16,padding:"18px 20px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",marginBottom:12,...sx}}>{children}</div>
);

const StatusBadge = ({status}) => {
  const map = {P:{label:"Presente",color:GREEN,bg:"#DCFCE7"},A:{label:"Ausente",color:RED,bg:"#FEE2E2"},T:{label:"Tardanza",color:YELLOW,bg:"#FEF3C7"},"-":{label:"Sin registro",color:"#9CA3AF",bg:"#F3F4F6"}};
  const s = map[status]||map["-"];
  return <span style={{background:s.bg,color:s.color,borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:700}}>{s.label}</span>;
};

const Tag = ({children,color=NAVY}) => (
  <span style={{background:color+"18",color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{children}</span>
);

function PinPad({pin,setPin,onConfirm,label="Ingresa tu PIN"}) {
  const keys = [1,2,3,4,5,6,7,8,9,"←",0,"✓"];
  const press = k => {
    if(k==="←") setPin(p=>p.slice(0,-1));
    else if(k==="✓") { if(pin.length>=4) onConfirm(pin); }
    else if(pin.length<4) setPin(p=>p+k);
  };
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:16,fontWeight:600}}>{label}</div>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:24}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<pin.length?NAVY:"#E5E7EB",transition:"background 0.15s"}}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto"}}>
        {keys.map(k=>(
          <button key={k} onClick={()=>press(k)} style={{padding:"16px 0",borderRadius:12,border:"none",background:k==="✓"?NAVY:k==="←"?"#FEE2E2":"#F3F4F6",color:k==="✓"?"white":k==="←"?RED:NAVY,fontSize:k==="✓"||k==="←"?20:22,fontWeight:700,cursor:"pointer"}}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function GeoIndicator({status,distance,radius}) {
  if(!status) return null;
  const states = {
    checking:{color:"#6B7280",bg:"#F3F4F6",icon:"📡",msg:"Verificando ubicación..."},
    valid:{color:GREEN,bg:"#DCFCE7",icon:"✅",msg:`Estás dentro del área (${Math.round(distance)}m)`},
    invalid:{color:RED,bg:"#FEE2E2",icon:"📍",msg:`Fuera del área — ${Math.round(distance)}m (radio: ${radius}m)`},
    denied:{color:YELLOW,bg:"#FEF3C7",icon:"⚠️",msg:"Permiso de ubicación denegado"},
    error:{color:YELLOW,bg:"#FEF3C7",icon:"⚠️",msg:"No se pudo obtener la ubicación"},
  };
  const s = states[status]||states.error;
  return (
    <div style={{background:s.bg,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <span style={{fontSize:18}}>{s.icon}</span>
      <span style={{fontSize:13,color:s.color,fontWeight:600}}>{s.msg}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]   = useState("boot");
  const [company, setCompany] = useState(null);
  const [config,  setConfig]  = useState(DEFAULT_CFG);
  const [employees, setEmps]  = useState([]);
  const [records, setRecs]    = useState({});
  const [employee, setEmp]    = useState(null); // logged-in employee
  const [pin, setPin]         = useState("");
  const [dui, setDui]         = useState("");
  const [geoStatus, setGeoS]  = useState(null);
  const [geoDist, setGeoDist] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState("dash");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending]   = useState([]);
  const [syncing, setSyncing]   = useState(false);
  const [localPin, setLocalPin] = useState("");
  const [editEmployee, setEditEmp] = useState(null); // employee being edited
  // admin add form
  const [form, setForm]       = useState({name:"",dui:"",pin:"",puesto:"Auxiliar de Conserjería de Cocina",turno:"Turno 1",phone:"",salary:"410.00"});
  const [reportDate, setRptDate] = useState(todayKey());

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // ── Sync pending queue → main records ──
  const syncNow = useCallback(async (queue, currentRecs) => {
    if(!queue||queue.length===0) return;
    setSyncing(true);
    const updated = {...currentRecs};
    queue.forEach(item => {
      if(!updated[item.date]) updated[item.date]=[];
      const idx = updated[item.date].findIndex(r=>r.id===item.id);
      if(idx>=0) updated[item.date][idx]={...updated[item.date][idx],...item};
      else updated[item.date].push(item);
    });
    await setStore("records", updated);
    await setStore("pending_queue", []);
    setRecs(updated);
    setPending([]);
    setSyncing(false);
    showToast(`☁️ ${queue.length} registro(s) sincronizados`);
  }, []);

  // ── Load data ──
  useEffect(()=>{
    (async()=>{
      const co   = await getStore("company")       || DEFAULT_CO;
      const cfg  = await getStore("config")        || DEFAULT_CFG;
      const emps = await getStore("employees")     || [];
      const recs = await getStore("records")       || {};
      const pq   = await getStore("pending_queue") || [];
      setCompany(co); setConfig(cfg); setEmps(emps); setRecs(recs); setPending(pq);
      // auto-sync pending if online
      if(navigator.onLine && pq.length>0) syncNow(pq, recs);
      setScreen("landing");
    })();
  },[]);

  // ── Online/offline listeners ──
  useEffect(()=>{
    const goOnline = async () => {
      setIsOnline(true);
      const pq = await getStore("pending_queue") || [];
      const recs = await getStore("records") || {};
      if(pq.length>0) syncNow(pq, recs);
    };
    const goOffline = () => { setIsOnline(false); showToast("📴 Sin conexión — registros guardados localmente","warn"); };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return ()=>{ window.removeEventListener("online",goOnline); window.removeEventListener("offline",goOffline); };
  },[syncNow]);

  const saveEmps = async (e) => { setEmps(e); await setStore("employees",e); };
  const saveRecs = async (r) => { setRecs(r); await setStore("records",r); };
  const saveCfg  = async (c) => { setConfig(c); await setStore("config",c); };

  // ── Geo check ──
  const checkGeo = useCallback(()=>{
    setGeoS("checking"); setGeoDist(null); setUserPos(null);
    if(!navigator.geolocation){ setGeoS("error"); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const dist = haversine(pos.coords.latitude,pos.coords.longitude,config.fenceLat,config.fenceLng);
        setGeoDist(dist); setUserPos({lat:pos.coords.latitude,lng:pos.coords.longitude});
        setGeoS(dist<=config.fenceRadius?"valid":"invalid");
      },
      ()=>setGeoS("denied"),
      {enableHighAccuracy:true,timeout:10000}
    );
  },[config]);

  // ── Get today's record for employee ──
  const getTodayRec = (empId) => {
    const dk = todayKey();
    return (records[dk]||[]).find(r=>r.employeeId===empId) || null;
  };

  // ── Clock in/out ──
  const clockAction = async (action) => {
    if(geoStatus!=="valid" && geoStatus!=="invalid") return;
    setLoading(true);
    const dk = todayKey();
    const time = nowTime();
    const now  = new Date();
    const shift = employee.turno;
    const shiftStart = shift.includes("1") ? (employee.puesto.includes("Bodega")?"06:00":"05:00") : (employee.puesto.includes("Bodega")?"14:00":"13:00");
    const [sh,sm] = shiftStart.split(":").map(Number);
    const late = now.getHours()>sh || (now.getHours()===sh && now.getMinutes()>10);

    if(isOnline) {
      // ── Online: save directly to main records ──
      const recs = {...records};
      if(!recs[dk]) recs[dk]=[];
      if(action==="in"){
        const existing = recs[dk].find(r=>r.employeeId===employee.id);
        if(!existing) recs[dk].push({ id:genId(), employeeId:employee.id, employeeName:employee.name,
          puesto:employee.puesto, turno:employee.turno, salary:employee.salary,
          date:dk, checkIn:time, checkInLat:userPos?.lat, checkInLng:userPos?.lng,
          checkInValid:geoStatus==="valid", checkOut:null, status:late?"T":"P" });
      } else {
        const idx = recs[dk].findIndex(r=>r.employeeId===employee.id);
        if(idx>=0) recs[dk][idx]={...recs[dk][idx],checkOut:time,checkOutLat:userPos?.lat,checkOutLng:userPos?.lng,checkOutValid:geoStatus==="valid"};
      }
      await saveRecs(recs);
      showToast(action==="in"?"✅ Entrada registrada":"🏁 Salida registrada");
    } else {
      // ── Offline: save to pending queue ──
      const newItem = action==="in"
        ? { id:genId(), employeeId:employee.id, employeeName:employee.name,
            puesto:employee.puesto, turno:employee.turno, salary:employee.salary,
            date:dk, checkIn:time, checkInLat:userPos?.lat, checkInLng:userPos?.lng,
            checkInValid:geoStatus==="valid", checkOut:null, status:late?"T":"P", _offline:true }
        : { id: (records[dk]||[]).find(r=>r.employeeId===employee.id)?.id || genId(),
            employeeId:employee.id, date:dk,
            checkOut:time, checkOutLat:userPos?.lat, checkOutLng:userPos?.lng, checkOutValid:geoStatus==="valid", _offline:true };
      const newPending = [...pending, newItem];
      setPending(newPending);
      await setStore("pending_queue", newPending);
      // Also update local records view so employee sees their record
      const recs = {...records};
      if(!recs[dk]) recs[dk]=[];
      if(action==="in") recs[dk].push(newItem);
      else { const idx=recs[dk].findIndex(r=>r.employeeId===employee.id); if(idx>=0) recs[dk][idx]={...recs[dk][idx],...newItem}; }
      setRecs(recs);
      showToast("📴 Guardado sin conexión — se sincronizará al recuperar señal","warn");
    }
    setLoading(false);
    setGeoS(null);
  };

  // ── Attendance report ──
  const getReport = (date) => (records[date]||[]);

  const exportCSV = (date) => {
    const rows = getReport(date);
    if(!rows.length){ showToast("Sin registros para esta fecha","warn"); return; }
    import("xlsx").then(({utils, writeFile}) => {
      const data = [
        ["Nombre","DUI","Puesto","Turno","Salario","ISSS","AFP","Institucion AFP","Entrada","Salida","Estado","Geo Entrada","Geo Salida"]
      ];
      rows.forEach(r=>{
        const emp = employees.find(e=>e.id===r.employeeId)||{};
        data.push([
          r.employeeName, emp.dui||"", r.puesto, r.turno, r.salary||"",
          emp.isss||"", emp.afp||"", emp.afpName||"",
          r.checkIn||"", r.checkOut||"",
          r.status==="P"?"Presente":r.status==="A"?"Ausente":r.status==="T"?"Tardanza":"",
          r.checkInValid?"Si":"No", r.checkOutValid?"Si":"No"
        ]);
      });
      const ws = utils.aoa_to_sheet(data);
      ws["!cols"] = [30,16,30,12,10,14,14,14,12,12,12,12,12].map(w=>({wch:w}));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Asistencia");
      writeFile(wb, `Asistencia_CapitalPM_${date}.xlsx`);
      showToast("Excel exportado correctamente");
    });
  };

  // ══════════════════════════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════════════════════════

  const wrap = (children, bg=LIGHT) => (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"'Segoe UI',Trebuchet MS,sans-serif",maxWidth:480,margin:"0 auto",position:"relative"}}>
      {/* Offline banner */}
      {!isOnline && (
        <div style={{background:RED,color:"white",padding:"8px 16px",fontSize:13,fontWeight:700,textAlign:"center",position:"sticky",top:0,zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span>📴</span> Sin conexión — registros guardados localmente
        </div>
      )}
      {/* Syncing banner */}
      {isOnline && syncing && (
        <div style={{background:ORANGE,color:"white",padding:"8px 16px",fontSize:13,fontWeight:700,textAlign:"center",position:"sticky",top:0,zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span>☁️</span> Sincronizando registros pendientes...
        </div>
      )}
      {/* Pending badge (online, not syncing) */}
      {isOnline && !syncing && pending.length>0 && (
        <div style={{background:YELLOW,color:"white",padding:"6px 16px",fontSize:12,fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span>⏳</span> {pending.length} registro(s) pendientes de sincronizar
          <button onClick={()=>syncNow(pending,records)} style={{background:"white",color:YELLOW,border:"none",borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700,cursor:"pointer",marginLeft:4}}>Sincronizar</button>
        </div>
      )}
      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.type==="warn"?YELLOW:NAVY,color:"white",borderRadius:12,padding:"10px 20px",fontSize:14,fontWeight:700,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}
      {children}
    </div>
  );

  // ── BOOT ──
  if(screen==="boot") return wrap(<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh"}}><div style={{fontSize:32}}>⏳</div></div>);

  // ── LANDING ──
  if(screen==="landing") return wrap(
    <div style={{minHeight:"100vh",background:`linear-gradient(145deg,${NAVY} 0%,#1E3A5F 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28}}>
      <div style={{marginBottom:40}}><Logo size={44}/></div>
      <div style={{width:"80px",height:"3px",background:ORANGE,marginBottom:32,borderRadius:2}}/>
      <div style={{color:"white",fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center"}}>Control de Asistencia</div>
      <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:40,textAlign:"center"}}>{config.locationName}</div>
      <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={()=>{setPin("");setDui("");setScreen("emp_login");}} style={{background:ORANGE,border:"none",borderRadius:14,padding:"20px 24px",color:"white",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:`0 8px 24px ${ORANGE}55`}}>
          <span style={{fontSize:32}}>👤</span>
          <div style={{textAlign:"left"}}><div>Soy Empleado</div><div style={{fontSize:12,opacity:0.8,fontWeight:400}}>Registrar entrada o salida</div></div>
        </button>
        <button onClick={()=>{setPin("");setScreen("admin_login");}} style={{background:"rgba(255,255,255,0.08)",border:"2px solid rgba(255,255,255,0.15)",borderRadius:14,padding:"20px 24px",color:"white",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:32}}>🛡️</span>
          <div style={{textAlign:"left"}}><div>Administrador</div><div style={{fontSize:12,opacity:0.6,fontWeight:400}}>Panel de control y reportes</div></div>
        </button>
      </div>
      <div style={{color:"rgba(255,255,255,0.25)",fontSize:11,marginTop:40}}>v1.0 · {company?.name}</div>
    </div>
  , NAVY);

  // ── EMPLOYEE LOGIN ──
  if(screen==="emp_login") return wrap(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
        <button onClick={()=>setScreen("landing")} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>←</button>
        <Logo size={28}/>
      </div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:NAVY}}>Identificación</div>
        <div style={{fontSize:13,color:"#6B7280"}}>Ingresa tu DUI y PIN para continuar</div>
      </div>
      <Card>
        <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:6}}>DUI</div>
        <input value={dui} onChange={e=>setDui(e.target.value)} placeholder="00000000-0"
          style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:16,outline:"none",marginBottom:4,boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:"#9CA3AF",marginBottom:16}}>Formato: 12345678-9</div>
        <PinPad pin={pin} setPin={setPin} label="PIN de 4 dígitos" onConfirm={()=>{
          const emp = employees.find(e=>e.dui.replace(/-/g,"")===dui.replace(/-/g,"") && e.pin===pin);
          if(emp){ setEmp(emp); setPin(""); setDui(""); setGeoS(null); setScreen("emp_home"); }
          else { showToast("DUI o PIN incorrecto","warn"); setPin(""); }
        }}/>
      </Card>
    </div>
  );

  // ── EMPLOYEE HOME ──
  if(screen==="emp_home" && employee) {
    const rec = getTodayRec(employee.id);
    const isIn = rec && !rec.checkOut;
    const isDone = rec && rec.checkOut;
    const history = Object.entries(records).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7)
      .map(([d,rs])=>({date:d, rec:rs.find(r=>r.employeeId===employee.id)||null}));
    return wrap(
      <div>
        <div style={{background:NAVY,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {employee.photo
              ? <img src={employee.photo} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:"2px solid "+ORANGE}}/>
              : <div style={{width:40,height:40,borderRadius:"50%",background:ORANGE,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18,fontWeight:700}}>{employee.name[0]}</div>
            }
            <div>
              <div style={{color:"white",fontWeight:700,fontSize:15}}>{employee.name}</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>{employee.puesto} · {employee.turno}</div>
            </div>
          </div>
          <button onClick={()=>{setEmp(null);setScreen("landing");}} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"white",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Salir</button>
        </div>
        <div style={{padding:"20px 16px"}}>
          {/* Today card */}
          <Card style={{borderTop:`4px solid ${isDone?GREEN:isIn?ORANGE:NAVY}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:13,color:"#6B7280",fontWeight:600}}>HOY · {new Date().toLocaleDateString("es-SV",{weekday:"long",day:"numeric",month:"long"})}</div>
                {rec ? <StatusBadge status={rec.status}/> : <StatusBadge status="-"/>}
              </div>
              {rec && <div style={{textAlign:"right",fontSize:12,color:"#6B7280"}}>
                {rec.checkIn && <div>🟢 Entrada: <strong>{rec.checkIn}</strong></div>}
                {rec.checkOut && <div>🔴 Salida: <strong>{rec.checkOut}</strong></div>}
              </div>}
            </div>
            <GeoIndicator status={geoStatus} distance={geoDist} radius={config.fenceRadius}/>
            {!isDone && (
              <div style={{display:"flex",gap:10}}>
                {!geoStatus&&!isIn && <Btn full onClick={checkGeo} color={NAVY}>📡 Verificar ubicación</Btn>}
                {!geoStatus&&isIn  && <Btn full onClick={checkGeo} color={NAVY}>📡 Verificar para salida</Btn>}
                {geoStatus&&geoStatus!=="checking"&&!isIn && <Btn full onClick={()=>clockAction("in")} disabled={loading} color={GREEN}>✅ Registrar Entrada</Btn>}
                {geoStatus&&geoStatus!=="checking"&&isIn  && <Btn full onClick={()=>clockAction("out")} disabled={loading} color={RED}>🏁 Registrar Salida</Btn>}
              </div>
            )}
            {isDone && <div style={{background:"#DCFCE7",borderRadius:10,padding:"10px 14px",color:GREEN,fontWeight:700,fontSize:14,textAlign:"center"}}>✅ Jornada completada hoy</div>}
          </Card>
          {/* History */}
          <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1,marginBottom:10}}>MIS ÚLTIMOS REGISTROS</div>
          {history.map(({date,rec:r})=>(
            <Card key={date} style={{padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:NAVY}}>{fmtDate(date)}</div>
                  {r && <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>{r.checkIn&&`Entrada: ${r.checkIn}`}{r.checkOut&&` · Salida: ${r.checkOut}`}</div>}
                </div>
                <StatusBadge status={r?r.status:"-"}/>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── ADMIN LOGIN ──
  if(screen==="admin_login") return wrap(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
        <button onClick={()=>setScreen("landing")} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>←</button>
        <Logo size={28}/>
      </div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:700,color:NAVY}}>Acceso Administrador</div>
        <div style={{fontSize:13,color:"#6B7280"}}>Panel de control exclusivo</div>
      </div>
      <Card>
        <PinPad pin={pin} setPin={setPin} label="PIN de administrador" onConfirm={p=>{
          if(p===company?.adminPin){ setPin(""); setScreen("admin_dash"); setTab("dash"); }
          else{ showToast("PIN incorrecto","warn"); setPin(""); }
        }}/>
      </Card>
    </div>
  );

  // ── ADMIN SHELL ──
  if(["admin_dash","admin_emps","admin_cfg","admin_report"].includes(screen)) {
    const dk = todayKey();
    const todayRecs = records[dk]||[];
    const reportRecs = records[reportDate]||[];
    const totalEmps = employees.length;
    const present = todayRecs.filter(r=>r.status==="P").length;
    const late    = todayRecs.filter(r=>r.status==="T").length;
    const absent  = totalEmps - present - late;

    const TABS = [
      {id:"admin_dash",   icon:"📊", label:"Hoy"},
      {id:"admin_emps",   icon:"👥", label:"Personal"},
      {id:"admin_report", icon:"📋", label:"Reportes"},
      {id:"admin_cfg",    icon:"⚙️",  label:"Config"},
    ];

    return wrap(
      <div style={{paddingBottom:80}}>
        {/* Header */}
        <div style={{background:NAVY,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <Logo size={26}/>
          <button onClick={()=>setScreen("landing")} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"white",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Salir</button>
        </div>

        {/* DASHBOARD */}
        {screen==="admin_dash" && (
          <div style={{padding:"20px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1,marginBottom:12}}>RESUMEN HOY · {new Date().toLocaleDateString("es-SV",{weekday:"long",day:"numeric",month:"long"})}</div>
            {/* Connection + pending status */}
            <div style={{background:isOnline?"#DCFCE7":"#FEE2E2",borderRadius:12,padding:"10px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{isOnline?"🟢":"🔴"}</span>
                <span style={{fontSize:13,fontWeight:700,color:isOnline?GREEN:RED}}>{isOnline?"Conectado":"Sin conexión"}</span>
              </div>
              {pending.length>0 && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,color:YELLOW,fontWeight:700}}>⏳ {pending.length} pendiente(s)</span>
                  {isOnline && <button onClick={()=>syncNow(pending,records)} style={{background:ORANGE,color:"white",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Sync</button>}
                </div>
              )}
              {isOnline && pending.length===0 && <span style={{fontSize:12,color:GREEN,fontWeight:600}}>✓ Todo sincronizado</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
              {[[present,"Presentes",GREEN],[late,"Tardanzas",YELLOW],[absent,"Pendientes",RED]].map(([n,l,c])=>(
                <Card key={l} style={{textAlign:"center",padding:"14px 8px",borderTop:`3px solid ${c}`}}>
                  <div style={{fontSize:30,fontWeight:900,color:c}}>{n}</div>
                  <div style={{fontSize:11,color:"#6B7280",fontWeight:600}}>{l}</div>
                </Card>
              ))}
            </div>
            <Card style={{padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:12,color:"#6B7280",fontWeight:600}}>TOTAL OPERACIÓN</div><div style={{fontSize:24,fontWeight:900,color:NAVY}}>{present+late}<span style={{fontSize:14,color:"#9CA3AF"}}>/{totalEmps}</span></div></div>
              <div style={{width:60,height:60,borderRadius:"50%",background:`conic-gradient(${GREEN} 0% ${((present+late)/Math.max(totalEmps,1)*100)}%, #E5E7EB ${((present+late)/Math.max(totalEmps,1)*100)}% 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:NAVY}}>{Math.round((present+late)/Math.max(totalEmps,1)*100)}%</div>
              </div>
            </Card>
            <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1,marginBottom:10}}>REGISTROS DE HOY</div>
            {todayRecs.length===0 && <Card style={{textAlign:"center",color:"#9CA3AF",padding:24}}>Sin registros hoy aún</Card>}
            {todayRecs.map(r=>(
              <Card key={r.id} style={{padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,color:NAVY,fontSize:14}}>{r.employeeName}</div>
                    <div style={{fontSize:11,color:"#6B7280"}}>{r.puesto}</div>
                    <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>🟢 {r.checkIn}{r.checkOut&&` · 🔴 ${r.checkOut}`}{!r.checkInValid&&" · ⚠️ fuera de área"}</div>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>
              </Card>
            ))}
            {employees.filter(e=>!todayRecs.find(r=>r.employeeId===e.id)).map(e=>(
              <Card key={e.id} style={{padding:"12px 16px",opacity:0.6}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontWeight:700,color:NAVY,fontSize:14}}>{e.name}</div><div style={{fontSize:11,color:"#6B7280"}}>{e.puesto} · {e.turno}</div></div>
                  <StatusBadge status="-"/>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* EMPLOYEES */}
        {screen==="admin_emps" && (
          <div style={{padding:"20px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1}}>PERSONAL REGISTRADO ({employees.length})</div>
              <Btn small onClick={()=>{ setLocalPin(""); setForm({name:"",dui:"",pin:"",puesto:"Auxiliar de Conserjería de Cocina",turno:"Turno 1",phone:"",salary:"410.00",isss:"",afp:"",afpName:"Crecer",photo:""}); setScreen("admin_add"); }}>+ Agregar</Btn>
            </div>
            {employees.length===0 && <Card style={{textAlign:"center",color:"#9CA3AF",padding:24}}>Sin empleados aún. Agrega el primero.</Card>}
            {employees.map(e=>(
              <Card key={e.id} style={{padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    {e.photo
                      ? <img src={e.photo} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:`2px solid ${ORANGE}`}}/>
                      : <div style={{width:44,height:44,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18,fontWeight:700}}>{e.name[0]}</div>
                    }
                    <div>
                      <div style={{fontWeight:700,color:NAVY,fontSize:14}}>{e.name}</div>
                      <div style={{fontSize:11,color:"#6B7280"}}>{e.puesto}</div>
                      <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                        <Tag>{e.turno}</Tag>
                        <Tag color={ORANGE}>${e.salary}</Tag>
                        {e.isss&&<Tag color={GREEN}>ISSS ✓</Tag>}
                        {e.afp&&<Tag color="#7C3AED">AFP ✓</Tag>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{
                      setEditEmp(e);
                      setLocalPin("");
                      setForm({name:e.name,dui:e.dui,pin:e.pin,puesto:e.puesto,turno:e.turno,phone:e.phone||"",salary:e.salary,isss:e.isss||"",afp:e.afp||"",afpName:e.afpName||"Crecer",photo:e.photo||""});
                      setScreen("admin_edit");
                    }} style={{background:"#EFF6FF",border:"none",borderRadius:8,padding:"6px 10px",color:"#1D4ED8",cursor:"pointer",fontSize:12,fontWeight:700}}>✏️ Editar</button>
                    <button onClick={async()=>{ const ne=employees.filter(x=>x.id!==e.id); await saveEmps(ne); showToast("Empleado eliminado"); }} style={{background:"#FEE2E2",border:"none",borderRadius:8,padding:"6px 10px",color:RED,cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* REPORTS */}
        {screen==="admin_report" && (
          <div style={{padding:"20px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1,marginBottom:12}}>REPORTE DE ASISTENCIA</div>
            <Card>
              <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:6}}>FECHA</div>
              <input type="date" value={reportDate} onChange={e=>setRptDate(e.target.value)}
                style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,marginBottom:14,boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:10}}>
                <Btn small full onClick={()=>exportCSV(reportDate)}>⬇ Exportar CSV</Btn>
              </div>
            </Card>
            {reportRecs.length===0 && <Card style={{textAlign:"center",color:"#9CA3AF",padding:24}}>Sin registros para {fmtDate(reportDate)}</Card>}
            {reportRecs.map(r=>(
              <Card key={r.id} style={{padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,color:NAVY,fontSize:14}}>{r.employeeName}</div>
                    <div style={{fontSize:11,color:"#6B7280"}}>{r.puesto} · {r.turno}</div>
                    <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>
                      {r.checkIn&&`🟢 ${r.checkIn}`}{r.checkOut&&` · 🔴 ${r.checkOut}`}
                      {!r.checkInValid&&<span style={{color:YELLOW}}> · ⚠️ geo inválida</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}><StatusBadge status={r.status}/><div style={{fontSize:11,color:"#6B7280",marginTop:4}}>${r.salary||""}</div></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CONFIG */}
        {screen==="admin_cfg" && (
          <div style={{padding:"20px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#6B7280",letterSpacing:1,marginBottom:12}}>CONFIGURACIÓN</div>
            <Card>
              <div style={{fontWeight:700,color:NAVY,marginBottom:16}}>📍 Geocerca activa</div>
              <div style={{background:LIGHT,borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:NAVY}}>{config.locationName}</div>
                <div style={{fontSize:12,color:"#6B7280",marginTop:4}}>Lat: {config.fenceLat.toFixed(5)} · Lng: {config.fenceLng.toFixed(5)}</div>
                <div style={{fontSize:12,color:"#6B7280"}}>Radio: {config.fenceRadius} metros</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:6}}>NOMBRE DE UBICACIÓN</div>
              <input value={config.locationName} onChange={e=>setConfig(c=>({...c,locationName:e.target.value}))}
                style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,marginBottom:14,boxSizing:"border-box"}}/>
              <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:6}}>RADIO PERMITIDO (metros)</div>
              <input type="range" min="50" max="1000" step="50" value={config.fenceRadius}
                onChange={e=>setConfig(c=>({...c,fenceRadius:Number(e.target.value)}))}
                style={{width:"100%",marginBottom:6}}/>
              <div style={{fontSize:13,fontWeight:700,color:ORANGE,textAlign:"center",marginBottom:14}}>{config.fenceRadius} metros</div>
              <Btn full small color={NAVY} onClick={()=>{ if(!navigator.geolocation){showToast("Geolocalización no disponible","warn");return;} navigator.geolocation.getCurrentPosition(p=>{ setConfig(c=>({...c,fenceLat:p.coords.latitude,fenceLng:p.coords.longitude})); showToast("📍 Ubicación actualizada"); },()=>showToast("No se pudo obtener ubicación","warn")); }}>
                📡 Usar mi ubicación actual como centro
              </Btn>
            </Card>
            <Btn full onClick={async()=>{await saveCfg(config);showToast("✅ Configuración guardada");}} style={{marginTop:8}}>Guardar cambios</Btn>
            <Card style={{marginTop:16}}>
              <div style={{fontWeight:700,color:NAVY,marginBottom:12}}>🔐 PIN de Administrador</div>
              <PinPad pin={pin} setPin={setPin} label="Nuevo PIN (4 dígitos)" onConfirm={async p=>{
                const co={...company,adminPin:p}; setCompany(co); await setStore("company",co); setPin(""); showToast("✅ PIN actualizado");
              }}/>
            </Card>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:"1px solid #E5E7EB",display:"flex",zIndex:10}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setScreen(t.id)} style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:20}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:700,color:screen===t.id?ORANGE:"#9CA3AF"}}>{t.label}</span>
              {screen===t.id && <div style={{width:24,height:3,background:ORANGE,borderRadius:2}}/>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── ADD EMPLOYEE ──
  if(screen==="admin_add") return wrap(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>setScreen("admin_emps")} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>←</button>
        <div style={{fontSize:18,fontWeight:700,color:NAVY}}>Agregar Empleado</div>
      </div>
      <Card>
        {/* PHOTO */}
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:10}}>FOTOGRAFÍA DEL EMPLEADO</div>
          <div style={{position:"relative",display:"inline-block"}}>
            {form.photo
              ? <img src={form.photo} style={{width:90,height:90,borderRadius:"50%",objectFit:"cover",border:`3px solid ${ORANGE}`}}/>
              : <div style={{width:90,height:90,borderRadius:"50%",background:LIGHT,border:`2px dashed #D1D5DB`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                  <span style={{fontSize:28}}>👤</span>
                  <span style={{fontSize:10,color:"#9CA3AF"}}>Sin foto</span>
                </div>
            }
          </div>
          <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"center"}}>
            <label style={{background:NAVY,color:"white",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              📷 Cámara
              <input type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>setForm(f=>({...f,photo:ev.target.result}));
                reader.readAsDataURL(file);
              }}/>
            </label>
            <label style={{background:"#F3F4F6",color:NAVY,borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              🖼 Galería
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>setForm(f=>({...f,photo:ev.target.result}));
                reader.readAsDataURL(file);
              }}/>
            </label>
            {form.photo && <button onClick={()=>setForm(f=>({...f,photo:""}))} style={{background:"#FEE2E2",color:RED,border:"none",borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>}
          </div>
        </div>

        {/* Basic fields */}
        {[["Nombre completo","name","text",""],["DUI","dui","text","00000000-0"],["Teléfono","phone","tel",""]].map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>{lbl.toUpperCase()}</div>
            <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} type={type}
              style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}

        {/* ISSS */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>NÚMERO ISSS <span style={{fontWeight:400,color:"#9CA3AF"}}>(si aplica)</span></div>
          <input value={form.isss} onChange={e=>setForm(f=>({...f,isss:e.target.value}))} placeholder="Ej. 123456789"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>

        {/* AFP */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>INSTITUCIÓN AFP <span style={{fontWeight:400,color:"#9CA3AF"}}>(si aplica)</span></div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {["Crecer","Confía"].map(a=>(
              <button key={a} onClick={()=>setForm(f=>({...f,afpName:a}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${form.afpName===a?"#7C3AED":"#E5E7EB"}`,background:form.afpName===a?"#7C3AED":"white",color:form.afpName===a?"white":NAVY,fontWeight:700,cursor:"pointer",fontSize:13}}>
                {a}
              </button>
            ))}
          </div>
          <input value={form.afp} onChange={e=>setForm(f=>({...f,afp:e.target.value}))} placeholder="Número de cuenta AFP"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>PUESTO</div>
          <select value={form.puesto} onChange={e=>setForm(f=>({...f,puesto:e.target.value,salary:e.target.value.includes("Bodega")?"450.00":"410.00"}))}
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box"}}>
            <option>Auxiliar de Conserjería de Cocina</option>
            <option>Auxiliar de Bodega de Alimentos</option>
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>TURNO</div>
          <div style={{display:"flex",gap:10}}>
            {["Turno 1","Turno 2"].map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,turno:t}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${form.turno===t?NAVY:"#E5E7EB"}`,background:form.turno===t?NAVY:"white",color:form.turno===t?"white":NAVY,fontWeight:700,cursor:"pointer",fontSize:13}}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>SALARIO MENSUAL</div>
          <input value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} type="text"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div style={{marginBottom:6,fontSize:12,fontWeight:700,color:"#6B7280"}}>PIN DE ACCESO (4 DÍGITOS)</div>
        <PinPad pin={localPin} setPin={setLocalPin} label="PIN para el empleado" onConfirm={async p=>{
          if(!form.name||!form.dui||p.length<4){showToast("Completa todos los campos","warn");return;}
          const ne=[...employees,{id:genId(),...form,pin:p,startDate:todayKey()}];
          await saveEmps(ne); showToast("✅ Empleado agregado"); setLocalPin(""); setScreen("admin_emps");
        }}/>
      </Card>
    </div>
  );

  // ── EDIT EMPLOYEE ──
  if(screen==="admin_edit" && editEmployee) return wrap(
    <div style={{padding:24,paddingBottom:40}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>{setEditEmp(null);setScreen("admin_emps");}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>←</button>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:NAVY}}>Editar Empleado</div>
          <div style={{fontSize:12,color:"#6B7280"}}>{editEmployee.name}</div>
        </div>
      </div>
      <Card>
        {/* PHOTO */}
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:10}}>FOTOGRAFÍA</div>
          <div style={{position:"relative",display:"inline-block"}}>
            {form.photo
              ? <img src={form.photo} style={{width:90,height:90,borderRadius:"50%",objectFit:"cover",border:`3px solid ${ORANGE}`}}/>
              : <div style={{width:90,height:90,borderRadius:"50%",background:LIGHT,border:`2px dashed #D1D5DB`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                  <span style={{fontSize:28}}>👤</span>
                  <span style={{fontSize:10,color:"#9CA3AF"}}>Sin foto</span>
                </div>
            }
          </div>
          <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"center"}}>
            <label style={{background:NAVY,color:"white",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              📷 Cámara
              <input type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>setForm(f=>({...f,photo:ev.target.result}));
                reader.readAsDataURL(file);
              }}/>
            </label>
            <label style={{background:"#F3F4F6",color:NAVY,borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              🖼 Galería
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>setForm(f=>({...f,photo:ev.target.result}));
                reader.readAsDataURL(file);
              }}/>
            </label>
            {form.photo && <button onClick={()=>setForm(f=>({...f,photo:""}))} style={{background:"#FEE2E2",color:RED,border:"none",borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>}
          </div>
        </div>

        {/* Basic fields */}
        {[["Nombre completo","name","text",""],["DUI","dui","text","00000000-0"],["Teléfono","phone","tel",""]].map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>{lbl.toUpperCase()}</div>
            <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} type={type}
              style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}

        {/* ISSS */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>NÚMERO ISSS <span style={{fontWeight:400,color:"#9CA3AF"}}>(si aplica)</span></div>
          <input value={form.isss} onChange={e=>setForm(f=>({...f,isss:e.target.value}))} placeholder="Ej. 123456789"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>

        {/* AFP */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>INSTITUCIÓN AFP <span style={{fontWeight:400,color:"#9CA3AF"}}>(si aplica)</span></div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {["Crecer","Confía"].map(a=>(
              <button key={a} onClick={()=>setForm(f=>({...f,afpName:a}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${form.afpName===a?"#7C3AED":"#E5E7EB"}`,background:form.afpName===a?"#7C3AED":"white",color:form.afpName===a?"white":NAVY,fontWeight:700,cursor:"pointer",fontSize:13}}>
                {a}
              </button>
            ))}
          </div>
          <input value={form.afp} onChange={e=>setForm(f=>({...f,afp:e.target.value}))} placeholder="Número de cuenta AFP"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>

        {/* Puesto */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>PUESTO</div>
          <select value={form.puesto} onChange={e=>setForm(f=>({...f,puesto:e.target.value,salary:e.target.value.includes("Bodega")?"450.00":"410.00"}))}
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box"}}>
            <option>Auxiliar de Conserjería de Cocina</option>
            <option>Auxiliar de Bodega de Alimentos</option>
          </select>
        </div>

        {/* Turno */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>TURNO</div>
          <div style={{display:"flex",gap:10}}>
            {["Turno 1","Turno 2"].map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,turno:t}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${form.turno===t?NAVY:"#E5E7EB"}`,background:form.turno===t?NAVY:"white",color:form.turno===t?"white":NAVY,fontWeight:700,cursor:"pointer",fontSize:13}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Salario */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:700,color:"#6B7280",marginBottom:5}}>SALARIO MENSUAL</div>
          <input value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} type="text"
            style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px solid #E5E7EB",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>

        {/* Save button */}
        <Btn full onClick={async()=>{
          if(!form.name||!form.dui){showToast("Nombre y DUI son obligatorios","warn");return;}
          const updated = employees.map(e=> e.id===editEmployee.id ? {...e,...form} : e);
          await saveEmps(updated);
          showToast("✅ Información actualizada");
          setEditEmp(null);
          setScreen("admin_emps");
        }}>💾 Guardar cambios</Btn>
      </Card>
    </div>
  );

  return wrap(<div style={{padding:24,textAlign:"center",color:"#9CA3AF"}}>Pantalla no encontrada</div>);
}
