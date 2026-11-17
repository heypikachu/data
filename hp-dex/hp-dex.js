/* H!P DEX | MOTOR MESTRE 1.0 | extraído do Charizard aprovado */

async function hpDexRender() {
  const app = document.getElementById('hp-dex-app');
  if (!app) return;
  
  const pokemonId = app.getAttribute('data-pokemon'); 
  const JSON_URL = `https://cdn.jsdelivr.net/gh/heypikachu/data@main/pokemon/${encodeURIComponent(pokemonId)}.json`;

  // ============================================================
  //  CONFIGURAÇÃO DE SPRITES
  //  - null  => usa PokéAPI / campos do JSON (hoje)
  //  - URL   => usa seu GitHub (futuro)
  // ============================================================
  const SPRITE_BASE_URL = null; // opcional: URL de sprites próprios no futuro; enquanto null, HOME permanece como padrão
  
  let POKEDEX_DATA = null; 
  let CURRENT_GAME = null; 
  let CURRENT_METHOD = 'level'; 
  let IS_SHINY = false; 
  let CURRENT_SEX = 'male';
  let SPRITE_ATUAL_FORMA = null;
  let MOVE_QUERY = ''; 

  const GAME_LIST = { "I": ["rb", "yellow", "red-jp", "green-jp", "blue-jp"], "II": ["gold", "silver", "crystal"], "III": ["ruby", "sapphire", "emerald", "firered", "leafgreen"], "IV": ["diamond", "pearl", "platinum", "heartgold", "soulsilver"], "V": ["black", "white", "black2", "white2"], "VI": ["x", "y", "omega-ruby", "alpha-sapphire"], "VII": ["sun", "moon", "ultra-sun", "ultra-moon", "lets-go-pikachu", "lets-go-eevee"], "VIII": ["sword", "shield", "brilliant-diamond", "shining-pearl", "legends-arceus"], "IX": ["scarlet", "violet", "za"] };
  
  // Seleção persistente por espécie: visita inicial = última edição cadastrada.
  // Cada espécie tem seu próprio jogo salvo; nenhum outro Pokémon é afetado.
  const GAME_STORAGE_KEY = `hp-dex-ultimo-jogo:${pokemonId}`;
  function jogoInicialDisponivel(records) {
    try {
      const salvo = window.localStorage.getItem(GAME_STORAGE_KEY);
      if (salvo && Object.prototype.hasOwnProperty.call(records, salvo)) return salvo;
    } catch (e) { /* armazenamento pode estar indisponível no navegador */ }
    // GAME_LIST segue ordem cronológica; a última edição com registro vence.
    const ordem = Object.values(GAME_LIST).flat();
    for (let i = ordem.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(records, ordem[i])) return ordem[i];
    }
    return Object.keys(records)[0] || null;
  }
  function salvarJogoSelecionado(gameKey) {
    try { window.localStorage.setItem(GAME_STORAGE_KEY, gameKey); }
    catch (e) { /* mantém a navegação funcional quando storage for bloqueado */ }
  }

  const GAME_NAMES = { "rb": "Pokémon Red / Blue", "yellow": "Pokémon Yellow", "red-jp": "Pokémon Red (JP)", "green-jp": "Pokémon Green (JP)", "blue-jp": "Pokémon Blue (JP)", "gold": "Pokémon Gold", "silver": "Pokémon Silver", "crystal": "Pokémon Crystal", "ruby": "Pokémon Ruby", "sapphire": "Pokémon Sapphire", "emerald": "Pokémon Emerald", "firered": "Pokémon FireRed", "leafgreen": "Pokémon LeafGreen", "diamond": "Pokémon Diamond", "pearl": "Pokémon Pearl", "platinum": "Pokémon Platinum", "heartgold": "Pokémon HeartGold", "soulsilver": "Pokémon SoulSilver", "black": "Pokémon Black", "white": "Pokémon White", "black2": "Pokémon Black 2", "white2": "Pokémon White 2", "x": "Pokémon X", "y": "Pokémon Y", "omega-ruby": "Pokémon Omega Ruby", "alpha-sapphire": "Pokémon Alpha Sapphire", "sun": "Pokémon Sun", "moon": "Pokémon Moon", "ultra-sun": "Pokémon Ultra Sun", "ultra-moon": "Pokémon Ultra Moon", "lets-go-pikachu": "Pokémon Let's Go, Pikachu!", "lets-go-eevee": "Pokémon Let's Go, Eevee!", "sword": "Pokémon Sword", "shield": "Pokémon Shield", "brilliant-diamond": "Pokémon Brilliant Diamond", "shining-pearl": "Pokémon Shining Pearl", "legends-arceus": "Pokémon Legends: Arceus", "scarlet": "Pokémon Scarlet", "violet": "Pokémon Violet", "za": "Pokémon Legends: Z-A" };

  const TYPE_ICONS = { 'Normal': 'normal', 'Fogo': 'fire', 'Água': 'water', 'Grama': 'grass', 'Elétrico': 'electric', 'Gelo': 'ice', 'Lutador': 'fighting', 'Venenoso': 'poison', 'Terrestre': 'ground', 'Voador': 'flying', 'Psíquico': 'psychic', 'Inseto': 'bug', 'Pedra': 'rock', 'Fantasma': 'ghost', 'Dragão': 'dragon', 'Sombrio': 'dark', 'Aço': 'steel', 'Fada': 'fairy' };
  const STAT_COLORS = ['#f35f69','#e7a12c','#50a78b','#9684ed','#63a4d8','#e37db6'];
  const TYPE_COLORS = { 'Pedra': 'rock', 'Água': 'water', 'Elétrico': 'electric', 'Terrestre': 'ground', 'Grama': 'grass', 'Inseto': 'bug', 'Fogo': 'fire', 'Lutador': 'fighting', 'Aço': 'steel', 'Fada': 'fairy', 'Voador': 'flying', 'Dragão': 'dragon', 'Normal': 'normal', 'Venenoso': 'poison', 'Psíquico': 'psychic', 'Fantasma': 'ghost', 'Sombrio': 'dark', 'Gelo': 'ice' };
  const CAT_MAP = { 'fisico': { slug: 'fisico', label: 'Físico', css: 'physical' }, 'especial': { slug: 'especial', label: 'Especial', css: 'special' }, 'status': { slug: 'status', label: 'Status', css: 'status' } };

  const svgEspecie = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.3 2.8c1.6 4.6 5.6 5.3 5.6 11a6.1 6.1 0 0 1-12.2 0c0-3.3 1.8-5.9 4.4-8.2.1 3.2 1 3.8 2.2 4.5.8-2.3.7-4.8 0-7.3Z" fill="#ff8846" stroke="#ffad58" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.2 13.3c1.1 1.5 1.8 2.7 1.8 4a2 2 0 0 1-4 0c0-1.5 1-2.8 2.2-4Z" fill="#fff0bb"/></svg>';
  const svgOrigem = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#d9eaf9" stroke="#82b9ed" stroke-width="1.7"/><path d="M3.7 12h16.6M12 3.2c-3 3.1-3.6 14.4 0 17.6M12 3.2c3 3.1 3.6 14.4 0 17.6" fill="none" stroke="#467db4" stroke-width="2" stroke-linecap="round"/></svg>';
  const svgPokedex = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4.4" y="2.8" width="15.2" height="18.4" rx="2.7" fill="#78afff" stroke="#bedbff" stroke-width="1.7"/><path d="M8.2 3.8v16.3" stroke="#285eae" stroke-width="2.1"/><circle cx="13.5" cy="9.4" r="2.2" fill="#fff"/><path d="M10.4 15h6.4M10.4 17.8h5" stroke="#f7fbff" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const svgJapones = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="#e7d5ff" stroke="#ad87df" stroke-width="1.7"/><text x="12" y="16.2" fill="#5d319d" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="13.3">あ</text></svg>';
  const svgCaptura = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke="#9ba5b1" stroke-width="1.7"/><path d="M3.2 12A8.8 8.8 0 0 1 20.8 12Z" fill="#fa6b73"/><path d="M3.2 12h17.6" stroke="#485363" stroke-width="2.1"/><circle cx="12" cy="12" r="3.4" fill="#f8fafc" stroke="#485363" stroke-width="2"/><circle cx="12" cy="12" r="1.25" fill="#fff"/></svg>';
  const svgOvos = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3.2c-3.3 0-7 5.6-7 10.2a7 7 0 0 0 14 0c0-4.6-3.7-10.2-7-10.2Z" fill="#ffd293" stroke="#ffb765" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.4 13.3c0 2.6 1.4 4 3.2 4.3" fill="none" stroke="#fff4dd" stroke-width="2.1" stroke-linecap="round"/></svg>';
  const svgExp = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.5 14.7 9.3 21.5 12l-6.8 2.7-2.7 6.8-2.7-6.8L2.5 12l6.8-2.7Z" fill="#b5a0ff" stroke="#e5dcff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const svgCrescimento = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 3.5h12M6 20.5h12M7.3 4.8c0 4.8 4.7 5 4.7 7.2s-4.7 2.4-4.7 7.2m9.4-14.4c0 4.8-4.7 5-4.7 7.2s4.7 2.4 4.7 7.2" fill="none" stroke="#f6af52" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="m9 8 3 3 3-3M9 17l3-3 3 3" fill="#f6af52"/></svg>';
  const svgCiclos = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.1 6.1c-2.4 0-4.7 4.1-4.7 7.5a4.7 4.7 0 0 0 9.4 0c0-3.4-2.3-7.5-4.7-7.5Z" fill="#ffe0a4" stroke="#ffb764" stroke-width="1.6"/><path d="M4.5 8.8a8 8 0 0 1 13-3.6M19.6 15.4a8 8 0 0 1-13 3.5" fill="none" stroke="#8fd2b3" stroke-width="2.3" stroke-linecap="round"/><path d="m15.9 3.9 2.7 1.5-.3-3M8 20.4 5.3 19l.4 2.8" fill="none" stroke="#8fd2b3" stroke-width="2" stroke-linejoin="round"/></svg>';
  const svgGenero = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="color:#60adff;"><circle cx="9.3" cy="14.6" r="5.3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13.3 10.7 20.5 3.5M15.4 3.5h5.1v5.1" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  const svgAltura = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="stroke:#63a4d8;fill:none;stroke-width:2;"><path d="M4 20v-2M8 20v-6M12 20V9M16 20V4M20 20v-9"/></svg>';
  const svgAmizade = '<svg class="hp-bio-fact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="stroke:#f05678;fill:#f05678;"><path d="M12 21 3.9 12.9A5.35 5.35 0 0 1 11.5 5.3l.5.6.5-.6a5.35 5.35 0 0 1 7.6 7.6Z"/></svg>';
  const f = (iconSvg, label) => `<small><span class="hp-bio-fact-heading">${iconSvg}<span>${label}</span></span></small>`;

  // Registo central: um link só fica ativo depois de constar no registry.json.
  let DEX_PUBLISHED = {};
  let DEX_NAMES = {3:'Venusaur',4:'Charmander',5:'Charmeleon',6:'Charizard',7:'Squirtle'};
  try {
    const registryResponse = await fetch('https://cdn.jsdelivr.net/gh/heypikachu/data@main/hp-dex/registry.json');
    if (registryResponse.ok) {
      const registry = await registryResponse.json();
      for (const [num, item] of Object.entries(registry.pokemon || {})) {
        if (item && item.name) DEX_NAMES[Number(num)] = item.name;
        if (item && item.published === true && /^https:\/\//.test(item.url || '')) DEX_PUBLISHED[Number(num)] = item.url;
      }
    }
  } catch(e) { console.warn('H!P DEX: registro de fichas não disponível; links não publicados ficam desativados.'); }
  const DEX_HOME_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';


  try {
    const response = await fetch(JSON_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${JSON_URL}`);
    POKEDEX_DATA = await response.json();
    CURRENT_GAME = jogoInicialDisponivel(POKEDEX_DATA.records);
    renderizarNavegacaoDex(); renderizarPagina(); configurarModalJogos(); configurarBotoesExtras(); preencherRespostasRapidas();
  } catch (error) {
    console.error("❌ Erro ao inicializar a H!P DEX:", error);
    const heroName = document.getElementById('hero-name');
    const heroSpecies = document.getElementById('hero-species');
    if (heroName) heroName.textContent = 'Não foi possível carregar os dados deste Pokémon';
    if (heroSpecies) heroSpecies.textContent = `Verifique se pokemon/${pokemonId}.json está acessível no GitHub e tente recarregar a página.`;
  }

  // ============================================================
  //  GERA LISTA ORDENADA DE CANDIDATOS A SPRITE
  // ============================================================
  function gerarCandidatosSprite(rec, { shiny = false, sex = 'male', formSprite = null } = {}) {
    const homeDefault = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${parseInt(POKEDEX_DATA.number,10)}.png`;
    const base = formSprite || rec.sprite || homeDefault;

    const cands = [];
    const push = (u) => { if (u && !cands.includes(u)) cands.push(u); };

    if (formSprite) {
      // Mega/Gigantamax retain the chosen form when shiny is toggled.
      // HOME sprites use /home/shiny/{form-id}.png for alternate forms.
      const home = formSprite.match(/^(.*\/other\/home\/)(?:shiny\/)?([^/]+\.png)$/);
      if (shiny && home) push(`${home[1]}shiny/${home[2]}`);
      if (shiny && formSprite === rec.sprite && rec.sprite_shiny) push(rec.sprite_shiny);
      if (sex === 'female' && formSprite === rec.sprite && rec.sprite_female) push(rec.sprite_female);
      push(formSprite);
      return cands;
    }
    if (shiny && sex === 'female' && rec.sprite_female_shiny) push(rec.sprite_female_shiny);
    if (shiny && rec.sprite_shiny) push(rec.sprite_shiny);
    if (sex === 'female' && rec.sprite_female) push(rec.sprite_female);

    if (SPRITE_BASE_URL) {
      const id = POKEDEX_DATA.number;
      const num = parseInt(id, 10);
      const gameKey = CURRENT_GAME;
      for (const nome of [`${num}`, id, pokemonId]) {
        if (shiny && sex === 'female') push(`${SPRITE_BASE_URL}/${gameKey}/shiny/female/${nome}.png`);
        if (shiny)                     push(`${SPRITE_BASE_URL}/${gameKey}/shiny/${nome}.png`);
        if (sex === 'female')          push(`${SPRITE_BASE_URL}/${gameKey}/female/${nome}.png`);
        push(`${SPRITE_BASE_URL}/${gameKey}/${nome}.png`);
      }
    }

    const m = base.match(/^(.*\/other\/home\/)(?:shiny\/)?(?:female\/)?([^/]+\.png)$/);
    if (m) {
      const prefixo = m[1];
      const arquivo = m[2];
      if (shiny && sex === 'female') push(`${prefixo}shiny/female/${arquivo}`);
      if (shiny)                     push(`${prefixo}shiny/${arquivo}`);
      if (sex === 'female')          push(`${prefixo}female/${arquivo}`);
      push(`${prefixo}${arquivo}`);
    }

    const dir = base.replace(/\/[^/]+$/, '');
    const file = base.replace(/^.*\//, '');
    const nomeSemExt = file.replace(/\.png$/i, '');
    if (shiny && sex === 'female') {
      push(`${dir}/shiny/female/${file}`);
      push(`${dir}/female/shiny/${file}`);
      push(`${dir}/${nomeSemExt}-shiny-female.png`);
    }
    if (shiny) {
      push(`${dir}/shiny/${file}`);
      push(`${dir}/${nomeSemExt}-shiny.png`);
    }
    if (sex === 'female') {
      push(`${dir}/female/${file}`);
      push(`${dir}/${nomeSemExt}-female.png`);
    }

    push(base);
    return cands;
  }

  // ============================================================
  //  ATUALIZA O SPRITE DO HERÓI
  // ============================================================
  function atualizarImagem(rec) {
    const img = document.getElementById('charart');
    const pending = document.getElementById('formArtworkPending');
    if (!img || !pending) return;

    const candidatos = gerarCandidatosSprite(rec, {
      shiny: IS_SHINY,
      sex: CURRENT_SEX,
      formSprite: SPRITE_ATUAL_FORMA
    });

    const tentar = (lista) => {
      if (!lista.length) {
        img.src = rec.sprite;
        img.style.display = 'block';
        pending.style.display = 'none';
        if (IS_SHINY) {
          IS_SHINY = false;
          const btn = document.getElementById('shinybtn');
          if (btn) { btn.innerHTML = '✧ Brilhante'; btn.setAttribute('aria-pressed', 'false'); }
        }
        return;
      }
      const [url, ...resto] = lista;
      img.onload = () => {
        img.style.display = 'block';
        pending.style.display = 'none';
      };
      img.onerror = () => tentar(resto);
      img.src = url;
    };

    tentar(candidatos);
  }

  // ============================================================
  //  LINHA EVOLUTIVA — ícones
  // ============================================================
  function candidatosSpriteEvolucao(numero, nome, { shiny = false, sex = 'male', spriteBase = null } = {}) {
    const id = String(numero).padStart(4, '0');
    const num = parseInt(id, 10);
    const cands = [];
    const push = (u) => { if (u && !cands.includes(u)) cands.push(u); };

    if (SPRITE_BASE_URL) {
      const gameKey = CURRENT_GAME;
      for (const n of [`${num}`, id, nome]) {
        if (shiny && sex === 'female') push(`${SPRITE_BASE_URL}/${gameKey}/shiny/female/${n}.png`);
        if (shiny)                     push(`${SPRITE_BASE_URL}/${gameKey}/shiny/${n}.png`);
        if (sex === 'female')          push(`${SPRITE_BASE_URL}/${gameKey}/female/${n}.png`);
        push(`${SPRITE_BASE_URL}/${gameKey}/${n}.png`);
      }
    }

    const prefixo = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
    const arquivo = `${num}.png`;
    if (shiny && sex === 'female') push(`${prefixo}shiny/female/${arquivo}`);
    if (shiny)                     push(`${prefixo}shiny/${arquivo}`);
    if (sex === 'female')          push(`${prefixo}female/${arquivo}`);
    push(`${prefixo}${arquivo}`);

    if (spriteBase) push(spriteBase);
    return cands;
  }

  function aplicarSpriteEmImg(img, candidatos) {
    if (!img || !candidatos || !candidatos.length) return;
    const tentar = (lista) => {
      if (!lista.length) { img.style.visibility = 'hidden'; return; }
      const [url, ...resto] = lista;
      img.onload = () => { img.style.visibility = 'visible'; };
      img.onerror = () => tentar(resto);
      img.src = url;
    };
    tentar(candidatos);
  }


  function renderizarNavegacaoDex() {
    const holder = document.getElementById('hpDexNeighbors');
    if (!holder || !POKEDEX_DATA) return;
    const numero = Number(POKEDEX_DATA.number);
    const html = (id, lado) => {
      const nome = DEX_NAMES[id] || ('Pokémon #' + String(id).padStart(4,'0'));
      const url = DEX_PUBLISHED[id];
      const previsto = url ? 'Abrir ficha' : 'Em breve';
      const texto = `<span class="hp-dex-neighbor-copy"><small>${lado === 'prev' ? 'Pokémon anterior' : 'Próximo Pokémon'} · #${String(id).padStart(4,'0')}</small><strong>${nome}</strong><em>${previsto}</em></span>`;
      const sprite = `<img src="${DEX_HOME_SPRITES}${id}.png" alt="" loading="lazy" decoding="async">`;
      const seta = `<span class="hp-dex-neighbor-arrow" aria-hidden="true">${lado === 'prev' ? '‹' : '›'}</span>`;
      const conteudo = lado === 'prev' ? seta + sprite + texto : texto + sprite + seta;
      return url
        ? `<a class="hp-dex-neighbor ${lado}" href="${url}" title="Abrir Pokédex de ${nome}" aria-label="${lado === 'prev' ? 'Anterior' : 'Próximo'}: ${nome}">${conteudo}</a>`
        : `<div class="hp-dex-neighbor ${lado} is-unpublished" aria-label="${nome}: ficha em breve">${conteudo}</div>`;
    };
    holder.innerHTML = (numero > 1 ? html(numero-1,'prev') : '<div></div>') + html(numero+1,'next');
  }

  function renderizarLinhaEvolutiva(rec) {
    const host = document.getElementById('evoLine');
    if (!host) return;

    const numAtual = parseInt(POKEDEX_DATA.number, 10);
    const kantoStarters = [4,5,6].includes(numAtual) ? [
      { nome: 'Charmander', numero: 4, metodo: null, nivel: null },
      { nome: 'Charmeleon', numero: 5, metodo: 'Lv.16', nivel: 16 },
      { nome: 'Charizard', numero: 6, metodo: 'Lv.36', nivel: 36 }
    ] : null;
    const linha = Array.isArray(POKEDEX_DATA.evolution_line) && POKEDEX_DATA.evolution_line.length
      ? POKEDEX_DATA.evolution_line.map(x => ({nome:x.name || x.nome, numero:Number(x.number || x.numero), metodo:x.method || x.metodo || null, nivel:x.level || x.nivel || null}))
      : (kantoStarters || [{nome:POKEDEX_DATA.name, numero:numAtual, metodo:null, nivel:null}]);

    host.innerHTML = linha.map((p, i) => {
      const ehAtual = p.numero === parseInt(POKEDEX_DATA.number, 10);
      const urlEvolucao = DEX_PUBLISHED[p.numero];
      const tagEvolucao = urlEvolucao ? 'a' : 'div';
      const atributosLink = urlEvolucao
        ? ` href="${urlEvolucao}" title="Abrir Pokédex de ${p.nome}" aria-label="Ver ficha de ${p.nome}"`
        : ` title="Ficha de ${p.nome} em breve"`;
      const blocoImg = `
        <${tagEvolucao} class="evonode${ehAtual ? ' emphasis' : ''}${urlEvolucao ? '' : ' evo-unpublished'}" data-num="${p.numero}"${atributosLink}>
          <div class="evo-img-wrap">
            <img class="evo-img" alt="${p.nome}" data-num="${p.numero}" data-nome="${p.nome}" style="visibility:hidden;">
          </div>
          <b>${p.nome}</b>
          <small>#${String(p.numero).padStart(4, '0')}</small>
        </${tagEvolucao}>`;
      const proximo = linha[i + 1];
      const seta = proximo
        ? `<span class="arrow">→<small style="display:block;font-size:10px">${proximo.metodo || ''}</small></span>`
        : '';
      return blocoImg + seta;
    }).join('');

    host.querySelectorAll('.evo-img').forEach(img => {
      const numero = parseInt(img.getAttribute('data-num'), 10);
      const nome   = img.getAttribute('data-nome');
      aplicarSpriteEmImg(img, candidatosSpriteEvolucao(numero, nome, {
        shiny: IS_SHINY,
        sex: CURRENT_SEX
      }));
    });
  }

  // A forma selecionada modifica também a ficha de batalha, não só o sprite.
  function formaAtual(rec) {
    return (rec.forms || []).find(f => f.sprite && f.sprite === SPRITE_ATUAL_FORMA) || null;
  }

  function renderizarPagina() {
    const rec = POKEDEX_DATA.records[CURRENT_GAME];
    if(!rec) return;
    const selectedForm = formaAtual(rec);

    document.getElementById('crumb').innerHTML = `Pokédex Nacional <span>&#8250;</span> ${POKEDEX_DATA.name}`;
    document.getElementById('hero-number').textContent = `#${POKEDEX_DATA.number}`;
    document.getElementById('herogen').textContent = `GERAÇÃO ${rec.gen}`;
    document.getElementById('heroEra').textContent = `Geração ${rec.gen}`;
    document.getElementById('heroSelectedGame').textContent = rec.game_name || GAME_NAMES[CURRENT_GAME] || CURRENT_GAME;
    
    const nameParts = POKEDEX_DATA.name.match(/^(.+?)(.{3})$/);
    document.getElementById('hero-name').innerHTML = nameParts ? `${nameParts[1]}<span>${nameParts[2]}</span>` : POKEDEX_DATA.name;
    
    if(POKEDEX_DATA.japanese) document.getElementById('hero-japanese').innerHTML = `<span class="japan-icon">あ</span><span class="jp-name">${POKEDEX_DATA.japanese.kanji}</span><span class="jp-roman">${POKEDEX_DATA.japanese.romaji}</span>`;
    document.getElementById('hero-species').textContent = `O ${POKEDEX_DATA.species_name}. Explore suas mudanças desde os primeiros jogos.`;
    document.getElementById('gamecurrent').textContent = rec.game_name || GAME_NAMES[CURRENT_GAME] || "Jogo Atual";
    document.getElementById('gamemeta').textContent = `Geração ${rec.gen} ${String.fromCharCode(183)} Dados por edição`;
    document.getElementById('gendercontrols').style.display = rec.gen === 'I' ? 'none' : ''; // Sem sexo na Geração I
    document.getElementById('coverage').textContent = rec.review_status === 'approved' ? 'REVISADO' : 'COBERTURA PARCIAL';
    document.getElementById('formBadge').textContent = Array.isArray(rec.forms) && rec.forms.length ? rec.forms.length : 1;
    
    document.getElementById('hero-status').innerHTML = `<span>🔥 ${POKEDEX_DATA.species_name}</span><span>📏 ${(selectedForm && selectedForm.height) || POKEDEX_DATA.height}</span><span>⚖ ${(selectedForm && selectedForm.weight) || POKEDEX_DATA.weight}</span>`;
    document.getElementById('contexttext').innerHTML = `<strong>Modo ${rec.game_name} ativado.</strong> ${selectedForm ? `Forma: ${selectedForm.name}. ` : ''}Dados específicos desta edição.`;
    document.getElementById('hero-types').innerHTML = ((selectedForm && selectedForm.types) || rec.types || POKEDEX_DATA.types).map(t => `<span class="type ${t.toLowerCase()}"><img class="hp-type-icon" src="https://cdn.jsdelivr.net/gh/heypikachu/champions@tipo/${TYPE_ICONS[t]||'normal'}.webp"> ${t.toUpperCase()}</span>`).join('');
    
    let statsHtml = ''; let maxStat = 0; let maxName = ''; let totalStats = 0;
    const exibidos = (selectedForm && selectedForm.stats) || rec.stats; // A forma escolhida substitui os atributos base.
    const nomesExibidos = rec.gen === 'I' ? ['HP','Ataque','Defesa','Especial','Velocidade'] : rec.stat_names;
    exibidos.forEach((n, i) => {
      statsHtml += `<div class="statrow"><label>${nomesExibidos[i]}</label><b>${n}</b><span class="bar" style="--stat-color:${STAT_COLORS[i]}"><span style="width:${(n/255)*100}%"></span></span></div>`;
      if(n > maxStat) { maxStat = n; maxName = nomesExibidos[i]; }
      totalStats += n;
    });
    document.getElementById('statslist').innerHTML = statsHtml;
    document.getElementById('statInsight').innerHTML = `<span>✦</span> Maior atributo base nesta versão: <strong>${maxName} (${maxStat})</strong>`;
    document.getElementById('stattotalLabel').textContent = rec.gen === 'I' ? 'Total dos 5 atributos da Gen I' : 'Total dos 6 atributos base';
    document.getElementById('stattotal').textContent = totalStats;
    
    document.getElementById('abilities').innerHTML = `<div class="hint">🧬 ${['I','II'].includes(rec.gen) ? 'Habilidades ainda não existiam nesta geração.' : ((selectedForm && selectedForm.ability) || rec.abilities || 'Habilidades não cadastradas.')}</div>`;
    
    document.getElementById('speciesfacts').innerHTML = `
      <div class="fact">${f(svgEspecie, 'Espécie')}<strong>${POKEDEX_DATA.species_name}</strong></div>
      <div class="fact">${f(svgOrigem, 'Origem')}<strong>Kanto · Geração I</strong></div>
      <div class="fact">${f(svgPokedex, 'Pokédex desta edição')}<strong>${rec.pokedex_number || 'Não cadastrada nesta edição'}</strong></div>
      <div class="fact">${f(svgJapones, 'Nome japonês')}<strong><span lang="ja">${POKEDEX_DATA.japanese?.kanji || '---'}</span> · ${POKEDEX_DATA.japanese?.romaji || '---'}</strong></div>
      <div class="fact">${f(svgGenero, 'Proporção de gênero')}<strong>${rec.gen === 'I' ? 'Sexo não era uma mecânica nesta geração' : `${Number(POKEDEX_DATA.gender_ratio?.male ?? 87.5).toLocaleString('pt-BR')}% macho / ${Number(POKEDEX_DATA.gender_ratio?.female ?? 12.5).toLocaleString('pt-BR')}% fêmea`}</strong></div>
      <div class="fact">${f(svgAltura, 'Altura / ⚖ Peso')}<strong>${(selectedForm && selectedForm.height) || POKEDEX_DATA.height} / ${(selectedForm && selectedForm.weight) || POKEDEX_DATA.weight}</strong></div>
      <div class="fact">${f(svgCaptura, 'Taxa básica de captura')}<strong>${rec.catch_rate ?? POKEDEX_DATA.capture_rate ?? POKEDEX_DATA.catch_rate ?? 'Não informado'}</strong></div>
      <div class="fact">${f(svgExp, 'EXP base ao derrotar')}<strong>${(selectedForm && selectedForm.base_exp) ?? rec.base_exp ?? POKEDEX_DATA.base_exp ?? 'Não informado'}</strong></div>
      <div class="fact">${f(svgAmizade, 'Amizade base')}<strong>${rec.gen === 'I' ? 'Não existia nesta geração' : (rec.base_friendship ?? POKEDEX_DATA.base_friendship ?? 'Não informado')}</strong></div>
      <div class="fact">${f(svgCrescimento, 'Crescimento')}<strong>${POKEDEX_DATA.growth_rate || 'Não informado'}</strong></div>
      <div class="fact">${f(svgOvos, 'Grupos de ovos')}<strong>${rec.gen === 'I' ? 'Não existiam nesta geração' : (POKEDEX_DATA.egg_groups?.join(' e ') || 'Não informado')}</strong></div>
      <div class="fact">${f(svgCiclos, 'Ciclos de ovo')}<strong>${rec.gen === 'I' ? 'Não existiam nesta geração' : (POKEDEX_DATA.egg_cycles ?? 'Não informado')}</strong></div>
    `;

    if(rec.breeding) {
      document.getElementById('breeding').innerHTML = `
        <div class="fact">${f(svgOvos, 'Reprodução')}<strong>${rec.breeding}</strong></div>
        <div class="fact">${f(svgGenero, 'Sexo')}<strong>${rec.gen === 'I' ? 'Não disponível nesta geração' : 'Sem diferença visual entre macho e fêmea'}</strong></div>
      `;
    }

    const sexNote = document.getElementById('sexVisualNote');
    for (const id of ['maleBtn', 'femaleBtn']) { const sexButton = document.getElementById(id); if (sexButton) sexButton.disabled = rec.gen === 'I'; }
    if(sexNote) {
      sexNote.innerHTML = rec.gen === 'I'
        ? '<div class="stateempty">A geração I não possui sistema de sexo ou reprodução. Não há proporção entre machos e fêmeas nesses jogos.</div>'
        : `
        <strong class="hp-bio-choice"><svg class="hp-bio-sex-icon hp-bio-male" viewBox="0 0 24 24"><circle cx="9.3" cy="14.6" r="5.3"/><path d="M13.3 10.7 20.5 3.5M15.4 3.5h5.1v5.1"/></svg><span>Visual masculino selecionado</span></strong>
        <div class="sex-ratio-key">
          <span><svg class="hp-bio-sex-icon hp-bio-male" viewBox="0 0 24 24"><circle cx="9.3" cy="14.6" r="5.3"/><path d="M13.3 10.7 20.5 3.5M15.4 3.5h5.1v5.1"/></svg> Macho <b>${Number(POKEDEX_DATA.gender_ratio?.male ?? 87.5).toLocaleString('pt-BR')}%</b></span>
          <span><svg class="hp-bio-sex-icon hp-bio-female" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.8"/><path d="M12 14.8V22M8 18.4h8"/></svg> Fêmea <b>${Number(POKEDEX_DATA.gender_ratio?.female ?? 12.5).toLocaleString('pt-BR')}%</b></span>
        </div>
        <div class="sex-ratio" role="img" aria-label="${Number(POKEDEX_DATA.gender_ratio?.male ?? 87.5).toLocaleString('pt-BR')}% macho e ${Number(POKEDEX_DATA.gender_ratio?.female ?? 12.5).toLocaleString('pt-BR')}% fêmea"><span class="male-ratio" style="width:${Number(POKEDEX_DATA.gender_ratio?.male ?? 87.5)}%"></span><span class="female-ratio" style="width:${Number(POKEDEX_DATA.gender_ratio?.female ?? 12.5)}%"></span></div>
        <span>${rec.gen === 'I' ? 'A geração I não possui sistema de sexo.' : `${POKEDEX_DATA.name} não apresenta diferenças visuais cadastradas entre macho e fêmea.`}</span>
      `;
    }

    document.getElementById('morphology').innerHTML = POKEDEX_DATA.morphology
      ? `<div class="morph-card"><div><small>FORMATO CORPORAL</small><strong>${POKEDEX_DATA.morphology}</strong></div></div>`
      : `<div class="stateempty">Informações morfológicas específicas não cadastradas.</div>`;

    atualizarImagem(rec);
    renderizarLinhaEvolutiva(rec);
    
    const defenseHost = document.getElementById('defenses');
    const activeDefenses = (selectedForm && selectedForm.defenses) || rec.defenses;
    if (Array.isArray(activeDefenses) && activeDefenses.length) {
      defenseHost.innerHTML = activeDefenses.map(d => { const tipo = d.type || d.t; const icone = TYPE_ICONS[tipo]; return `<div class="fact"><small class="hp-defense-type">${icone ? `<img class="hp-type-icon" src="https://cdn.jsdelivr.net/gh/heypikachu/champions@tipo/${icone}.webp" alt="" loading="lazy" decoding="async">` : ''}<span>${tipo}</span></small><strong>${d.multiplier || d.m} · ${d.note || d.c || ''}</strong></div>`; }).join('');
    } else if (JSON.stringify(rec.types || POKEDEX_DATA.types) === JSON.stringify(['Fogo'])) {
      const defs = [{t:'Pedra',m:'2×',c:'fraqueza'},{t:'Água',m:'2×',c:'fraqueza'},{t:'Terrestre',m:'2×',c:'fraqueza'},{t:'Grama',m:'½×',c:'resistência'},{t:'Fogo',m:'½×',c:'resistência'},{t:'Inseto',m:'½×',c:'resistência'},...(['I'].includes(rec.gen)?[]:[{t:'Gelo',m:'½×',c:'resistência'},{t:'Aço',m:'½×',c:'resistência'}]),...(['VI','VII','VIII','IX'].includes(rec.gen)?[{t:'Fada',m:'½×',c:'resistência'}]:[])];
      defenseHost.innerHTML = defs.map(d => `<div class="fact"><small class="hp-defense-type"><img class="hp-type-icon" src="https://cdn.jsdelivr.net/gh/heypikachu/champions@tipo/${TYPE_COLORS[d.t]}.webp" alt=""><span>${d.t}</span></small><strong>${d.m} · ${d.c}</strong></div>`).join('');
    } else {
      defenseHost.innerHTML = `<div class="stateempty">Efetividades por geração ainda não cadastradas no JSON desta espécie.</div>`;
    }

    const pokedexEntry = document.getElementById('dexentry');
    if (pokedexEntry) pokedexEntry.textContent = rec.pokedex_entry || 'Descrição não cadastrada para esta edição.';

    const evGrid = document.getElementById('evDisplay');
    if (['I','II'].includes(rec.gen)) { evGrid.innerHTML = `<div class="stateempty">Nesta geração, os valores de treinamento utilizam um sistema histórico diferente dos EVs modernos.</div>`; } else if (rec.ev_yield && rec.ev_yield.some(v => v > 0)) {
      const evNames = ['HP','Ataque','Defesa','At. Especial','Def. Especial','Velocidade']; const evSyms = ['♥','✦','⬟','✸','◆','➤'];
      const maxEv = Math.max(...rec.ev_yield);
      evGrid.innerHTML = `<div class="ev-intro"><span class="ev-kicker">RECOMPENSA NESTA EDIÇÃO</span><strong>+${maxEv} EVs <span>por ${POKEDEX_DATA.name} derrotado</span></strong></div>
      <div class="ev-grid">${rec.ev_yield.map((v, i) => `<div class="ev-cell ${v > 0 ? 'best' : ''}"><span class="ev-symbol">${evSyms[i]}</span><div><small>${evNames[i]}</small><b>+${v}</b></div></div>`).join('')}</div>
      <div class="ev-explain"><div><b>✦ Principal recompensa</b><span>+${maxEv} EVs em ${evNames[rec.ev_yield.indexOf(maxEv)]}.</span></div><div><b>EV não é atributo base</b><span>O atributo base é o valor na tabela. O EV é a recompensa ao derrotar.</span></div></div>`;
    } else { evGrid.innerHTML = `<div class="stateempty">Rendimento de EVs ainda não auditado.</div>`; }

    if (rec.encounters && rec.encounters.length > 0) {
      document.getElementById('location').innerHTML = rec.encounters.map(e => `<div class="rowicon"><div class="leftico">📍</div><div><strong>${e.pokemon || POKEDEX_DATA.name} · ${e.location}</strong><p><b>${e.method}</b> · ${e.details || ''}</p></div></div>`).join('');
    }

    if (!rec.encounters || !rec.encounters.length) document.getElementById('location').innerHTML = '<div class="stateempty">Sem localização confirmada nesta edição.</div>';
    configurarAbasMovimentos(); renderizarMovimentos();
  }

  function preencherRespostasRapidas() {
    const resHost = document.getElementById('directAnswers');
    if (!resHost) return;
    const rec = POKEDEX_DATA.records[CURRENT_GAME];
    
    let evoText = "";
    if (rec.evolves_from) evoText += `Evolui de ${rec.evolves_from}. `;
    if (rec.evolves_to) evoText += `Evolui para ${rec.evolves_to}.`;
    if (evoText.trim() === "") evoText = "Evolução final da linha.";

    resHost.innerHTML = `
      <div><small>COMO EVOLUIR</small><strong>${evoText}</strong></div>
      <div><small>ONDE OBTER</small><strong>${rec.obtaining || 'Obtenção não registrada nesta edição.'}</strong></div>
      <div><small>DIFERENÇA DESTA EDIÇÃO</small><strong>${CURRENT_GAME === 'za' ? 'Combate em tempo real; recarga em segundos' : 'Consulte os detalhes da edição'}</strong></div>
    `;
  }

  function configurarBotoesExtras() {
    const btnShiny = document.getElementById('shinybtn');
    if(btnShiny) {
      btnShiny.onclick = () => {
        IS_SHINY = !IS_SHINY;
        btnShiny.setAttribute('aria-pressed', IS_SHINY ? 'true' : 'false');
        btnShiny.innerHTML = IS_SHINY ? '✧ Brilhante Ativo' : '✧ Brilhante';
        atualizarImagem(POKEDEX_DATA.records[CURRENT_GAME]);
        renderizarLinhaEvolutiva(POKEDEX_DATA.records[CURRENT_GAME]);
      };
    }
    
    const openForms = () => { 
      const rec = POKEDEX_DATA.records[CURRENT_GAME];
      const forms = (Array.isArray(rec.forms) && rec.forms.length ? rec.forms : [{ name: POKEDEX_DATA.name + ' (forma padrão)', sprite: rec.sprite || `${DEX_HOME_SPRITES}6.png`, detail: 'Nenhuma outra forma cadastrada para este jogo.' }]);
      const lista = document.getElementById('formChoices');

      lista.innerHTML = forms.map((f, idx) => `
        <div class="form-card${SPRITE_ATUAL_FORMA === (f.sprite || rec.sprite) ? ' active' : ''}" data-idx="${idx}" data-sprite="${f.sprite || rec.sprite}">
          <div class="form-pic"><img src="${f.sprite || rec.sprite}" alt="${f.name}"></div>
          <div class="form-desc">
            <strong>${f.name}</strong>
            <small>${f.detail || 'Forma original'}</small>
          </div>
        </div>
      `).join('');

      lista.querySelectorAll('.form-card').forEach(card => {
        card.onclick = () => {
          const sprite = card.getAttribute('data-sprite');
          SPRITE_ATUAL_FORMA = (sprite === rec.sprite) ? null : sprite;
          renderizarPagina(); // Atualiza tipo, stats, habilidade, defesas e imagem.
          lista.querySelectorAll('.form-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        };
      });

      document.getElementById('formModal').classList.add('open'); 
    };
    if(document.getElementById('formsbtn')) document.getElementById('formsbtn').onclick = openForms; 
    if(document.getElementById('formsInline')) document.getElementById('formsInline').onclick = openForms;
    if(document.getElementById('closeForms')) document.getElementById('closeForms').onclick = () => document.getElementById('formModal').classList.remove('open');

    const btnMale = document.getElementById('maleBtn'); const btnFemale = document.getElementById('femaleBtn');
    if(btnMale && btnFemale) {
      btnMale.disabled = btnFemale.disabled = POKEDEX_DATA.records[CURRENT_GAME]?.gen === 'I';
      btnMale.onclick = () => { CURRENT_SEX = 'male'; btnMale.setAttribute('aria-pressed', 'true'); btnFemale.setAttribute('aria-pressed', 'false'); document.querySelector('#sexVisualNote .hp-bio-choice').innerHTML = `<svg class="hp-bio-sex-icon hp-bio-male" viewBox="0 0 24 24"><circle cx="9.3" cy="14.6" r="5.3"/><path d="M13.3 10.7 20.5 3.5M15.4 3.5h5.1v5.1"/></svg><span>Visual masculino selecionado</span>`; atualizarImagem(POKEDEX_DATA.records[CURRENT_GAME]); renderizarLinhaEvolutiva(POKEDEX_DATA.records[CURRENT_GAME]); };
      btnFemale.onclick = () => { CURRENT_SEX = 'female'; btnMale.setAttribute('aria-pressed', 'false'); btnFemale.setAttribute('aria-pressed', 'true'); document.querySelector('#sexVisualNote .hp-bio-choice').innerHTML = `<svg class="hp-bio-sex-icon hp-bio-female" viewBox="0 0 24 24" style="color:#ff78af;"><circle cx="12" cy="9" r="5.8"/><path d="M12 14.8V22M8 18.4h8"/></svg><span style="color:#ff78af;">Visual feminino selecionado</span>`; atualizarImagem(POKEDEX_DATA.records[CURRENT_GAME]); renderizarLinhaEvolutiva(POKEDEX_DATA.records[CURRENT_GAME]); };
    }
  }

  function configurarAbasMovimentos() {
    const tools = document.getElementById('movetools');
    if (!tools.hasAttribute('data-init')) {
      tools.setAttribute('data-init', 'true');
      tools.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => { CURRENT_METHOD = btn.dataset.method; tools.querySelectorAll('button').forEach(b => b.classList.remove('sel')); btn.classList.add('sel'); renderizarMovimentos(); };
      });
      for (const id of ['moveSearch','dexQuickSearch']) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
          MOVE_QUERY = el.value.trim();
          for (const other of ['moveSearch','dexQuickSearch']) { const input = document.getElementById(other); if (input && input !== el) input.value = el.value; }
          renderizarMovimentos();
        });
      }
    }
  }

  function renderizarMovimentos() {
    const rec = POKEDEX_DATA.records[CURRENT_GAME]; const allMoves = (rec.moves_by_method && rec.moves_by_method[CURRENT_METHOD]) || [];
    const moves = allMoves.filter(m => `${m.name||m.movement||''} ${m.type||''}`.toLocaleLowerCase('pt-BR').includes(MOVE_QUERY.toLocaleLowerCase('pt-BR')));
    const panel = document.getElementById('specieshint');
    if(panel) panel.innerHTML = `<div class="hp-review-meta"><div class="hp-review-chip"><span class="hp-review-kicker">STATUS DA EDIÇÃO</span><strong class="hp-review-status">${rec.review_status === 'approved' ? 'Revisado' : 'Revisão parcial'}</strong></div><div class="hp-review-chip"><span class="hp-review-kicker">ÚLTIMA REVISÃO</span><strong class="hp-review-date">${rec.last_review || 'Data não informada'}</strong></div></div><div class="hp-review-note"><div class="hp-review-label">O QUE VOCÊ ENCONTRA AQUI</div><p class="hp-review-description">${rec.learnset_notes || 'Movimentos listados para esta edição; auditoria factual em andamento.'}</p></div>`;
    document.getElementById('learnbadge').textContent = `${GAME_NAMES[CURRENT_GAME]||CURRENT_GAME} · ${moves.length} REGISTROS`;
    
    if (moves && moves.length > 0) {
      const rows = moves.map(m => {
        const methodLabel = m.machine || (CURRENT_METHOD === 'egg' ? 'Ovo' : CURRENT_METHOD === 'tutor' ? 'Tutor' : CURRENT_METHOD === 'evolution' ? 'Evolução' : CURRENT_METHOD === 'other' ? 'Especial' : CURRENT_METHOD === 'level' ? (m.level === 0 ? 'Evolução' : (m.level ?? '—')) : '—');
        const rawCat = (m.category || 'Status').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const catInfo = CAT_MAP[rawCat] || null;
        const tipoHTML = m.type === 'Variável' ? '<span class="movetype" title="Tipo determinado pelos valores individuais do Pokémon">Variável</span>' : `<span class="movetype hp-move-${TYPE_ICONS[m.type] || 'normal'}"><img class="hp-type-icon" src="https://cdn.jsdelivr.net/gh/heypikachu/champions@tipo/${TYPE_ICONS[m.type] || 'normal'}.webp" alt=""> ${m.type}</span>`;
        const categoriaHTML = catInfo ? `<span class="mcat hp-cat-${catInfo.css}"><img class="hp-category-icon" src="https://cdn.jsdelivr.net/gh/heypikachu/sprites@main/pokemon/${catInfo.slug}.webp" alt=""> ${catInfo.label}</span>` : '<span class="mcat" title="Depende do tipo do movimento nesta geração">Variável</span>';
        return `<tr><td><b>${methodLabel}</b></td><td><span class="movename"${m.note ? ` title="${m.note}"` : ''}>${m.name || m.movement}</span></td><td>${tipoHTML}</td><td>${categoriaHTML}</td><td>${m.power ?? '—'}</td><td>${CURRENT_GAME === 'za' ? (m.cooldown != null ? m.cooldown + ' s' : '—') : (m.accuracy ?? '—')}</td><td>${CURRENT_GAME === 'za' ? (m.plus_level != null ? 'PLUS Nv. ' + m.plus_level : 'PLUS: não confirmado') : (m.pp ?? '—')}</td></tr>`;
      }).join('');
      document.getElementById('learncontent').innerHTML = `<table class="movetable"><thead><tr><th>${CURRENT_METHOD === 'level' ? 'Nível' : 'Método'}</th><th>Movimento</th><th>Tipo</th><th>Categoria</th><th>Poder</th><th>${CURRENT_GAME === 'za' ? 'Recarga' : 'Prec.'}</th><th>${CURRENT_GAME === 'za' ? 'Golpe PLUS' : 'PP'}</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else { document.getElementById('learncontent').innerHTML = `<div class="stateempty">Nenhum movimento cadastrado nesta categoria.</div>`; }
  }

  function configurarModalJogos() {
    const btnPick = document.getElementById('pickgame'); const modal = document.getElementById('gamemodal'); const btnClose = document.getElementById('closegame'); const grid = document.getElementById('gamegrid');
    let html = '';
    for (const [gen, games] of Object.entries(GAME_LIST)) {
      html += `<div class="gengroup"><h3>GERAÇÃO ${gen}</h3>`;
      games.forEach(g => { const has = POKEDEX_DATA.records[g]; html += `<button data-game="${g}" class="${has ? '' : 'disabled'}"><span>${GAME_NAMES[g] || g}</span><span class="dot ${has ? (has.review_status === 'approved' ? 'ready' : 'partial') : 'beta'}"></span></button>`; });
      html += `</div>`;
    }
    grid.innerHTML = html;
    btnPick.onclick = () => modal.classList.add('open'); btnClose.onclick = () => modal.classList.remove('open');
    grid.querySelectorAll('button[data-game]').forEach(b => {
      b.disabled = !POKEDEX_DATA.records[b.getAttribute('data-game')];
      b.onclick = () => { const gameKey = b.getAttribute('data-game'); if(POKEDEX_DATA.records[gameKey]) { CURRENT_GAME = gameKey; salvarJogoSelecionado(gameKey); IS_SHINY = false; SPRITE_ATUAL_FORMA = null; document.getElementById('shinybtn').innerHTML = '✧ Brilhante'; document.getElementById('shinybtn').setAttribute('aria-pressed', 'false'); renderizarPagina(); preencherRespostasRapidas(); modal.classList.remove('open'); } else { alert('Dados deste jogo ainda não cadastrados.'); } };
    });
  }
}

function hpDexDecorate(){
(function(){
  const entry = document.querySelector('.hp-dex-entry');
  const heroArt = document.querySelector('.heroart');
  if (entry && heroArt) {
    const numero = entry.getAttribute('data-number') || '0000';
    heroArt.style.setProperty('--dex-number', '"' + numero + '"');
  }
})();
}

function hpDexTheme(){
/* Detecta o tema do Blogger sem sobrescrever o modo escuro aprovado. */
(function () {
  const app = document.getElementById('hp-dex-app');
  if (!app) return;
  function canais(str) {
    const m = (str || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function claridade(rgb) {
    return rgb ? (rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722) : null;
  }
  function aplicarTemaNavegacao() {
    const root = document.documentElement;
    const body = document.body;
    const tokens = [root.className, body.className, root.getAttribute('data-theme'), body.getAttribute('data-theme'), root.getAttribute('data-mode'), body.getAttribute('data-mode')].join(' ').toLowerCase();
    let modo;
    if (/(^|[\s_-])(dark|escuro)([\s_-]|$)/.test(tokens)) modo = 'dark';
    else if (/(^|[\s_-])(light|claro)([\s_-]|$)/.test(tokens)) modo = 'light';
    else {
      const fundo = claridade(canais(getComputedStyle(body).backgroundColor)) ?? claridade(canais(getComputedStyle(root).backgroundColor));
      const texto = claridade(canais(getComputedStyle(body).color));
      modo = fundo !== null && fundo > 30 ? (fundo >= 120 ? 'light' : 'dark') : (texto !== null && texto < 135 ? 'light' : 'dark');
    }
    app.setAttribute('data-hp-nav-mode', modo);
  }
  aplicarTemaNavegacao();
  if (window.MutationObserver) {
    const watcher = new MutationObserver(aplicarTemaNavegacao);
    [document.documentElement, document.body].forEach(el => watcher.observe(el, {attributes:true,attributeFilter:['class','style','data-theme','data-mode']}));
  }
})();
}

(function(){
  'use strict';
  const script = document.currentScript;
  const template = "\n\n<div class=\"subbar\"><div class=\"subinner\"><div class=\"breadcrumb\">Hey!Pikachu › H!P DEX › <strong id=\"crumb\">Carregando...</strong></div><label class=\"searchbox\"><span aria-hidden=\"true\">⌕</span><input id=\"dexQuickSearch\" placeholder=\"Buscar movimentos nesta ficha...\" type=\"search\"/></label></div></div>\n<main class=\"main\">\n<div class=\"alpha\"><span>HEY!PIKACHU / ENCICLOPÉDIA NACIONAL / PT-BR</span><strong>H!P DEX • FICHAS POR EDIÇÃO</strong></div>\n<div id=\"pokedexpage\">\n<nav aria-label=\"Navegação pela Pokédex Nacional\" class=\"hp-dex-neighbors\" id=\"hpDexNeighbors\"></nav>\n<section class=\"hero\">\n<div class=\"heroleft\">\n<div class=\"pretitle\"><span class=\"no\" id=\"hero-number\">#0000</span><span id=\"herogen\">CARREGANDO...</span></div>\n<h1 id=\"hero-name\">Carregando</h1>\n<div class=\"japan-line\" id=\"hero-japanese\"></div>\n<p class=\"hero-sub\" id=\"hero-species\">Carregando descrição...</p>\n<div class=\"chips\" id=\"hero-types\"></div>\n<div class=\"herostatus\" id=\"hero-status\"></div>\n<div aria-live=\"polite\" class=\"hp-selected-game\">\n<span>JOGO SELECIONADO</span>\n<strong id=\"heroSelectedGame\">---</strong>\n</div>\n</div>\n<div class=\"heroart\" id=\"hero-art\">\n<div class=\"heroflag\" id=\"heroEra\">--</div>\n<img alt=\"Sprite\" class=\"pokeart\" id=\"charart\" style=\"display:none;\"/>\n<div class=\"form-image-error\" id=\"formArtworkPending\"><div><span class=\"symbol\">◈</span>Carregando...</div></div>\n</div>\n</section>\n<div class=\"controls\">\n<div class=\"gamecontrol\">\n<div class=\"joy\">🎮</div>\n<div style=\"min-width:0;flex:1\">\n<div class=\"gamelabel\">VOCÊ ESTÁ EXPLORANDO</div>\n<strong class=\"gamecurrent\" id=\"gamecurrent\">...</strong>\n<span class=\"gamemeta\" id=\"gamemeta\">Geração IX · Dados por edição</span>\n</div>\n<button class=\"changegame\" id=\"pickgame\">\n<span>Trocar jogo</span>\n<svg fill=\"none\" height=\"14\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" style=\"margin-left: 6px; transform: translateY(1px);\" viewbox=\"0 0 24 24\" width=\"14\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>\n</button>\n</div>\n<div class=\"actions\">\n<button aria-pressed=\"false\" class=\"secondarybtn\" id=\"shinybtn\">✧ Brilhante</button>\n<div aria-label=\"Visual por sexo\" class=\"sex-control\" id=\"gendercontrols\">\n<button aria-pressed=\"true\" class=\"sexbtn\" id=\"maleBtn\" title=\"Mostrar aparência masculina\" type=\"button\"><svg class=\"hp-sex-symbol\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" viewbox=\"0 0 32 32\"><circle cx=\"12\" cy=\"20\" r=\"6.5\"></circle><path d=\"M17 15 27 5M20 5h7v7\"></path></svg></button>\n<button aria-pressed=\"false\" class=\"sexbtn\" id=\"femaleBtn\" title=\"Mostrar aparência feminina\" type=\"button\"><svg class=\"hp-sex-symbol\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" viewbox=\"0 0 32 32\"><circle cx=\"16\" cy=\"12\" r=\"7\"></circle><path d=\"M16 19v10M10 25h12\"></path></svg></button>\n</div>\n<button aria-haspopup=\"dialog\" class=\"secondarybtn\" id=\"formsbtn\" type=\"button\">◈ Formas <span id=\"formBadge\">1</span></button>\n</div>\n</div>\n<div class=\"contextbar\"><span id=\"contexttext\">Carregando contexto...</span><span class=\"small\" id=\"coverage\">...</span></div>\n<nav class=\"jumpnav\" id=\"jumpnav\">\n<a class=\"active\" href=\"#guia-rapido\">◉ Visão geral</a><a href=\"#entradas\">▤ Pokédex</a><a href=\"#evs\">◈ EVs</a><a href=\"#defesas\">🛡 Tipos</a><a href=\"#evolucao\">↗ Evolução</a><a href=\"#localizacao\">⌖ Localização</a><a href=\"#movimentos\">✦ Movimentos</a><a href=\"#biologia\">⚥ Biologia</a><a href=\"#universo\">★ Universo</a>\n</nav>\n<div class=\"content\">\n<section class=\"section full hp-direct\" id=\"guia-rapido\"><div class=\"sectitle\"><h2><b>⚡</b> <span id=\"direct-title\">Respostas rápidas</span></h2><span class=\"caption\">ENCONTRE EM SEGUNDOS</span></div><div class=\"hp-direct-grid\" id=\"directAnswers\"></div></section>\n<section class=\"section full\" id=\"entradas\" style=\"background: transparent; border: none; box-shadow: none; padding: 0;\">\n<div class=\"hp-pokedex-device\">\n<div class=\"hp-pokedex-header\">\n<div class=\"hp-pokedex-lights\">\n<div class=\"hp-light-blue\"></div>\n<div class=\"hp-light-small red\"></div>\n<div class=\"hp-light-small yellow\"></div>\n<div class=\"hp-light-small green\"></div>\n</div>\n<h2 class=\"hp-pokedex-title\">Entradas da Pokédex <span>TEXTOS DO JOGO</span></h2>\n</div>\n<div class=\"hp-pokedex-body\">\n<div class=\"hp-pokedex-screen\">\n<div class=\"hp-screen-glare\"></div>\n<div class=\"hp-pokedex-text\" id=\"dexentry\"></div>\n</div>\n<div class=\"hp-pokedex-footer\">Tradução adaptada para o português, preservando o significado e a essência da descrição original da Pokédex.</div>\n</div>\n</div>\n</section>\n<section class=\"section\" id=\"atributos\">\n<div class=\"sectitle\"><h2><b>▥</b> Atributos e habilidades</h2><span class=\"caption\">BASE STATS</span></div>\n<div class=\"statslist\" id=\"statslist\"></div>\n<div class=\"stat-insight\" id=\"statInsight\"></div>\n<div class=\"statfoot\"><span id=\"stattotalLabel\">Total</span><span id=\"stattotal\">0</span></div>\n<div id=\"abilities\"></div>\n</section>\n<section class=\"section\" id=\"evs\">\n<div class=\"sectitle\"><h2><b>◈</b> Pontos de EVs</h2><span class=\"caption\">VALORES DE ESFORÇO</span></div>\n<p class=\"subnote\">Recompensa de treinamento ao derrotar este Pokémon. O sistema varia conforme a geração selecionada.</p>\n<div id=\"evDisplay\"></div>\n</section>\n<section class=\"section\" id=\"defesas\"><div class=\"sectitle\"><h2><b>🛡</b> Tipos e efetividades</h2><span class=\"caption\">DEFESA</span></div><p style=\"color:var(--muted);font-size:12px;margin:0 0 12px\">Veja rapidamente quais tipos oferecem mais perigo no contexto selecionado.</p><div class=\"factgrid\" id=\"defenses\"></div><div class=\"hint\">ⓘ As resistências podem variar quando a tabela de tipos muda ao longo das gerações.</div></section>\n<section class=\"section\" id=\"evolucao\">\n<div class=\"sectitle\"><h2><b>↗</b> Linha evolutiva</h2><span class=\"caption\">LINHA EVOLUTIVA</span></div>\n<div class=\"evo\" id=\"evoLine\"></div>\n<div class=\"form-spotlight\"><div><strong>Transformações e formas</strong><small>Selecionadas conforme o jogo ativo</small></div><button class=\"secondarybtn\" id=\"formsInline\" type=\"button\">Explorar formas ↗</button></div>\n<div id=\"formsinfo\"></div>\n</section>\n<section class=\"section\" id=\"localizacao\"><div class=\"sectitle\"><h2><b>⌖</b> Onde encontrar?</h2><span class=\"caption\">NO JOGO ATUAL</span></div><div id=\"location\"></div></section>\n<section class=\"section full\" id=\"movimentos\">\n<div class=\"sectitle\"><h2><b>✦</b> Movimentos aprendidos</h2><span class=\"caption\" id=\"learnbadge\">MOVIMENTOS POR MÉTODO</span></div>\n<div class=\"hint hp-review-panel\" id=\"specieshint\" style=\"margin-bottom:22px\"></div>\n<div class=\"movetools\"><div class=\"minitabs\" id=\"movetools\"><button class=\"sel\" data-method=\"level\">Por nível</button><button data-method=\"evolution\">Ao evoluir</button><button data-method=\"tm\">TM / HM</button><button data-method=\"egg\">Ovo</button><button data-method=\"tutor\">Tutor</button><button data-method=\"tr\">TR</button></div><input class=\"input\" id=\"moveSearch\" placeholder=\"⌕ Procurar movimento...\" type=\"search\"/></div>\n<div class=\"tablewrap\" id=\"learncontent\"></div>\n</section>\n<section class=\"section full\" id=\"biologia\">\n<div class=\"sectitle\"><h2><b>⚥</b> Biologia e Reprodução</h2><span class=\"caption\">DADOS DA ESPÉCIE E DO JOGO</span></div>\n<div class=\"hp-bio-layout\"><div class=\"hp-bio-panel\"><h3>Informações da espécie</h3><div class=\"factgrid\" id=\"speciesfacts\"></div></div><div class=\"hp-bio-panel\"><h3>Reprodução e características</h3><div class=\"factgrid\" id=\"breeding\"></div><div class=\"sex-visual-wrap\" id=\"sexVisualNote\"></div><div class=\"morphology\" id=\"morphology\"></div></div></div>\n</section>\n<section class=\"section full\" id=\"universo\">\n<div class=\"sectitle\"><h2><b>★</b> Além dos jogos principais</h2><span class=\"caption\">ANIME, SPIN-OFFS E HISTÓRIA</span></div>\n<div class=\"stateempty\">Registros do anime e spin-offs serão incluídos somente após conferência específica.</div>\n</section>\n</div>\n</div>\n</main>\n<div class=\"modalback\" id=\"gamemodal\"><div class=\"modal\"><div class=\"modalhead\"><div><h2>Escolha o jogo que quer explorar</h2></div><button class=\"close\" id=\"closegame\">✕</button></div><div class=\"modalbody\" id=\"gamegrid\"></div><div class=\"modalnote\">🟢 Revisado · 🟠 Parcial · ⚪ Beta</div></div></div><div class=\"formmodal\" id=\"formModal\"><div class=\"formdialog\"><div class=\"formdialog-head\"><div><h2>Formas do Pokémon</h2></div><button class=\"form-close\" id=\"closeForms\">✕</button></div><div class=\"form-choices\" id=\"formChoices\"></div></div></div>";
  const bootstrap = async () => {
    const app = document.querySelector('#hp-dex-app[data-pokemon]');
    if (!app || app.dataset.hpDexBooted === 'true') return;
    app.dataset.hpDexBooted='true';
    if (!app.querySelector('#pokedexpage')) app.insertAdjacentHTML('beforeend',template);
    try { await hpDexRender(); }
    catch(e) { console.error('H!P DEX - falha ao inicializar:', e); }
    // Comportamentos auxiliares extraídos da versão aprovada.
    hpDexDecorate(); hpDexTheme();
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootstrap,{once:true});
  else bootstrap();
})();

