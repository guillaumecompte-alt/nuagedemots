const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
const error = (message, status = 400) => json({ error: message }, status);
const hex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
const newSecret = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return hex(bytes);
};
const normalizeKey = (word) => String(word).normalize("NFKC").toLocaleLowerCase("fr");
const WORD_PATTERN = /^[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*$/u;

function summary(meta, responses) {
  const counts = new Map();
  for (const response of Object.values(responses || {})) {
    for (const word of response.words || []) {
      const key = normalizeKey(word);
      if (!counts.has(key)) counts.set(key, { word, count: 0 });
      counts.get(key).count += 1;
    }
  }
  const words = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "fr"));
  return {
    id: meta.id,
    title: meta.title || "",
    question: meta.question,
    maxWords: meta.maxWords,
    isOpen: meta.isOpen,
    createdAt: meta.createdAt,
    responseCount: Object.keys(responses || {}).length,
    words
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "nuagedemots" });
    }

    if (url.pathname === "/api/activities" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return error("La demande est invalide."); }
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 70) : "";
      const maxWords = Number(body.maxWords);
      if (!question) return error("La question est obligatoire.");
      if (question.length > 240) return error("La question est trop longue (240 caractères maximum).");
      if (![2, 3].includes(maxWords)) return error("Choisis une limite de 2 ou 3 mots.");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const id = newSecret(6);
        const adminKey = newSecret(32);
        const stub = env.ACTIVITIES.get(env.ACTIVITIES.idFromName(id));
        const response = await stub.fetch("https://activity.internal/__init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, adminKey, question, title, maxWords, createdAt: new Date().toISOString() })
        });
        if (response.status === 201) return json({ id, adminKey, question, title, maxWords }, 201);
        if (response.status !== 409) return error("Impossible de créer l'activité pour le moment.", 500);
      }
      return error("Impossible de créer un identifiant unique. Réessaie.", 503);
    }

    const match = url.pathname.match(/^\/api\/activities\/([a-f0-9]{12})(?:\/(admin|answer|toggle|reset))?$/i);
    if (!match) return error("Cette adresse d'API n'existe pas.", 404);
    const [, activityId, action] = match;
    const method = request.method.toUpperCase();
    if ((!action && method !== "GET") ||
        (action === "admin" && method !== "GET") ||
        (["answer", "toggle", "reset"].includes(action) && method !== "POST")) {
      return error("Méthode non autorisée.", 405);
    }
    const stub = env.ACTIVITIES.get(env.ACTIVITIES.idFromName(activityId.toLowerCase()));
    const internalPath = action ? "/" + action : "/";
    const forwarded = new Request("https://activity.internal" + internalPath, request);
    return stub.fetch(forwarded);
  }
};

export class ActivityStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.serialQueue = Promise.resolve();
  }

  runExclusive(operation) {
    const result = this.serialQueue.then(operation, operation);
    this.serialQueue = result.catch(() => {});
    return result;
  }

  async getMeta() {
    return this.ctx.storage.get("meta");
  }

  async getResponses() {
    return (await this.ctx.storage.get("responses")) || {};
  }

  async publicSummary() {
    const [meta, responses] = await Promise.all([this.getMeta(), this.getResponses()]);
    if (!meta) return null;
    return summary(meta, responses);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/__init" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return error("Initialisation invalide."); }
      return this.runExclusive(async () => {
        if (await this.getMeta()) return error("Identifiant déjà utilisé.", 409);
        await this.ctx.storage.put("meta", {
          id: body.id,
          adminKey: body.adminKey,
          question: body.question,
          title: body.title || "",
          maxWords: body.maxWords,
          isOpen: true,
          createdAt: body.createdAt
        });
        await this.ctx.storage.put("responses", {});
        return json({ ok: true }, 201);
      });
    }

    const meta = await this.getMeta();
    if (!meta) return error("Cette activité n'existe pas.", 404);

    if (path === "/" && request.method === "GET") {
      const result = await this.publicSummary();
      delete result.adminKey;
      return json(result);
    }

    if (path === "/admin" && request.method === "GET") {
      if (!this.isAdmin(request, meta)) return error("Clé enseignant incorrecte.", 403);
      return json(await this.publicSummary());
    }

    if (path === "/answer" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return error("La réponse est invalide."); }
      if (!meta.isOpen) return error("Les réponses sont fermées pour le moment.", 403);
      if (typeof body.participantId !== "string" || body.participantId.length < 1 || body.participantId.length > 100) {
        return error("Identifiant de participation invalide.");
      }
      if (!Array.isArray(body.words)) return error("Entre tes mots avant d'envoyer la réponse.");
      const words = [];
      const seen = new Set();
      for (const candidate of body.words) {
        if (typeof candidate !== "string") return error("Un des mots n'est pas valide.");
        const word = candidate.normalize("NFC").trim();
        if (!word || word.length > 40 || !WORD_PATTERN.test(word)) return error("Chaque mot doit être un mot simple, sans espace ni ponctuation isolée.");
        const key = normalizeKey(word);
        if (!seen.has(key)) {
          seen.add(key);
          words.push(word);
        }
      }
      if (words.length < 1) return error("Ajoute au moins un mot.");
      if (words.length > meta.maxWords) return error("Tu peux envoyer " + meta.maxWords + " mots maximum.");
      return this.runExclusive(async () => {
        const currentMeta = await this.getMeta();
        if (!currentMeta?.isOpen) return error("Les réponses viennent d'être fermées.", 403);
        const responses = await this.getResponses();
        responses[body.participantId] = { words, updatedAt: new Date().toISOString() };
        await this.ctx.storage.put("responses", responses);
        return json(await this.publicSummary(), 200);
      });
    }

    if (path === "/toggle" && request.method === "POST") {
      if (!this.isAdmin(request, meta)) return error("Clé enseignant incorrecte.", 403);
      return this.runExclusive(async () => {
        const latest = await this.getMeta();
        latest.isOpen = !latest.isOpen;
        await this.ctx.storage.put("meta", latest);
        return json(await this.publicSummary());
      });
    }

    if (path === "/reset" && request.method === "POST") {
      if (!this.isAdmin(request, meta)) return error("Clé enseignant incorrecte.", 403);
      return this.runExclusive(async () => {
        await this.ctx.storage.put("responses", {});
        return json(await this.publicSummary());
      });
    }
    return error("Cette route n'existe pas.", 404);
  }

  isAdmin(request, meta) {
    const authorization = request.headers.get("Authorization") || "";
    const suppliedKey = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    return suppliedKey.length === meta.adminKey.length && suppliedKey === meta.adminKey;
  }
}
