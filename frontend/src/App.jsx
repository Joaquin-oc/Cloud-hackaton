import { useEffect, useMemo, useState } from "react";
import { getResults, inspectCsv, loginUser, registerUser, saveProfile, submitOffers } from "./api.js";

const EMPTY_PROFILE = {
  targetRole: "", professionalSummary: "", skills: [], technicalSkills: [], interpersonalSkills: [], otherSkills: [], languageSkills: [], experienceYears: "", experienceDetail: "", education: "",
  location: "", modality: "", salaryExpectation: "", contractPreference: "", languages: "", linkedin: "", github: "", portfolio: "", availability: ""
};

function skillGroups(profile) {
  const legacy = Array.isArray(profile.skills) ? profile.skills : [];
  return {
    technical: Array.isArray(profile.technicalSkills) ? profile.technicalSkills : legacy,
    interpersonal: Array.isArray(profile.interpersonalSkills) ? profile.interpersonalSkills : [],
    other: Array.isArray(profile.otherSkills) ? profile.otherSkills : [],
    languages: Array.isArray(profile.languageSkills) ? profile.languageSkills : typeof profile.languages === "string" ? profile.languages.split(",").map((language) => language.trim()).filter(Boolean) : []
  };
}

function allSkills(profile) {
  const groups = skillGroups(profile);
  return [...new Set([...groups.technical, ...groups.interpersonal, ...groups.other, ...groups.languages])];
}

function getRoute() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function profileComplete(profile) {
  return Boolean(profile.targetRole && allSkills(profile).length && profile.experienceYears !== "");
}

function historyKey(email) {
  return `jobmatch_analyses_${email}`;
}

