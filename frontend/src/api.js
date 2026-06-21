const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

if (!baseUrl) {
  throw new Error("VITE_API_URL no configurado. Configura tu URL de API Gateway en .env");
}

function parseSavedProfile(profile) {
  if (!profile || typeof profile === "object") return profile || null;
  try {
    const parsed = JSON.parse(profile);
    return parsed && typeof parsed === "object" ? parsed : { professionalSummary: profile };
  } catch {
    return { professionalSummary: profile };
  }
}

function csvRows(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const cells = []; let current = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') { if (quoted && line[index + 1] === '"') { current += '"'; index += 1; } else quoted = !quoted; }
      else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
      else current += char;
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = parseLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

export function inspectCsv(text) {
  const headerLine = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim()) || "";
  const headers = headerLine.split(",").map((header) => header.replace(/^"|"$/g, "").trim().toLowerCase()).filter(Boolean);
  const rows = csvRows(text);
  const hasJob = headers.some((header) => ["cargo", "title"].includes(header));
  const hasDescription = headers.some((header) => ["descripcion", "descripción", "description"].includes(header));
  return { headers, total: rows.length, sample: rows.slice(0, 3), valid: hasJob && hasDescription };
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "La solicitud falló.");
  return data;
}

function authHeaders(token) {
  return { "content-type": "application/json", authorization: `Bearer ${token}` };
}

export async function registerUser(user) {
  return readJson(await fetch(`${baseUrl}/usuario/registro`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(user) }));
}

export async function loginUser(credentials) {
  const response = await readJson(await fetch(`${baseUrl}/usuario/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials) }));
  return { ...response, perfil: parseSavedProfile(response.perfil) };
}

export async function saveProfile(token, perfil) {
  // Comprimir perfil antes de enviar (DynamoDB max 400KB por item)
  const perfilComprimido = {
    targetRole: perfil.targetRole,
    experienceYears: perfil.experienceYears,
    skills: perfil.skills?.slice(0, 30) || [],
    modality: perfil.modality,
    salaryExpectation: perfil.salaryExpectation,
  };
  
  const response = await readJson(await fetch(`${baseUrl}/usuario/perfil`, { 
    method: "PUT", 
    headers: authHeaders(token), 
    body: JSON.stringify({ perfil: JSON.stringify(perfilComprimido) }) 
  }));
  return { ...response, perfil: parseSavedProfile(response.perfil) };
}

export async function submitOffers(token, perfil, csv) {
  return readJson(await fetch(`${baseUrl}/oferta/procesar`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ csv, perfil: JSON.stringify(perfil) }) }));
}

export async function getResults(token, sesionId) {
  return readJson(await fetch(`${baseUrl}/oferta/resultados?sesion_id=${encodeURIComponent(sesionId)}`, { headers: { authorization: `Bearer ${token}` } }));
}
