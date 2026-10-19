const app = document.getElementById("app");
const toastNode = document.getElementById("toast");
const PALETTE = ["#54e1d2", "#b7a4ff", "#ffc17b", "#f7f8ff", "#80e5b9", "#e2a7ff", "#8bb6ff"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastNode.classList.remove("show"), 2600);
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Une erreur est survenue. Réessaie.");
  return data;
}
function authHeaders(key) { return { Authorization: "Bearer " + key }; }
function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function participantIdFor(activityId) {
  const key = "ndm-participant-" + activityId;
  let id = localStorage.getItem(key);
  if (!id) { id = randomId(); localStorage.setItem(key, id); }
  return id;
}
function savedWordsFor(activityId) {
  try { return JSON.parse(localStorage.getItem("ndm-words-" + activityId) || "[]"); }
  catch { return []; }
}
function tokenize(text) {
  return (String(text || "").normalize("NFC").match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []);
}
function uniqueWords(words) {
  const seen = new Set();
  return words.filter((word) => {
    const key = word.normalize("NFKC").toLocaleLowerCase("fr");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function formatDate(value) {
  try { return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return ""; }
}
function setLoadingButton(button, busy, busyText = "En cours…") {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.classList.toggle("loading-button", busy);
  button.textContent = busy ? busyText : button.dataset.label;
}
function topbarLabel(label, subtitle = "") {
  return '<div class="eyebrow">' + escapeHtml(label) + '</div>' + (subtitle ? '<p>' + escapeHtml(subtitle) + '</p>' : "");
}
function cloudMarkup(words, emptyTitle = "Le nuage se construit", emptyMessage = "Dès que les premiers mots seront envoyés, ils apparaîtront ici.") {
  if (!words || !words.length) {
    return '<div class="empty-cloud"><div class="empty-icon" aria-hidden="true">✳</div><strong>' + escapeHtml(emptyTitle) + '</strong><span>' + escapeHtml(emptyMessage) + '</span></div>';
  }
  const sorted = [...words].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "fr"));
  const max = Math.max(...sorted.map((item) => item.count), 1);
  const min = Math.min(...sorted.map((item) => item.count), max);
  return sorted.map((item, index) => {
    const ratio = max === min ? 1 : (item.count - min) / (max - min);
    const size = Math.round(15 + Math.sqrt(ratio) * 34);
    const color = PALETTE[index % PALETTE.length];
    return '<span class="cloud-item" style="font-size:' + size + 'px;color:' + color + '" title="' + item.count + (item.count > 1 ? ' occurrences' : ' occurrence') + '">' + escapeHtml(item.word) + '</span>';
  }).join("");
}
function landingPage() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">La parole à toute la classe</div>
        <h1>Les idées de chacun.<br><span class="gradient-text">Un nuage commun.</span></h1>
        <p class="lead">Pose une question à tes élèves, invite-les à répondre en quelques mots et regarde émerger les idées qui comptent le plus pour le groupe.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#creer">＋ Créer un nuage <span aria-hidden="true">→</span></a>
          <a class="btn btn-secondary" href="#comment">Comment ça marche ?</a>
        </div>
        <div class="hero-proof"><div class="avatar-stack" aria-hidden="true"><span>✦</span><span>✳</span><span>●</span></div><span>Sans compte élève · Réponses anonymes · Résultats en direct</span></div>
      </div>
      <div class="hero-art" aria-label="Exemple d'un nuage de mots">
        <div class="art-bar"><span>APERÇU DU NUAGE DE MOTS</span><span class="art-tag">Exemple</span></div>
        <div class="demo-cloud">
          <span class="cloud-word w2">Liberté</span><span class="cloud-word w3">Égalité</span>
          <span class="cloud-word w1">Démocratie</span><span class="cloud-word w4">Vote</span>
          <span class="cloud-word w5">Peuple</span><span class="cloud-word w2">Droits</span>
          <span class="cloud-word w6">Justice</span><span class="cloud-word w3">Respect</span>
          <span class="cloud-word w4">Choix</span><span class="cloud-word w5">Débat</span>
        </div>
        <div class="art-caption"><span>Chaque mot compte.</span><span>Plus il revient, plus il grandit ↗</span></div>
      </div>
    </section>
    <section class="steps" id="comment" aria-label="Comment ça marche">
      <article class="step-card"><div class="step-num">01</div><h3>Pose ta question</h3><p>Crée une activité et choisis si les élèves répondent avec deux ou trois mots.</p></article>
      <article class="step-card"><div class="step-num">02</div><h3>Partage le lien</h3><p>Les élèves répondent depuis leur téléphone, tablette ou ordinateur, sans compte.</p></article>
      <article class="step-card"><div class="step-num">03</div><h3>Fais émerger les idées</h3><p>Les réponses se rassemblent dans un nuage collectif qui se met à jour automatiquement.</p></article>
    </section>
    <section class="create-panel" id="creer">
      <div class="panel-heading">
        <div class="eyebrow">Prêt à commencer ?</div>
        <h2>Crée ton premier nuage</h2>
        <p>Une question claire, quelques mots par élève, et c'est parti.</p>
      </div>
      <form id="create-form">
        <div class="form-field">
          <label class="form-label" for="question">Ta question</label>
          <textarea class="field-control" id="question" name="question" maxlength="240" required placeholder="Ex. : C’est quoi la démocratie pour vous ?" rows="3"></textarea>
          <p class="field-hint">Elle sera visible par tous les élèves qui ouvriront le lien.</p>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label" for="maxWords">Mots maximum par élève</label>
            <select class="field-control" id="maxWords" name="maxWords">
              <option value="2">2 mots</option><option value="3" selected>3 mots</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label" for="activityTitle">Nom de l'activité (facultatif)</label>
            <input class="field-control" id="activityTitle" name="title" maxlength="70" placeholder="Ex. : EMC — La démocratie">
          </div>
        </div>
        <button type="submit" class="btn btn-primary form-submit">Créer l'activité <span aria-hidden="true">→</span></button>
        <p class="privacy-note">Les élèves ne donnent ni leur nom ni leur adresse e-mail.</p>
      </form>
      <div id="create-error" class="inline-error" hidden></div>
    </section>
  `;
  document.getElementById("create-form").addEventListener("submit", createActivity);
}
async function createActivity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const errorNode = document.getElementById("create-error");
  errorNode.hidden = true;
  const question = document.getElementById("question").value.trim();
  const title = document.getElementById("activityTitle").value.trim();
  const maxWords = Number(document.getElementById("maxWords").value);
  if (!question) { errorNode.textContent = "Écris une question avant de créer l'activité."; errorNode.hidden = false; return; }
  setLoadingButton(button, true, "Création du nuage…");
  try {
    const result = await api("/api/activities", { method: "POST", body: JSON.stringify({ question, title, maxWords }) });
    localStorage.setItem("ndm-key-" + result.id, result.adminKey);
    location.href = "/?manage=" + encodeURIComponent(result.id);
  } catch (error) {
    errorNode.textContent = error.message;
    errorNode.hidden = false;
    setLoadingButton(button, false);
  }
}
function teacherGate(activityId, errorMessage = "") {
  app.innerHTML = `
    <section class="create-panel teacher-gate">
      <div class="panel-heading"><div class="eyebrow">Espace enseignant</div><h1>Retrouver ton nuage</h1><p>Entre la clé d’accès enseignant fournie à la création de l’activité. Les élèves n’en ont pas besoin.</p></div>
      <form id="teacher-gate-form">
        <label class="form-label" for="teacher-key">Clé d’accès enseignant</label>
        <input class="field-control" id="teacher-key" required autocomplete="off" spellcheck="false" placeholder="Colle ta clé d’accès ici">
        <button class="btn btn-primary" type="submit">Ouvrir le tableau de bord →</button>
        <p id="gate-error" class="inline-error" ${errorMessage ? "" : "hidden"}>${escapeHtml(errorMessage)}</p>
      </form>
      <p class="privacy-note">La clé est différente du lien partagé avec les élèves.</p>
    </section>`;
  document.getElementById("teacher-gate-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = document.getElementById("teacher-key").value.trim();
    const errorNode = document.getElementById("gate-error");
    const button = event.currentTarget.querySelector("button");
    setLoadingButton(button, true, "Vérification…");
    try {
      await api("/api/activities/" + encodeURIComponent(activityId) + "/admin", { headers: authHeaders(key) });
      localStorage.setItem("ndm-key-" + activityId, key);
      renderTeacher(activityId, key);
    } catch (error) {
      errorNode.textContent = "Clé non reconnue ou activité introuvable. Vérifie la clé et réessaie.";
      errorNode.hidden = false;
      setLoadingButton(button, false);
    }
  });
}
function teacherPageShell(data, activityId, key) {
  const studentUrl = location.origin + "/?activity=" + encodeURIComponent(activityId);
  const manageUrl = location.origin + "/?manage=" + encodeURIComponent(activityId);
  app.innerHTML = `
    <div id="admin-dashboard">
      <div class="view-header">
        <div><div class="eyebrow">Tableau de bord enseignant</div><h1>${escapeHtml(data.title || "Ton nuage de mots")}</h1><p>${escapeHtml(data.question)}</p></div>
        <span id="status-pill" class="status-pill ${data.isOpen ? "" : "closed"}">${data.isOpen ? "Réponses ouvertes" : "Réponses fermées"}</span>
      </div>
      <div class="stats">
        <div class="stat"><strong id="stat-responses">${data.responseCount}</strong><span>RÉPONSES REÇUES</span></div>
        <div class="stat"><strong id="stat-words">${data.words.length}</strong><span>MOTS DIFFÉRENTS</span></div>
        <div class="stat"><strong id="stat-top">${data.words[0] ? escapeHtml(data.words[0].word) : "—"}</strong><span>MOT LE PLUS CITÉ</span></div>
      </div>
      <div class="dashboard-grid">
        <section class="panel word-cloud-panel">
          <div class="panel-title-row"><h2>Le nuage de la classe</h2><span class="panel-kicker" id="last-updated">Mis à jour à l'instant</span></div>
          <div id="admin-cloud" class="word-cloud">${cloudMarkup(data.words)}</div>
        </section>
        <aside class="sidebar">
          <section class="panel share-card">
            <div class="eyebrow">À partager avec la classe</div><h3 style="margin:10px 0 4px">Le lien des élèves</h3>
            <p class="small-text">Toute personne ayant ce lien peut participer pendant que les réponses sont ouvertes.</p>
            <div class="share-url"><span id="student-url-text">${escapeHtml(studentUrl)}</span><button id="copy-student-link" type="button">Copier</button></div>
            <button type="button" id="open-student-link" class="btn btn-secondary full-width">Ouvrir la vue élève ↗</button>
            <div class="divider"></div>
            <div class="key-wrap">
              <span class="form-label">Ta clé enseignant</span>
              <div class="key-row"><code id="admin-key-value">••••••••••••••••••••</code><button type="button" id="reveal-key" class="text-button">Afficher</button></div>
              <button type="button" id="copy-admin-key" class="text-button" style="margin-top:8px">Copier la clé</button>
              <p class="small-text">Garde-la privée : elle permet de fermer l'activité et d'effacer les réponses.</p>
            </div>
          </section>
          <section class="panel">
            <div class="panel-title-row"><h3>Gérer l'activité</h3></div>
            <div class="side-actions">
              <button type="button" id="toggle-activity" class="btn btn-primary">${data.isOpen ? "Fermer les réponses" : "Réouvrir les réponses"}</button>
              <button type="button" id="export-csv" class="btn btn-secondary">↓ Exporter les fréquences (CSV)</button>
              <button type="button" id="reset-activity" class="btn btn-danger">Effacer toutes les réponses</button>
              <a class="btn btn-quiet" href="/">＋ Créer une autre activité</a>
            </div>
            <div class="divider"></div>
            <p class="small-text">Créée le ${escapeHtml(formatDate(data.createdAt))}. Les mots sont affichés sous forme de fréquences, sans nom d'élève.</p>
          </section>
        </aside>
      </div>
    </div>`;
  document.getElementById("copy-student-link").addEventListener("click", () => copyText(studentUrl, "Lien élève copié."));
  document.getElementById("open-student-link").addEventListener("click", () => window.open(studentUrl, "_blank", "noopener,noreferrer"));
  document.getElementById("reveal-key").addEventListener("click", (event) => {
    const visible = event.currentTarget.dataset.visible === "true";
    event.currentTarget.dataset.visible = String(!visible);
    document.getElementById("admin-key-value").textContent = visible ? "••••••••••••••••••••" : key;
    event.currentTarget.textContent = visible ? "Afficher" : "Masquer";
  });
  document.getElementById("copy-admin-key").addEventListener("click", () => copyText(key, "Clé enseignant copiée. Garde-la privée."));
  document.getElementById("toggle-activity").addEventListener("click", toggleActivity);
  document.getElementById("export-csv").addEventListener("click", exportCsv);
  document.getElementById("reset-activity").addEventListener("click", resetActivity);
}
let activeTeacher = null;
let teacherPollTimer = null;
function renderTeacher(activityId, key) {
  activeTeacher = { activityId, key, data: null };
  if (teacherPollTimer) clearInterval(teacherPollTimer);
  loadTeacherData(true);
  teacherPollTimer = setInterval(() => loadTeacherData(false), 4000);
}
async function loadTeacherData(firstRender) {
  if (!activeTeacher) return;
  try {
    const data = await api("/api/activities/" + encodeURIComponent(activeTeacher.activityId) + "/admin", { headers: authHeaders(activeTeacher.key) });
    activeTeacher.data = data;
    if (firstRender || !document.getElementById("admin-dashboard")) teacherPageShell(data, activeTeacher.activityId, activeTeacher.key);
    updateTeacherNumbers(data);
  } catch (error) {
    if (firstRender) renderError("Impossible d'ouvrir cette activité", error.message);
  }
}
function updateTeacherNumbers(data) {
  const ids = ["stat-responses", "stat-words", "stat-top", "admin-cloud", "status-pill", "toggle-activity"];
  if (!ids.every((id) => document.getElementById(id))) return;
  document.getElementById("stat-responses").textContent = data.responseCount;
  document.getElementById("stat-words").textContent = data.words.length;
  document.getElementById("stat-top").textContent = data.words[0] ? data.words[0].word : "—";
  document.getElementById("admin-cloud").innerHTML = cloudMarkup(data.words);
  const pill = document.getElementById("status-pill");
  pill.className = "status-pill" + (data.isOpen ? "" : " closed");
  pill.textContent = data.isOpen ? "Réponses ouvertes" : "Réponses fermées";
  document.getElementById("toggle-activity").textContent = data.isOpen ? "Fermer les réponses" : "Réouvrir les réponses";
  document.getElementById("last-updated").textContent = "Actualisé à " + new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}
async function toggleActivity() {
  if (!activeTeacher) return;
  const button = document.getElementById("toggle-activity");
  setLoadingButton(button, true, "Mise à jour…");
  try {
    await api("/api/activities/" + encodeURIComponent(activeTeacher.activityId) + "/toggle", { method: "POST", headers: authHeaders(activeTeacher.key) });
    await loadTeacherData(false);
    showToast(activeTeacher.data.isOpen ? "Les réponses sont ouvertes." : "Les réponses sont fermées.");
  } catch (error) { showToast(error.message); }
  finally { if (button.isConnected) { button.disabled = false; button.classList.remove("loading-button"); button.textContent = activeTeacher.data?.isOpen ? "Fermer les réponses" : "Réouvrir les réponses"; } }
}
async function resetActivity() {
  if (!activeTeacher || !confirm("Effacer toutes les réponses de cette activité ? Cette action est irréversible.")) return;
  try {
    await api("/api/activities/" + encodeURIComponent(activeTeacher.activityId) + "/reset", { method: "POST", headers: authHeaders(activeTeacher.key) });
    await loadTeacherData(false);
    showToast("Toutes les réponses ont été effacées.");
  } catch (error) { showToast(error.message); }
}
function exportCsv() {
  const words = activeTeacher?.data?.words || [];
  if (!words.length) { showToast("Il n'y a pas encore de mots à exporter."); return; }
  const rows = [["Mot", "Fréquence"], ...words.map((row) => [row.word, row.count])];
  const csv = "\uFEFF" + rows.map((row) => row.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "nuage-de-mots-" + activeTeacher.activityId + ".csv";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast("Export CSV téléchargé.");
}
async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = value; temp.style.position = "fixed"; temp.style.opacity = "0";
    document.body.appendChild(temp); temp.select();
    const ok = document.execCommand("copy"); temp.remove();
    showToast(ok ? successMessage : "Copie impossible sur cet appareil.");
  }
}
async function studentPage(activityId) {
  let data;
  try { data = await api("/api/activities/" + encodeURIComponent(activityId)); }
  catch (error) { renderError("Ce nuage est introuvable", "Vérifie que le lien est complet. " + error.message); return; }
  const saved = savedWordsFor(activityId);
  const participantId = participantIdFor(activityId);
  app.innerHTML = `
    <div class="view-header">
      <div><div class="eyebrow">Participation anonyme</div><h1>À toi de jouer.</h1><p id="student-question">${escapeHtml(data.question)}</p></div>
      <span id="student-status" class="status-pill ${data.isOpen ? "" : "closed"}">${data.isOpen ? "Réponses ouvertes" : "Réponses fermées"}</span>
    </div>
    <div class="student-layout">
      <section class="panel student-form">
        <div class="panel-title-row"><h2>Ta réponse</h2><span class="panel-kicker">${data.maxWords} mots max.</span></div>
        <p style="font-size:13px;margin-bottom:16px">Quels mots te viennent à l'esprit ? Sépare-les par un espace, une virgule ou un retour à la ligne.</p>
        <form id="answer-form">
          <label for="answer-words" class="form-label">Tes mots</label>
          <textarea id="answer-words" class="field-control" maxlength="180" placeholder="Liberté, égalité, vote…" ${data.isOpen ? "" : "disabled"}>${escapeHtml(saved.join(" "))}</textarea>
          <div class="response-counter"><span>Les doublons dans ta réponse ne comptent qu'une fois.</span><strong id="word-counter">0/${data.maxWords}</strong></div>
          <button type="submit" id="submit-answer" class="btn btn-primary" ${data.isOpen ? "" : "disabled"}>${saved.length ? "Modifier ma réponse →" : "Envoyer ma réponse →"}</button>
          <p id="answer-message" class="inline-error" hidden></p>
        </form>
        <div class="response-help">Pas besoin de donner ton nom. Ta réponse est ajoutée au nuage de la classe. Tu peux la modifier depuis ce navigateur tant que les réponses restent ouvertes.</div>
      </section>
      <section class="panel result-cloud">
        <div class="panel-title-row"><h2>Le nuage de la classe</h2><span class="panel-kicker" id="student-response-count">${data.responseCount} réponse${data.responseCount === 1 ? "" : "s"}</span></div>
        <div id="student-cloud" class="word-cloud">${cloudMarkup(data.words, "Les premières idées arrivent", "Le nuage se remplira à mesure que la classe répond.")}</div>
        <div class="art-caption"><span>Le mot le plus cité apparaît plus gros.</span><span id="student-updated">En direct</span></div>
      </section>
    </div>
  `;
  const area = document.getElementById("answer-words");
  const countWords = () => {
    const words = uniqueWords(tokenize(area.value));
    const count = document.getElementById("word-counter");
    count.textContent = words.length + "/" + data.maxWords;
    count.style.color = words.length > data.maxWords ? "#ff9ca8" : "var(--cyan)";
    const submit = document.getElementById("submit-answer");
    submit.disabled = !data.isOpen || words.length === 0 || words.length > data.maxWords;
    return words;
  };
  area.addEventListener("input", countWords);
  countWords();
  document.getElementById("answer-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const words = countWords();
    const message = document.getElementById("answer-message");
    message.hidden = true;
    if (!words.length || words.length > data.maxWords) {
      message.textContent = "Utilise entre 1 et " + data.maxWords + " mots différents.";
      message.hidden = false; return;
    }
    const button = document.getElementById("submit-answer");
    setLoadingButton(button, true, "Envoi en cours…");
    try {
      const result = await api("/api/activities/" + encodeURIComponent(activityId) + "/answer", {
        method: "POST",
        body: JSON.stringify({ participantId, words })
      });
      localStorage.setItem("ndm-words-" + activityId, JSON.stringify(words));
      data = result;
      document.getElementById("student-cloud").innerHTML = cloudMarkup(data.words);
      document.getElementById("student-response-count").textContent = data.responseCount + " réponse" + (data.responseCount === 1 ? "" : "s");
      button.textContent = "Modifier ma réponse →";
      button.dataset.label = button.textContent;
      button.disabled = false;
      message.className = "inline-success";
      message.style.color = "var(--green)";
      message.textContent = "Ta réponse a bien été enregistrée. Merci !";
      message.hidden = false;
      showToast("Réponse enregistrée !");
    } catch (error) {
      message.textContent = error.message; message.hidden = false;
      setLoadingButton(button, false);
    }
  });
  setInterval(async () => {
    try {
      const latest = await api("/api/activities/" + encodeURIComponent(activityId));
      data = latest;
      document.getElementById("student-cloud").innerHTML = cloudMarkup(latest.words);
      document.getElementById("student-response-count").textContent = latest.responseCount + " réponse" + (latest.responseCount === 1 ? "" : "s");
      const status = document.getElementById("student-status");
      status.className = "status-pill" + (latest.isOpen ? "" : " closed");
      status.textContent = latest.isOpen ? "Réponses ouvertes" : "Réponses fermées";
      area.disabled = !latest.isOpen;
      const submit = document.getElementById("submit-answer");
      if (!latest.isOpen) { submit.disabled = true; submit.textContent = "Les réponses sont fermées"; }
      else { submit.textContent = localStorage.getItem("ndm-words-" + activityId) ? "Modifier ma réponse →" : "Envoyer ma réponse →"; countWords(); }
      document.getElementById("student-updated").textContent = "Actualisé à " + new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch {}
  }, 5000);
}
function renderError(title, message) {
  if (teacherPollTimer) clearInterval(teacherPollTimer);
  app.innerHTML = '<section class="panel error-panel"><div class="eyebrow">Oups, un petit problème</div><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(message) + '</p><a class="btn btn-primary" href="/">Retour à l’accueil</a></section>';
}
async function start() {
  const params = new URLSearchParams(location.search);
  const activityId = params.get("activity");
  const manageId = params.get("manage");
  if (activityId) return studentPage(activityId);
  if (manageId) {
    const key = localStorage.getItem("ndm-key-" + manageId);
    if (key) return renderTeacher(manageId, key);
    return teacherGate(manageId);
  }
  landingPage();
}
start();
