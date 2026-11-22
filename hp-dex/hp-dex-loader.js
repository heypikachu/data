/* dexH!P | CARREGADOR UNICO V1
 * Bootstrap estável, independente das versões do motor.
 * NÃO atualizar esta URL nas postagens para cada release.
 */
(function (win, doc) {
  'use strict';

  // Evita execução duplicada caso o Blogger repita a tag <script>.
  if (win.__hpDexLoaderV1) return;
  win.__hpDexLoaderV1 = true;

  const CONFIG = Object.freeze({
    manifest: 'https://raw.githubusercontent.com/heypikachu/data/main/hp-dex/runtime-manifest.json',
    cdn: 'https://cdn.jsdelivr.net/gh/heypikachu/data@',
    // Release conhecida e imutável, usada quando o manifesto não puder ser lido.
    fallbackCommit: 'fb50db1382d9575c2b6cf70a1e0163d1c72cc6eb',
    manifestMaxWaitMs: 8000,
    assetMaxWaitMs: 15000
  });
  const RUNTIME_FILES = Object.freeze({
    css: '/hp-dex/hp-dex.css',
    js: '/hp-dex/hp-dex.js'
  });
  const VALID_SHA = /^[0-9a-f]{40}$/;

  function onReady(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function event(name, detail) {
    try { win.dispatchEvent(new CustomEvent('hp-dex:' + name, { detail: detail })); }
    catch (_) { /* Eventos de diagnóstico são opcionais. */ }
  }

  function markError(app, message) {
    if (app) {
      app.dataset.hpDexLoadError = 'true';
      if (!app.querySelector('#pokedexpage')) {
        const error = doc.createElement('p');
        error.setAttribute('role', 'alert');
        error.className = 'hp-dex-loader-error';
        error.textContent = 'A ficha da Pokédex não pôde carregar. Atualize a página para tentar novamente.';
        app.appendChild(error);
      }
    }
    console.error('[dexH!P]', message);
    event('error', { reason: message });
  }

  async function getManifest() {
    const controller = new AbortController();
    const timer = win.setTimeout(() => controller.abort(), CONFIG.manifestMaxWaitMs);
    try {
      // O GitHub Raw aceita CORS; o parâmetro evita o cache de 12h de @main.
      const versionBucket = Math.floor(Date.now() / 300000);
      const response = await win.fetch(CONFIG.manifest + '?v=' + versionBucket, {
        mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      if (!result || result.schema !== 1 || !VALID_SHA.test(result.commit) ||
          (result.previous !== null && result.previous !== undefined && !VALID_SHA.test(result.previous))) {
        throw new Error('Manifesto inválido');
      }
      return { commit: result.commit, previous: result.previous || null, release: String(result.release || 'unknown') };
    } finally {
      win.clearTimeout(timer);
    }
  }

  function addAsset(kind, commit) {
    return new Promise((resolve, reject) => {
      const isCSS = kind === 'css';
      const el = doc.createElement(isCSS ? 'link' : 'script');
      const url = CONFIG.cdn + commit + RUNTIME_FILES[kind];
      let done = false;
      let timer;
      function finish(error) {
        if (done) return;
        done = true;
        win.clearTimeout(timer);
        el.onload = null;
        el.onerror = null;
        if (error) {
          el.remove();
          reject(error);
        } else resolve(el);
      }
      if (isCSS) {
        el.rel = 'stylesheet';
        el.href = url;
      } else {
        el.async = true;
        el.src = url;
      }
      el.setAttribute('data-hp-dex-runtime-asset', kind);
      el.setAttribute('data-hp-dex-runtime-commit', commit);
      el.onload = () => finish(null);
      el.onerror = () => finish(new Error('Erro no carregamento de ' + kind));
      timer = win.setTimeout(() => finish(new Error('Tempo excedido para ' + kind)), CONFIG.assetMaxWaitMs);
      (doc.head || doc.documentElement).appendChild(el);
    });
  }

  async function loadVersion(commit, app) {
    if (!VALID_SHA.test(commit)) throw new Error('SHA de release inválido');
    const sheet = await addAsset('css', commit);
    try {
      // JS e CSS vêm SEMPRE do mesmo commit.
      await addAsset('js', commit);
      app.dataset.hpDexRuntimeCommit = commit;
      win.__hpDexActiveRelease = commit;
      event('release', { commit: commit });
    } catch (error) {
      sheet.remove();
      throw error;
    }
  }

  onReady(async () => {
    const apps = doc.querySelectorAll('#hp-dex-app[data-pokemon]');
    if (apps.length !== 1) {
      console.error('[dexH!P] É necessário exatamente um #hp-dex-app[data-pokemon] por postagem. Encontrados:', apps.length);
      return;
    }
    const app = apps[0];

    // Se a postagem ainda usa o motor antigo, avisar em vez de executar duas instâncias.
    const oldScripts = Array.from(doc.scripts || []).filter(s =>
      s.src && /\/hp-dex\/hp-dex\.js(?:\?|$)/.test(s.src) &&
      !s.hasAttribute('data-hp-dex-runtime-asset')
    );
    if (oldScripts.length || app.dataset.hpDexBooted === 'true') {
      console.error('[dexH!P] Carregador novo e motor antigo coexistem nesta postagem. Remova o <script> antigo e mantenha apenas o carregador.');
      return;
    }

    let manifest;
    try {
      manifest = await getManifest();
    } catch (error) {
      console.warn('[dexH!P] Manifesto indisponível. Usando release reserva:', error);
      manifest = { commit: CONFIG.fallbackCommit, previous: null, release: 'fallback' };
    }

    try {
      await loadVersion(manifest.commit, app);
    } catch (error) {
      console.warn('[dexH!P] Release atual indisponível:', manifest.commit, error);
      const alternative = manifest.previous && manifest.previous !== manifest.commit
        ? manifest.previous : CONFIG.fallbackCommit;
      if (alternative === manifest.commit) {
        markError(app, 'Release não pôde carregar e não há alternativa.');
        return;
      }
      try {
        await loadVersion(alternative, app);
        console.warn('[dexH!P] Recuperação automática executada com release:', alternative);
      } catch (backupError) {
        markError(app, 'Release principal e reserva falharam: ' + backupError.message);
      }
    }
  });
})(window, document);