function loadHistory(email) {
  try {
    return JSON.parse(localStorage.getItem(historyKey(email)) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(email, history) {
  localStorage.setItem(historyKey(email), JSON.stringify(history));
}

function Notice({ children, error = false }) {
  return children ? <p className={`notice ${error ? "error-text" : ""}`}>{children}</p> : null;
}

function PublicHeader({ navigate }) {
  return <header className="public-header"><button className="brand" onClick={() => navigate("/")}>Job<span>Match</span></button><div><button className="link-button" onClick={() => navigate("/login")}>Iniciar sesión</button><button className="mini-primary" onClick={() => navigate("/registro")}>Crear cuenta</button></div></header>;
}

function Landing({ navigate }) {
  return <>
    <section className="landing-hero">
      <p className="eyebrow">POSTULA CON INTENCIÓN</p>
      <h1>Tu próximo trabajo merece un <span>mejor match.</span></h1>
      <p>Organiza tu perfil, analiza tus ofertas y decide dónde vale la pena postular. Sin ruido, sin listas infinitas.</p>
      <div className="hero-actions"><button className="button-primary" onClick={() => navigate("/registro")}>Crear mi cuenta</button><button className="button-ghost" onClick={() => navigate("/login")}>Ya tengo una cuenta</button></div>
    </section>
    <section className="landing-steps">
      <article><span>01</span><h2>Crea tu perfil</h2><p>Define lo que buscas y las habilidades que te representan.</p></article>
      <article><span>02</span><h2>Sube tus ofertas</h2><p>El CSV se convierte en trabajos independientes para analizar.</p></article>
      <article><span>03</span><h2>Elige mejor</h2><p>Recibe resultados por sesión y revisa las brechas con calma.</p></article>
    </section>
  </>;
}

function AuthPage({ mode, navigate, onAuthenticated }) {
  const [register, setRegister] = useState({ nombre: "", email: "", password: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const isLogin = mode === "login";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setMessage(isLogin ? "Verificando tus credenciales..." : "Creando tu cuenta...");
    try {
      if (isLogin) {
        onAuthenticated(await loginUser(login));
      } else {
        const result = await registerUser(register);
        setMessage(`${result.mensaje}. Ahora inicia sesión.`);
        navigate("/login");
      }
    } catch (requestError) {
      setError(true);
      setMessage(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="auth-page">
    <div className="auth-aside"><p className="eyebrow">JOBMATCH</p><h1>Una búsqueda de trabajo más clara.</h1><p>Tu espacio privado para guardar perfil, análisis y decisiones.</p><ul><li>✓ Tu información está separada de las ofertas.</li><li>✓ Cada análisis conserva su propio perfil.</li><li>✓ Solo tú puedes ver tus resultados.</li></ul></div>
    <div className="panel auth-panel">
      <div className="auth-switch"><button className={isLogin ? "active" : ""} onClick={() => navigate("/login")}>Entrar</button><button className={!isLogin ? "active" : ""} onClick={() => navigate("/registro")}>Crear cuenta</button></div>
      {false && <div className="demo-access"><span>Modo demostración local</span><small>Conectado a AWS.</small></div>}
      <form onSubmit={submit}>
        <div><p className="eyebrow">{isLogin ? "BIENVENIDO DE VUELTA" : "EMPECEMOS"}</p><h2>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h2><p className="muted">{isLogin ? "Continúa donde lo dejaste." : "Solo necesitas unos segundos."}</p></div>
        {!isLogin && <label>Nombre<input required value={register.nombre} placeholder="¿Cómo te llamamos?" onChange={(event) => setRegister({ ...register, nombre: event.target.value })} /></label>}
        <label>Correo electrónico<input required type="email" autoComplete="email" placeholder="tu@email.com" value={isLogin ? login.email : register.email} onChange={(event) => isLogin ? setLogin({ ...login, email: event.target.value }) : setRegister({ ...register, email: event.target.value })} /></label>
        <label>Contraseña<div className="password-field"><input required minLength={isLogin ? undefined : 8} type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Tu contraseña" : "Mínimo 8 caracteres"} value={isLogin ? login.password : register.password} onChange={(event) => isLogin ? setLogin({ ...login, password: event.target.value }) : setRegister({ ...register, password: event.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ocultar" : "Ver"}</button></div></label>
        <button className="button-primary" disabled={busy}>{busy ? "Un momento..." : isLogin ? "Entrar a mi espacio" : "Crear mi cuenta"}</button>
      </form>
      <Notice error={error}>{message}</Notice>
    </div>
  </section>;
}

function AppNav({ route, navigate, user, onLogout }) {
  const items = [["/app/dashboard", "Inicio", "⌂"], ["/app/perfil", "Mi perfil", "◌"], ["/app/nuevo", "Nuevo análisis", "+"], ["/app/historial", "Historial", "◷"], ["/app/configuracion", "Configuración", "⚙"]];
  return <aside className="app-nav"><button className="brand" onClick={() => navigate("/app/dashboard")}>Job<span>Match</span></button><nav>{items.map(([path, label, icon]) => <button className={route === path || (path === "/app/historial" && route.startsWith("/app/analisis/")) ? "nav-active" : ""} key={path} onClick={() => navigate(path)}><span>{icon}</span>{label}</button>)}</nav><div className="nav-user"><span>{(user.nombre || user.email).slice(0, 1).toUpperCase()}</span><div><b>{user.nombre || "Mi cuenta"}</b><small>{user.email}</small></div></div><button className="logout" onClick={onLogout}>Cerrar sesión</button></aside>;
}

function Dashboard({ profile, history, navigate, user }) {
  const ready = profileComplete(profile);
  const skills = allSkills(profile);
  const completionFields = [profile.targetRole, profile.professionalSummary, skills.length, profile.experienceYears !== "", profile.location, profile.modality, profile.languages, profile.linkedin || profile.github || profile.portfolio, profile.availability];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  const last = history[0];
  return <section className="page dashboard-page"><div className="page-title"><div><p className="eyebrow">PANEL PERSONAL</p><h1>Hola{user.nombre ? `, ${user.nombre}` : ""}.</h1><p>Una vista clara de tu perfil, tus decisiones y tus próximos pasos.</p></div><button className="button-primary" onClick={() => navigate("/app/nuevo")}>Nuevo análisis</button></div>
    <div className="bento-grid"><article className="bento-welcome"><div><p className="eyebrow">ENFOQUE DE HOY</p><h2>{ready ? "Encuentra oportunidades alineadas contigo." : "Tu perfil es el punto de partida."}</h2><p>{ready ? "Tienes lo necesario para iniciar un nuevo análisis de ofertas." : "Completa los bloques principales para obtener análisis más útiles."}</p><button className="button-ghost" onClick={() => navigate(ready ? "/app/nuevo" : "/app/perfil")}>{ready ? "Subir un CSV" : "Completar perfil"}</button></div><span className="bento-orbit">✦</span></article>
      <article className="bento-profile"><p className="eyebrow">PERFIL PROFESIONAL</p><div className="completion-ring" style={{ "--completion": `${completion}%` }}><span>{completion}%</span></div><b>{ready ? "Base lista" : "En construcción"}</b><small>{profile.targetRole || "Aún no defines tu objetivo profesional"}</small><button className="link-button" onClick={() => navigate("/app/perfil")}>Ver mi perfil →</button></article>
      <article className="bento-stat"><p className="eyebrow">ANÁLISIS</p><b>{history.length}</b><span>{history.length === 1 ? "sesión guardada" : "sesiones guardadas"}</span><button className="link-button" onClick={() => navigate("/app/historial")}>Abrir historial →</button></article>
      <article className="bento-last"><p className="eyebrow">ÚLTIMA ACTIVIDAD</p>{last ? <><h2>{last.total} ofertas analizadas</h2><p>{last.profileName || "Perfil profesional"} · {new Date(last.createdAt).toLocaleDateString()}</p><button className="link-button" onClick={() => navigate(`/app/analisis/${last.sesion_id}`)}>Ver resultados →</button></> : <><h2>Tu historial empieza aquí.</h2><p>Aún no has confirmado ningún análisis.</p><button className="link-button" onClick={() => navigate("/app/nuevo")}>Crear primer análisis →</button></>}</article>
      <article className="bento-insight"><p className="eyebrow">RECOMENDACIÓN</p><h2>{completion < 70 ? "Agrega más contexto a tu perfil." : history.length ? "Compara tu último análisis." : "Prueba con un CSV de ofertas."}</h2><p>{completion < 70 ? "Idiomas, enlaces y disponibilidad hacen que tu perfil sea más completo." : history.length ? "Revisa qué habilidades se repiten en tus mejores matches." : "Puedes usar el archivo de demostración para explorar el flujo."}</p><button className="link-button" onClick={() => navigate(completion < 70 ? "/app/perfil" : history.length ? "/app/historial" : "/app/nuevo")}>Ver sugerencia →</button></article>
    </div>
    <section className="dashboard-activity"><div><p className="eyebrow">MAPA DE TU BÚSQUEDA</p><h2>Construye una señal profesional fuerte.</h2></div><div className="activity-steps"><span className={profile.targetRole ? "done" : ""}>1<small>Objetivo</small></span><i /><span className={skills.length ? "done" : ""}>2<small>Habilidades</small></span><i /><span className={history.length ? "done" : ""}>3<small>Análisis</small></span><i /><span>4<small>Decisión</small></span></div></section>
  </section>;
}

function SkillsManager({ profile, setProfile }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("technical");
  const groups = skillGroups(profile);
  const categories = [
    ["technical", "Conocimientos técnicos"],
    ["interpersonal", "Habilidades interpersonales"],
    ["other", "Otros"],
    ["languages", "Idiomas"]
  ];
  function setGroups(next) {
    setProfile({
      ...profile,
      technicalSkills: next.technical,
      interpersonalSkills: next.interpersonal,
      otherSkills: next.other,
      languageSkills: next.languages,
      languages: next.languages.join(", "),
      skills: [...new Set([...next.technical, ...next.interpersonal, ...next.other, ...next.languages])]
    });
  }
  function addSkill() {
    const value = draft.trim();
    if (!value) return;
    const next = { ...groups, [category]: [...groups[category], value] };
    setGroups(next); setDraft("");
  }
  function removeSkill(group, value) {
    setGroups({ ...groups, [group]: groups[group].filter((skill) => skill !== value) });
  }
  return <div className="skills-manager"><button type="button" className="add-skill-button" onClick={() => setAdding(!adding)}>{adding ? "Cancelar" : "+ Añadir habilidad"}</button>{adding && <div className="skill-adder"><input autoFocus value={draft} placeholder="Ej. Python, liderazgo o Inglés B2" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="technical">Técnica</option><option value="interpersonal">Interpersonal</option><option value="other">Otros</option><option value="languages">Idiomas</option></select><button type="button" className="button-primary" onClick={addSkill}>Añadir</button></div>}{categories.map(([group, title]) => <div className="skill-category" key={group}><b>{title}</b><div>{groups[group].length ? groups[group].map((skill) => <span key={skill}>{skill}<button type="button" aria-label={`Eliminar ${skill}`} onClick={() => removeSkill(group, skill)}>×</button></span>) : <small>Aún no agregaste elementos.</small>}</div></div>)}</div>;
}

function ProfilePage({ profile, setProfile, token, onSaved }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setProfile({ ...profile, [key]: value });
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(false); setMessage("Guardando perfil...");
    const normalized = { ...profile, experienceYears: Number(profile.experienceYears), skills: allSkills(profile) };
    try { const result = await saveProfile(token, normalized); setProfile(result.perfil); onSaved(result.perfil); setMessage("Perfil guardado. Ya puedes iniciar un análisis."); } catch (requestError) { setError(true); setMessage(requestError.message); } finally { setBusy(false); }
  }
  return <section className="page profile-page"><div className="page-title"><div><p className="eyebrow">MI PERFIL</p><h1>Tu señal profesional.</h1><p>Cuanto más preciso sea este perfil, más contexto tendrá cada análisis de ofertas.</p></div><span className="profile-state">{profileComplete(profile) ? "● Perfil base listo" : "○ Perfil en construcción"}</span></div><form className="profile-form" onSubmit={submit}>
    <section className="panel profile-section"><div className="section-copy"><p className="eyebrow">01 · DIRECCIÓN</p><h2>Objetivo profesional</h2><p>La base para entender qué oportunidades son relevantes para ti.</p></div><div className="section-fields"><label>Cargo objetivo<input required placeholder="Ej. Backend Developer" value={profile.targetRole} onChange={(event) => update("targetRole", event.target.value)} /></label><label>Resumen profesional<textarea placeholder="Cuéntanos en pocas líneas tu enfoque, fortalezas y tipo de retos que buscas." value={profile.professionalSummary || ""} onChange={(event) => update("professionalSummary", event.target.value)} /></label></div></section>
    <section className="panel profile-section"><div className="section-copy"><p className="eyebrow">02 · EXPERIENCIA</p><h2>Trayectoria y formación</h2><p>No necesitas un CV completo: resume lo que aporta contexto a tus decisiones.</p></div><div className="section-fields"><div className="form-row"><label>Años de experiencia<input required type="number" min="0" max="50" placeholder="0" value={profile.experienceYears} onChange={(event) => update("experienceYears", event.target.value)} /></label><label>Disponibilidad<select value={profile.availability || ""} onChange={(event) => update("availability", event.target.value)}><option value="">No indicada</option><option>Inmediata</option><option>En 15 días</option><option>En 30 días</option><option>Flexible</option></select></label></div><label>Experiencia relevante<textarea placeholder="Ej. Desarrollo de APIs, microservicios, automatización, liderazgo de proyectos..." value={profile.experienceDetail || ""} onChange={(event) => update("experienceDetail", event.target.value)} /></label><label>Educación o certificaciones<textarea placeholder="Ej. Ingeniería de Sistemas, AWS Cloud Practitioner, cursos relevantes..." value={profile.education || ""} onChange={(event) => update("education", event.target.value)} /></label></div></section>
    <section className="panel profile-section"><div className="section-copy"><p className="eyebrow">03 · HABILIDADES</p><h2>Tu caja de herramientas</h2><p>Organiza tus conocimientos en categorías y elimina cualquier elemento cuando quieras.</p></div><div className="section-fields"><SkillsManager profile={profile} setProfile={setProfile} /><label>Idiomas<input placeholder="Ej. Español nativo, Inglés B2" value={profile.languages || ""} onChange={(event) => update("languages", event.target.value)} /></label></div></section>
    <section className="panel profile-section"><div className="section-copy"><p className="eyebrow">04 · PREFERENCIAS</p><h2>Cómo quieres trabajar</h2><p>Estas preferencias ajustan la recomendación, pero no bloquean oportunidades.</p></div><div className="section-fields"><div className="form-row"><label>Ubicación<input placeholder="Ej. Lima" value={profile.location} onChange={(event) => update("location", event.target.value)} /></label><label>Modalidad<select value={profile.modality} onChange={(event) => update("modality", event.target.value)}><option value="">Sin preferencia</option><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label><label>Contrato<select value={profile.contractPreference || ""} onChange={(event) => update("contractPreference", event.target.value)}><option value="">Indiferente</option><option>Tiempo completo</option><option>Part-time</option><option>Freelance</option></select></label></div><label>Expectativa salarial<input placeholder="Ej. S/ 5000 - S/ 6500" value={profile.salaryExpectation || ""} onChange={(event) => update("salaryExpectation", event.target.value)} /></label></div></section>
    <div className="profile-save"><div><b>Todo listo para guardar.</b><span>Tu próximo análisis usará una copia de este perfil.</span></div><button className="button-primary" disabled={busy}>{busy ? "Guardando..." : "Guardar perfil"}</button></div><Notice error={error}>{message}</Notice>
  </form></section>;
}

function SettingsPage({ user, onLogout }) {
  return <section className="page narrow"><div className="page-title"><div><p className="eyebrow">CONFIGURACIÓN</p><h1>Tu cuenta.</h1><p>Gestiona tu información y sesión en JobMatch.</p></div></div><div className="settings-stack"><article className="panel setting-card"><div><p className="eyebrow">CUENTA</p><h2>{user.nombre || "Usuario JobMatch"}</h2><p>{user.email}</p></div><span className="setting-badge">Sesión activa</span></article><article className="panel setting-card danger"><div><p className="eyebrow">SESIÓN</p><h2>Cerrar sesión</h2><p>Tu sesión será cerrada.</p></div><button className="button-ghost" onClick={onLogout}>Cerrar sesión</button></article></div></section>;
}

function NewAnalysis({ profile, token, onCreated, navigate }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = profileComplete(profile);
  async function chooseFile(nextFile) {
    setFile(nextFile || null);
    setPreview(nextFile ? inspectCsv(await nextFile.text()) : null);
  }
  async function startAnalysis() {
    if (!file) return;
    setBusy(true); setError(false); setMessage("Creando sesión y enviando las ofertas...");
    try { onCreated(await submitOffers(token, profile, await file.text())); } catch (requestError) { setError(true); setMessage(requestError.message); } finally { setBusy(false); }
  }
  const steps = [{ number: 1, label: "Perfil", description: "Referencia profesional" }, { number: 2, label: "Archivo", description: "Ofertas en CSV" }, { number: 3, label: "Confirmar", description: "Iniciar proceso" }];
  return <section className="page new-analysis-page"><div className="setup-heading"><p className="eyebrow">NUEVO ANÁLISIS</p><h1>Analiza con contexto.</h1><p>Primero revisas el perfil y el archivo. Solo al confirmar se envían las ofertas a procesar.</p></div><div className="setup-layout"><aside className="panel setup-steps">{steps.map((item) => <button key={item.number} className={step === item.number ? "active" : step > item.number ? "done" : ""} disabled={item.number > step || (item.number === 3 && !file)} onClick={() => setStep(item.number)}><span>{step > item.number ? "✓" : item.number}</span><div><b>{item.label}</b><small>{item.description}</small></div></button>)}</aside><article className="panel setup-card">
    {step === 1 && <><div className="setup-card-heading"><p className="eyebrow">PASO 1 DE 3</p><h2>Confirma el perfil que usaremos.</h2><p>Esta información será una fotografía del momento; editarla después no cambia este análisis.</p></div>{ready ? <><div className="setup-profile-grid"><div><span>CARGO OBJETIVO</span><b>{profile.targetRole}</b></div><div><span>EXPERIENCIA</span><b>{profile.experienceYears} años</b></div><div className="wide"><span>HABILIDADES</span><p>{profile.skills.join(", ")}</p></div></div><div className="setup-actions"><button className="button-ghost" onClick={() => navigate("/app/perfil")}>Editar perfil</button><button className="button-primary" onClick={() => setStep(2)}>Continuar al CSV</button></div></> : <div className="setup-missing"><span>◌</span><h2>Falta completar tu perfil.</h2><p>Necesitamos cargo, experiencia y habilidades para hacer una comparación útil.</p><button className="button-primary" onClick={() => navigate("/app/perfil")}>Completar perfil</button></div>}</>}
    {step === 2 && <><div className="setup-card-heading"><p className="eyebrow">PASO 2 DE 3</p><h2>Revisa tu archivo de ofertas.</h2><p>Detectaremos las filas y campos antes de enviar absolutamente nada.</p></div><label className="drop-zone"><input type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0])} /><span>{file ? file.name : "Selecciona o arrastra tu archivo CSV"}</span><small>Admitimos los encabezados del equipo o del archivo demo.</small></label>{preview && <div className="file-preview"><div className="preview-metrics"><span><b>{preview.total}</b> ofertas detectadas</span><span><b>{(file.size / 1024).toFixed(1)} KB</b> tamaño</span><span className={preview.valid ? "valid" : "warning"}>{preview.valid ? "✓ Campos principales detectados" : "! Revisa cargo y descripción"}</span></div><div className="header-chips">{preview.headers.map((header) => <span key={header}>{header}</span>)}</div>{preview.sample.length > 0 && <div className="sample-table"><div className="sample-label">Vista previa · primeras {preview.sample.length} filas</div>{preview.sample.map((row, index) => <div className="sample-row" key={index}><b>{row.cargo || row.title || "Cargo no indicado"}</b><span>{row.empresa || row.company || "Empresa no indicada"}</span><small>{row.modalidad || row.modality || "Modalidad no indicada"}</small></div>)}</div>}</div>}<div className="setup-actions"><button className="button-ghost" onClick={() => setStep(1)}>Volver al perfil</button><button className="button-primary" disabled={!file || !preview?.total} onClick={() => setStep(3)}>Revisar antes de enviar</button></div></>}
    {step === 3 && <><div className="setup-card-heading"><p className="eyebrow">PASO 3 DE 3</p><h2>Todo listo para iniciar.</h2><p>Las ofertas se enviarán una única vez. Luego podrás seguir el procesamiento desde la pantalla de análisis.</p></div><div className="setup-confirm"><div><span>ARCHIVO</span><b>{file?.name}</b><small>{preview?.total || 0} ofertas detectadas</small></div><div><span>PERFIL</span><b>{profile.targetRole}</b><small>{profile.skills.length} habilidades como referencia</small></div><div><span>PROCESO</span><b>Asíncrono</b><small>Una oferta por mensaje en la cola</small></div></div><div className="setup-actions"><button className="button-ghost" onClick={() => setStep(2)}>Cambiar archivo</button><button className="button-primary" disabled={busy} onClick={startAnalysis}>{busy ? "Enviando ofertas..." : "Iniciar análisis"}</button></div><Notice error={error}>{message}</Notice></>}
  </article></div></section>;
}

function ResultCard({ item, highThreshold = 80, mediumThreshold = 55 }) {
  const [expanded, setExpanded] = useState(false);
  let skills = []; let strengths = []; let gaps = []; let keywords = []; let recommendations = "";
  try { 
    skills = JSON.parse(item.habilidades || "[]"); 
    strengths = JSON.parse(item.puntos_fuertes || "[]"); 
    gaps = JSON.parse(item.brechas || "[]"); 
    keywords = JSON.parse(item.palabras_clave_cv || "[]");
    recommendations = item.recomendaciones_cv || "";
  } catch { /* resultados antiguos */ }
  const score = Number(item.match_score) || 0;
  const level = score >= highThreshold ? "high" : score >= mediumThreshold ? "medium" : "low";
  const recommendation = item.recomendacion || (item.recomendacion_aplicar === true || item.recomendacion_aplicar === "True" ? "APLICAR" : item.recomendacion_aplicar === false || item.recomendacion_aplicar === "False" ? "NO_PRIORIZAR" : "APLICAR_CON_RESERVAS");
  const recommendationText = { APLICAR: "Aplicar", APLICAR_CON_RESERVAS: "Aplicar con reservas", NO_PRIORIZAR: "No priorizar" }[recommendation] || recommendation;
  
  // Valor por defecto más inteligente
  const modalidad = item.compatibilidad_modalidad || "Por evaluar";
  return <article className={`result-card ${level}`}><div className="result-card-top"><div><p className="eyebrow">{item.empresa || "EMPRESA"}</p><h2>{item.cargo || "Oferta laboral"}</h2></div><strong>{score}%<small>match</small></strong></div><div className="result-details"><span>{item.nivel_requerido || "Nivel no especificado"}</span><span>{item.salario_ofrecido || item.salario_estimado || "Salario no especificado"}</span></div><div className="result-tags"><span className={`recommendation ${recommendation.toLowerCase()}`}>{recommendationText}</span><span>{modalidad}</span></div><p className="result-verdict">{item.veredicto || "Análisis completado."}</p><button className="detail-toggle" onClick={() => setExpanded(!expanded)}>{expanded ? "Ocultar detalle ↑" : "Ver análisis completo ↓"}</button>{expanded && <div className="result-expanded">{strengths.length > 0 && <div><p className="detail-label">PUNTOS FUERTES</p><ul className="insight-list positive">{strengths.map((point) => <li key={point}>{point}</li>)}</ul></div>}{skills.length > 0 && <div><p className="detail-label">HABILIDADES REQUERIDAS</p><div className="skills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}{gaps.length > 0 && <div><p className="detail-label">BRECHAS A REVISAR</p><ul className="insight-list">{gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}{recommendations && <div><p className="detail-label">RECOMENDACIONES PARA TU CV</p><p className="insight-text">{recommendations}</p></div>}{keywords.length > 0 && <div><p className="detail-label">PALABRAS CLAVE PARA DESTACAR</p><div className="skills keywords">{keywords.map((word) => <span key={word}>{word}</span>)}</div></div>}</div>}</article>;
}

function AnalysisPage({ analysis, token, navigate }) {
  const [results, setResults] = useState({ resultados: [], total: 0 });
  const [message, setMessage] = useState("");
  const [view, setView] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [search, setSearch] = useState("");
  useEffect(() => { if (!analysis?.sesion_id) return undefined; let live = true; async function refresh() { try { const data = await getResults(token, analysis.sesion_id); if (live) setResults(data); } catch (requestError) { if (live) setMessage(requestError.message); } } refresh(); const id = window.setInterval(refresh, 3000); return () => { live = false; window.clearInterval(id); }; }, [analysis?.sesion_id, token]);
  if (!analysis) return <section className="page"><h1>Análisis no encontrado.</h1><button className="button-primary" onClick={() => navigate("/app/historial")}>Ver historial</button></section>;
  const complete = analysis.total ? Math.round((results.total / analysis.total) * 100) : 0;
  const scores = results.resultados.map((item) => Number(item.match_score) || 0);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  
  // Categorización dinámica: el match más alto siempre está en "high", sin importar su valor
  const highThreshold = maxScore > 0 ? Math.max(55, maxScore - 25) : 80;
  const mediumThreshold = Math.max(40, highThreshold - 15);
  
  const high = scores.filter((score) => score >= highThreshold).length;
  const medium = scores.filter((score) => score >= mediumThreshold && score < highThreshold).length;
  const low = scores.filter((score) => score < mediumThreshold).length;
  const average = scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0;
  const sortedByScore = [...results.resultados].sort((first, second) => Number(second.match_score) - Number(first.match_score));
  const visible = results.resultados.filter((item) => { const score = Number(item.match_score) || 0; const text = `${item.cargo} ${item.empresa}`.toLowerCase(); return (filter === "all" || (filter === "high" && score >= highThreshold) || (filter === "medium" && score >= mediumThreshold && score < highThreshold) || (filter === "low" && score < mediumThreshold)) && text.includes(search.toLowerCase()); }).sort((first, second) => sort === "score" ? Number(second.match_score) - Number(first.match_score) : `${first.empresa} ${first.cargo}`.localeCompare(`${second.empresa} ${second.cargo}`));
  const status = complete === 100 ? "Completado" : results.total ? "Procesando" : "Preparando análisis";
  return <section className="page analysis-page"><div className="analysis-header"><div><p className="eyebrow">SESIÓN DE ANÁLISIS</p><h1>{complete === 100 ? "Tus resultados están listos." : "Estamos leyendo tus ofertas."}</h1><p>{complete === 100 ? "Explora el resumen o revisa cada oferta con calma." : "Cada oferta se procesa de forma independiente; aparecerán aquí cuando estén listas."}</p></div><div className="analysis-header-side"><span className={`analysis-status ${complete === 100 ? "done" : ""}`}>● {status}</span><button className="button-ghost" onClick={() => navigate("/app/historial")}>Ver historial</button></div></div><article className="panel progress-card"><div><b>{results.total} de {analysis.total} ofertas listas</b><span>{complete}%</span></div><div className="progress-track"><i style={{ width: `${complete}%` }} /></div><div className="progress-meta"><span>Sesión {analysis.sesion_id}</span><span>{complete === 100 ? "Procesamiento finalizado" : "Actualizando automáticamente"}</span></div></article><Notice error>{message}</Notice>{results.total === 0 ? <section className="analysis-empty panel"><div className="pulse-orb">✦</div><div><p className="eyebrow">PROCESAMIENTO EN COLA</p><h2>Tu análisis acaba de empezar.</h2><p>En cuanto llegue el primer resultado, verás aquí el resumen de match, nivel, habilidades y brechas.</p></div><div className="skeleton-list"><i /><i /><i /></div></section> : <><div className="analysis-tabs"><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>Resumen</button><button className={view === "offers" ? "active" : ""} onClick={() => setView("offers")}>Ofertas <span>{results.total}</span></button></div>{view === "overview" ? <div className="analysis-overview"><div className="results-summary"><article><span>Match promedio</span><b>{average}%</b><small>entre ofertas listas</small></article><article><span>Matches altos</span><b>{high}</b><small>{highThreshold}% o más</small></article><article><span>Matches medios</span><b>{medium}</b><small>{mediumThreshold}% a {highThreshold - 1}%</small></article><article><span>Por revisar</span><b>{low}</b><small>menos de {mediumThreshold}%</small></article></div><div className="analysis-insights"><article className="panel score-distribution"><div><p className="eyebrow">DISTRIBUCIÓN</p><h2>Cómo se ven tus matches.</h2><p>Esto se actualiza a medida que llegan más resultados.</p></div><div className="distribution-bars"><span><i style={{ height: `${results.total ? Math.max(14, high / results.total * 100) : 0}%` }} /><b>{high}</b><small>Alto</small></span><span><i style={{ height: `${results.total ? Math.max(14, medium / results.total * 100) : 0}%` }} /><b>{medium}</b><small>Medio</small></span><span><i style={{ height: `${results.total ? Math.max(14, low / results.total * 100) : 0}%` }} /><b>{low}</b><small>Bajo</small></span></div></article><article className="panel top-matches"><p className="eyebrow">MEJORES MATCHES</p><h2>Las oportunidades más alineadas.</h2><div>{sortedByScore.slice(0, 3).map((item, index) => <button key={item.oferta_id} onClick={() => { setView("offers"); setFilter("all"); setSearch(item.empresa || item.cargo); }}><span>0{index + 1}</span><div><b>{item.cargo}</b><small>{item.empresa}</small></div><strong>{item.match_score}%</strong></button>)}</div></article></div></div> : <div className="offers-view"><div className="results-controls"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa o cargo" /><div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todas las ofertas</option><option value="high">Match alto</option><option value="medium">Match medio</option><option value="low">Match bajo</option></select><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="score">Mejor match</option><option value="company">Empresa / cargo</option></select></div></div><p className="filtered-count">Mostrando {visible.length} de {results.total} ofertas</p><div className="results-grid">{visible.map((item) => <ResultCard item={item} key={item.oferta_id} highThreshold={highThreshold} mediumThreshold={mediumThreshold} />)}</div>{visible.length === 0 && <div className="empty-filter">No encontramos ofertas con esos filtros.</div>}</div>}</>}</section>;
}

function HistoryPage({ history, navigate }) {
  return <section className="page"><div className="page-title"><div><p className="eyebrow">HISTORIAL</p><h1>Tus análisis.</h1><p>Cada sesión conserva el perfil y el archivo que confirmaste en ese momento.</p></div><button className="button-primary" onClick={() => navigate("/app/nuevo")}>Nuevo análisis</button></div>{history.length ? <div className="history-list">{history.map((item) => <button key={item.sesion_id} onClick={() => navigate(`/app/analisis/${item.sesion_id}`)}><span>{new Date(item.createdAt).toLocaleDateString()}</span><b>{item.total} ofertas</b><small>{item.profileName}</small><em>Ver resultados →</em></button>)}</div> : <article className="empty-state"><h2>Aún no hay análisis.</h2><p>Cuando confirmes un CSV, aparecerá aquí como una sesión separada.</p><button className="button-primary" onClick={() => navigate("/app/nuevo")}>Crear primer análisis</button></article>}</section>;
}

function PrivateApp({ route, navigate, auth, profile, setProfile, history, setHistory, onLogout }) {
  const segment = route.split("/")[2] || "dashboard";
  const analysisId = route.split("/")[3];
  const analysis = history.find((item) => item.sesion_id === analysisId);
  function created(result) { const item = { ...result, createdAt: new Date().toISOString(), profileName: profile.targetRole }; const next = [item, ...history]; setHistory(next); saveHistory(auth.email, next); navigate(`/app/analisis/${result.sesion_id}`); }
  return <div className="app-shell"><AppNav route={route} navigate={navigate} user={auth} onLogout={onLogout} /><main className="app-main">{segment === "dashboard" && <Dashboard profile={profile} history={history} navigate={navigate} user={auth} />}{segment === "perfil" && <ProfilePage profile={profile} setProfile={setProfile} token={auth.token} onSaved={(saved) => { const stored = { ...auth, perfil: saved }; sessionStorage.setItem("jobmatch_auth", JSON.stringify(stored)); }} />}{segment === "nuevo" && <NewAnalysis profile={profile} token={auth.token} onCreated={created} navigate={navigate} />}{segment === "analisis" && <AnalysisPage analysis={analysis} token={auth.token} navigate={navigate} />}{segment === "historial" && <HistoryPage history={history} navigate={navigate} />}{segment === "configuracion" && <SettingsPage user={auth} onLogout={onLogout} />}</main></div>;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [auth, setAuth] = useState(() => { try { return JSON.parse(sessionStorage.getItem("jobmatch_auth") || "null"); } catch { return null; } });
  const [profile, setProfile] = useState(() => auth?.perfil || EMPTY_PROFILE);
  const [history, setHistory] = useState(() => auth?.email ? loadHistory(auth.email) : []);
  useEffect(() => { const listener = () => setRoute(getRoute()); window.addEventListener("hashchange", listener); return () => window.removeEventListener("hashchange", listener); }, []);
  function navigate(path) { window.location.hash = path; }
  function authenticated(result) { const next = { ...result, perfil: result.perfil || EMPTY_PROFILE }; sessionStorage.setItem("jobmatch_auth", JSON.stringify(next)); setAuth(next); setProfile(next.perfil); setHistory(loadHistory(next.email)); navigate("/app/dashboard"); }
  function logout() { sessionStorage.removeItem("jobmatch_auth"); setAuth(null); setProfile(EMPTY_PROFILE); setHistory([]); navigate("/"); }
  const needsAuth = route.startsWith("/app");
  return needsAuth && auth ? <PrivateApp route={route} navigate={navigate} auth={auth} profile={profile} setProfile={setProfile} history={history} setHistory={setHistory} onLogout={logout} /> : <main className="public-main"><PublicHeader navigate={navigate} />{route === "/login" || route === "/registro" || needsAuth ? <AuthPage mode={route === "/registro" ? "registro" : "login"} navigate={navigate} onAuthenticated={authenticated} /> : <Landing navigate={navigate} />}</main>;
}
