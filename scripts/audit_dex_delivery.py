#!/usr/bin/env python3
"""Auditoria não destrutiva: origem GitHub -> jsDelivr -> Blogger.
Gera hp-dex/delivery-audit.json. Não modifica o motor nem dados.
"""
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "hp-dex" / "delivery-audit.json"
CDN = "https://cdn.jsdelivr.net/gh/heypikachu/data@main/hp-dex/"
RAW = "https://raw.githubusercontent.com/heypikachu/data/main/hp-dex/"
PAGES = ["https://dex.heypikachu.com/" + s for s in ("charmander","charmeleon","charizard")]
KEY_OLD = "Principal recompensa"
KEY_NEW = "Distribuição de EVs"

def digest(content):
    return sha256(content).hexdigest()

def fetch(url):
    request = Request(url, headers={
        "User-Agent":"Mozilla/5.0 (compatible; H!P DEX Release Audit/1.0)",
        "Cache-Control":"no-cache",
        "Pragma":"no-cache",
    })
    try:
        with urlopen(request, timeout=30) as response:
            payload=response.read(3_000_000)
            return {
                "status":response.status,
                "url":response.url,
                "sha256":digest(payload),
                "bytes":len(payload),
                "text":payload.decode("utf-8",errors="replace"),
                "headers":{k:response.headers.get(k) for k in
                    ("Cache-Control","Age","X-Cache","ETag","Content-Type","Access-Control-Allow-Origin")}
            }
    except (HTTPError,URLError,TimeoutError,OSError,ValueError) as exc:
        return {"error": str(exc)}

class ScriptInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts=[]
        self.links=[]
        self.apps=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag == "script":
            self.scripts.append(a.get("src","[inline]"))
        elif tag == "link" and a.get("rel") == "stylesheet":
            self.links.append(a.get("href",""))
        elif a.get("id") == "hp-dex-app":
            self.apps.append(a.get("data-pokemon",""))

def main():
    report={"schema":1,"time_utc":datetime.now(timezone.utc).isoformat(),
            "purpose":"Read-only delivery diagnostics: not proof of browser rendering",
            "assets":{},"pages":{}}
    for name in ("hp-dex.js","hp-dex.css"):
        local=(ROOT/"hp-dex"/name).read_bytes()
        cdn=fetch(CDN+name)
        raw=fetch(RAW+name)
        x={"repo_sha256":digest(local),"cdn":{k:v for k,v in cdn.items() if k!="text"},
           "github_raw":{k:v for k,v in raw.items() if k!="text"},
           "cdn_matches_repo":cdn.get("sha256")==digest(local),
           "raw_matches_repo":raw.get("sha256")==digest(local)}
        if name.endswith(".js"):
            for label,thing in (("cdn",cdn),("github_raw",raw)):
                text=thing.get("text","")
                x[label]["old_ev_heading_present"]=KEY_OLD in text
                x[label]["new_ev_heading_present"]=KEY_NEW in text
                x[label]["totalEv_present"]="const totalEv = rec.ev_yield.reduce" in text
        report["assets"][name]=x
        print(name, json.dumps(x,ensure_ascii=False))
    for url in PAGES:
        answer=fetch(url)
        if answer.get("error"):
            report["pages"][url]={"error":answer["error"]}
            continue
        html=answer.pop("text")
        inspector=ScriptInspector()
        inspector.feed(html)
        relevant=[src for src in inspector.scripts if "hp-dex" in src.lower()]
        x={"status":answer["status"],"final_url":answer["url"],
           "script_count":len(inspector.scripts),"dex_scripts":relevant,
           "duplicate_dex_script":len(relevant)!=len(set(relevant)),
           "dex_stylesheets":[l for l in inspector.links if "hp-dex" in l.lower()],
           "app_markers":inspector.apps}
        report["pages"][url]=x
        print(url,json.dumps(x,ensure_ascii=False))
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if not report["assets"]["hp-dex.js"]["cdn_matches_repo"]:
        print("WARNING: CDN is not returning the current motor on this Github runner.")
if __name__=="__main__":
    main()
