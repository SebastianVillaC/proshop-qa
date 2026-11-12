// Crea en GitHub Issues las etiquetas de gestión de defectos y un issue por cada defecto
// registrado en .github/defectos.json. Es idempotente: no duplica etiquetas ni issues existentes.
//
// Requisitos: un token de GitHub con permiso "Issues: Read and write" sobre el repositorio
// (Settings > Developer settings > Fine-grained tokens).
//
// Uso:
//   GITHUB_TOKEN=xxxx GITHUB_REPO=usuario/proshop-qa node scripts/crear-issues.mjs
//   (PowerShell:  $env:GITHUB_TOKEN="xxxx"; $env:GITHUB_REPO="usuario/proshop-qa"; node scripts/crear-issues.mjs)
//
// Todos los issues se crean ABIERTOS (estado "Nuevo"). El cierre de cada defecto se hace
// siguiendo el ciclo de vida descrito en docs/08-gestion-de-defectos.md.
import fs from 'fs';

const { GITHUB_TOKEN, GITHUB_REPO } = process.env;
if (!GITHUB_TOKEN || !GITHUB_REPO) {
  console.error('Defina GITHUB_TOKEN y GITHUB_REPO (formato usuario/repositorio).');
  process.exit(1);
}

const API = `https://api.github.com/repos/${GITHUB_REPO}`;
const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'proshop-qa-defectos',
};

const gh = async (method, url, body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok && res.status !== 422) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const SEVERIDAD = { 'Crítico': 'b60205', Alto: 'd93f0b', Medio: 'fbca04', Bajo: '0e8a16' };
const PRIORIDAD = { P1: 'b60205', P2: 'd93f0b', P3: 'fbca04', P4: 'c5def5' };

const labels = [
  { name: 'defecto', color: 'd73a4a', description: 'Defecto encontrado por el equipo de QA' },
  ...Object.entries(SEVERIDAD).map(([s, color]) => ({ name: `severidad: ${s}`, color, description: `Severidad ${s}` })),
  ...Object.entries(PRIORIDAD).map(([p, color]) => ({ name: `prioridad: ${p}`, color, description: `Prioridad ${p}` })),
  { name: 'estado: en progreso', color: '1d76db', description: 'Defecto en corrección' },
  { name: 'estado: verificado', color: '0e8a16', description: 'Corrección verificada por QA' },
  { name: 'seguridad', color: '5319e7', description: 'Hallazgo de seguridad (OWASP Top 10)' },
];

const defectos = JSON.parse(fs.readFileSync(new URL('../.github/defectos.json', import.meta.url)));

const body = (d) => `**ID:** ${d.id}
**Módulo:** ${d.modulo}
**Requisito afectado:** ${d.requisito}
**OWASP Top 10:** ${d.owasp}
**Severidad:** ${d.severidad} · **Prioridad:** ${d.prioridad}
**Detectado por:** ${d.detectado_por}

### Descripción
${d.descripcion}

### Pasos para reproducir
${d.pasos}

### Resultado esperado
${d.esperado}

### Resultado obtenido
${d.obtenido}

### Evidencia
${d.evidencia}

### Ambiente
Local: Node 24, MongoDB 7 (Docker), backend :5001, frontend :3000, datos semilla.`;

(async () => {
  for (const l of labels) {
    await gh('POST', `${API}/labels`, l);
    console.log('etiqueta', l.name);
  }

  const existentes = [];
  for (let page = 1; ; page++) {
    const batch = await gh('GET', `${API}/issues?state=all&per_page=100&page=${page}`);
    existentes.push(...batch);
    if (batch.length < 100) break;
  }

  for (const d of defectos) {
    const title = `[${d.id}] ${d.titulo}`;
    const found = existentes.find((i) => i.title.startsWith(`[${d.id}]`));
    if (found) {
      console.log(`ya existe #${found.number} ${title}`);
      continue;
    }
    const issueLabels = ['defecto', `severidad: ${d.severidad}`, `prioridad: ${d.prioridad}`];
    if (d.owasp && d.owasp !== '-') issueLabels.push('seguridad');
    const issue = await gh('POST', `${API}/issues`, { title, body: body(d), labels: issueLabels });
    console.log(`creado #${issue.number} ${title}`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
