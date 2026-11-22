#!/usr/bin/env python3
"""Atualiza o registro de fichas PUBLICADAS da dexH!P usando o feed do Blogger.

Não remove registros existentes. Em falhas de rede/feeds não altera registry.json.
Sem dependências externas; compatível com Python 3.10+.
"""

import json
import os
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "hp-dex" / "registry.json"
POKEMON_DIR = ROOT / "pokemon"
SITE = "https://dex.heypikachu.com"
FEED_ORIGINS = (SITE, "https://dexhp.blogspot.com")
PAGE_SIZE = 100
MAX_PAGES = 30
TIMEOUT = 18
RETRIES = 2


class DexMarker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.slugs = set()

    def handle_starttag(self, tag, attrs):
        if tag.lower() not in ("div", "section"):
            return
        attr = dict(attrs)
        if attr.get("id") == "hp-dex-app" and attr.get("data-pokemon"):
            self.slugs.add(attr["data-pokemon"].strip().lower())


def detect_slugs(html):
    parser = DexMarker()
    parser.feed(html or "")
    return parser.slugs


def fetch(url):
    request = Request(url, headers={
        "User-Agent": "HeyPikachu-Dex-Registry/1.0 (+https://dex.heypikachu.com)",
        "Accept": "application/json,text/html,application/xhtml+xml,*/*;q=0.5",
    })
    last_exc = None
    for attempt in range(RETRIES + 1):
        try:
            with urlopen(request, timeout=TIMEOUT) as response:
                data = response.read(8_000_001)
                if len(data) > 8_000_000:
                    raise ValueError(f"Resposta muito grande: {url}")
                charset = response.headers.get_content_charset() or "utf-8"
                return data.decode(charset, errors="replace")
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            last_exc = exc
            if attempt < RETRIES:
                time.sleep(attempt + 1)
    raise RuntimeError(f"Falha ao consultar {url}: {last_exc}")


def read_feed():
    errors = []
    for origin in FEED_ORIGINS:
        try:
            posts = []
            total = None
            for page in range(MAX_PAGES):
                params = urlencode({
                    "alt": "json", "max-results": PAGE_SIZE,
                    "start-index": page * PAGE_SIZE + 1,
                })
                payload = json.loads(fetch(f"{origin}/feeds/posts/default?{params}"))
                feed = payload.get("feed", {})
                entries = feed.get("entry", [])
                if total is None:
                    total = int(feed.get("openSearch$totalResults", {}).get("$t", len(entries)))
                posts.extend(entries)
                if len(posts) >= total:
                    break
                if not entries:
                    raise RuntimeError("Feed incompleto: página vazia antes do total informado")
            else:
                raise RuntimeError("Limite de paginação atingido: cadastro não alterado")
            if not posts:
                raise RuntimeError("Feed vazio: cadastro não alterado")
            print(f"Feed acessível: {origin} | {len(posts)} postagens")
            return posts
        except (ValueError, KeyError, TypeError, RuntimeError, json.JSONDecodeError) as exc:
            errors.append(f"{origin}: {exc}")
    raise RuntimeError("Não foi possível ler o Blogger. " + " | ".join(errors))


def alternate_url(entry):
    for link in entry.get("link", []):
        if link.get("rel") == "alternate" and link.get("href"):
            url = link["href"]
            parsed = urlparse(url)
            if parsed.scheme in ("http", "https") and parsed.hostname in ("dex.heypikachu.com", "dexhp.blogspot.com"):
                return urlunparse(("https", parsed.netloc, parsed.path, "", parsed.query, ""))
    return None


def get_post_species(entry):
    for field in ("content", "summary"):
        raw = entry.get(field, {}).get("$t", "")
        ids = detect_slugs(raw)
        if ids:
            return ids
    # Um feed configurado como resumo pode truncar o marcador: conferir a página real.
    page_url = alternate_url(entry)
    if page_url:
        try:
            return detect_slugs(fetch(page_url))
        except RuntimeError as exc:
            print(f"AVISO: postagem não inspecionada: {page_url}: {exc}", file=sys.stderr)
    return set()


def local_pokemon(slug):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        return None
    path = POKEMON_DIR / (slug + ".json")
    if not path.is_file():
        return None
    # O marcador só é aceito se concordar com a identidade do JSON local.
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if data.get("species") != slug:
        raise RuntimeError(f"Identidade divergente no JSON: {path}")
    num = str(data.get("number", ""))
    if not num.isdigit() or not (1 <= int(num) <= 1025):
        raise RuntimeError(f"Número nacional inválido: {path}: {num}")
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        raise RuntimeError(f"Nome ausente: {path}")
    return str(int(num)), name.strip()


def official_alternate(url):
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"dex.heypikachu.com", "dexhp.blogspot.com"}:
        return None
    return urlunparse(("https", "dex.heypikachu.com", parsed.path, "", "", ""))


def verified_url(slug, post_url):
    # Prioridade ao permalink curto; se não for roteado, usar permalink Blogger no domínio oficial.
    candidates = [f"{SITE}/{slug}", official_alternate(post_url)]
    for candidate in dict.fromkeys(x for x in candidates if x):
        try:
            if slug in detect_slugs(fetch(candidate)):
                return candidate
        except RuntimeError:
            pass
    return None


def main():
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if registry.get("schema") != 1 or not isinstance(registry.get("pokemon"), dict):
        raise RuntimeError("Formato inesperado do registry.json: nada foi alterado")
    posts = read_feed()
    updates = 0
    seen = set()
    for entry in posts:
        url = alternate_url(entry)
        for slug in get_post_species(entry):
            identity = local_pokemon(slug)
            if not identity:
                print(f"AVISO: {slug} publicado sem JSON local correspondente; ignorando")
                continue
            number, name = identity
            if number in seen:
                continue
            seen.add(number)
            old = registry["pokemon"].get(number, {})
            if old.get("published") is True and old.get("url", "").startswith(SITE + "/"):
                # Preserva permalinks oficiais atuais; não troca links aprovados.
                continue
            chosen = verified_url(slug, url)
            if not chosen:
                print(f"AVISO: página de {name} sem URL funcional confirmada; registro mantido", file=sys.stderr)
                continue
            registry["pokemon"][number] = {"name": name, "published": True, "url": chosen}
            updates += 1
            print(f"Ativado #{number.zfill(4)} {name}: {chosen}")
    if not seen:
        raise RuntimeError("Nenhuma postagem H!P DEX reconhecida: registry.json preservado")
    if updates:
        registry["pokemon"] = dict(sorted(registry["pokemon"].items(), key=lambda pair: int(pair[0])))
        REGISTRY_PATH.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Resultado: {len(seen)} espécies encontradas; {updates} links novos/atualizados; entradas antigas preservadas")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        sys.exit(1)
