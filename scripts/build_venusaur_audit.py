#!/usr/bin/env python3
"""Compilador auditável: Venusaur #0003, extração de tabelas PokeAPI.
NUNCA publica em main; saídas são candidatas e exigem revisão humana.
Fonte da base V1: audit/venusaur-base.json, preservada imutável.
"""
import csv
import io
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE=Path("audit/venusaur-base.json")
OUT=Path("audit/venusaur-v2-auditoria.json")
REPORT=Path("audit/venusaur-v2-verificacao.json")
ROOT="https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
cache={}
def rows(name):
    if name not in cache:
        url=ROOT+name+".csv"
        print("Baixando", name,flush=True)
        req=urllib.request.Request(url,headers={"User-Agent":"dexHP-auditoria-de-dados/1.0"})
        with urllib.request.urlopen(req,timeout=90) as r: blob=r.read()
        cache[name]=list(csv.DictReader(io.StringIO(blob.decode("utf-8-sig"))))
    return cache[name]
def integer(value):
    try: return int(value)
    except (TypeError, ValueError): return None
def english(table, key, name="name"):
    return {int(r[key]):r[name] for r in rows(table) if r.get("local_language_id")=="9"}
groups={
"rb":1,"yellow":2,"gold":3,"silver":3,"crystal":4,
"ruby":5,"sapphire":5,"emerald":6,"firered":7,"leafgreen":7,
"diamond":8,"pearl":8,"platinum":9,"heartgold":10,"soulsilver":10,
"black":11,"white":11,"black2":14,"white2":14,
"x":15,"y":15,"omega-ruby":16,"alpha-sapphire":16,
"sun":17,"moon":17,"ultra-sun":18,"ultra-moon":18,
"lets-go-pikachu":19,"lets-go-eevee":19,
"sword":20,"shield":20,"brilliant-diamond":23,"shining-pearl":23,
"scarlet":27,"violet":27,"za":30
}
types={r["id"]:r["identifier"] for r in rows("types")}
types_pt={"normal":"Normal","fighting":"Lutador","flying":"Voador","poison":"Venenoso",
"ground":"Terrestre","rock":"Pedra","bug":"Inseto","ghost":"Fantasma",
"steel":"Aço","fire":"Fogo","water":"Água","grass":"Grama",
"electric":"Elétrico","psychic":"Psíquico","ice":"Gelo",
"dragon":"Dragão","dark":"Sombrio","fairy":"Fada"}
cat={1:"Status",2:"Físico",3:"Especial"}
moves={int(r["id"]):r for r in rows("moves")}
names=english("move_names","move_id")
items={int(r["id"]):r["identifier"].upper().replace("-","") for r in rows("items")}
machines=defaultdict(list)
for r in rows("machines"):
    gid=integer(r["version_group_id"])
    ident=items.get(integer(r["item_id"]),"")
    if re.fullmatch(r"(?:TM|HM|TR)\d{2,3}",ident):
        machines[(gid,integer(r["move_id"]))].append(ident)
# Changelog: cada linha registra valores antigos antes de seu changed_in_version_group_id.
history=defaultdict(list)
for r in rows("move_changelog"):
    history[int(r["move_id"])].append(r)
for val in history.values(): val.sort(key=lambda x:int(x["changed_in_version_group_id"]))
def move_details(mid,game,gid,gen):
    m=moves[mid]
    power,pp,accuracy=(integer(m.get(x)) for x in ("power","pp","accuracy"))
    # Alterações históricas antes da edição selecionada, sem extrapolar em Z-A.
    for row in reversed(history[mid]):
        if int(row["changed_in_version_group_id"])>gid:
            for key in ("power","pp","accuracy"):
                x=integer(row.get(key))
                if x is not None:
                    if key=="power":power=x
                    elif key=="pp":pp=x
                    else:accuracy=x
    typ=types.get(m["type_id"],"")
    category=cat.get(integer(m["damage_class_id"]),"Status")
    if gen<=3 and category!="Status":
        legacy_class={x["id"]:x["damage_class_id"] for x in rows("types")}
        category=cat.get(integer(legacy_class.get(m["type_id"])) or 2,category)
    d={"name":names.get(mid,m["identifier"]),"type":types_pt.get(typ,typ.title()),
       "category":category,"power":power if power is not None else "—",
       "accuracy":accuracy if accuracy is not None else "—",
       "pp":pp if pp is not None else "—"}
    return d
v=json.loads(BASE.read_text(encoding="utf-8"))
assert v["species"]=="venusaur" and set(groups)==set(v["records"])
v["audit"]["status"]="partial"
v["audit"]["stage"]="CANDIDATA V2 — MOVIMENTOS EXTRAÍDOS, AUDITORIA HUMANA PENDENTE; NÃO PUBLICAR COMO COMPLETA"
v["audit"]["notes"]="Dados de aprendizagem importados da tabela pública PokeAPI por version_group, sem copiar movesets de outra espécie. Metadados históricos e disponibilidade de formas/locais ainda exigem conferência independente, sobretudo Z-A e DLC."
v["audit"]["research_data_source"]="Interna: PokeAPI/pokeapi, data/v2/csv, revisão reprodutível; não publicar referência em texto editorial."
v["audit"]["pending_verification"]=[
"Revisão detalhada de golpes históricos e numeração de máquinas por jogo; versão de DLC é agregada",
"Capturas, presentes, encontros, eventos e transferências de todas as 36 edições",
"Entradas da Pokédex em português para cada jogo",
"Movimentos exclusivos de Legends: Z-A: recarga, nível PLUS e mecânicas de combate",
"Compatibilidade real dos sprites de Mega/Gigantamax e disponibilidade condicionada",
"Tabela de defesas da Geração I/II e formas especiais",
"Spin-offs, aparições em outras mídias, conceito e origem, morfologia"
]
# Habilidades antigas: Hidden Ability só a partir da geração V.
for key,r in v["records"].items():
    gen=int("123456789"["ABCDEFGHI".index(r["gen"])]) if r["gen"] in "ABCDEFGHI" else ["I","II","III","IV","V","VI","VII","VIII","IX"].index(r["gen"])+1
    if gen in (1,2):r["abilities"]="Habilidades não existem nesta geração."
    elif gen in (3,4):r["abilities"]="Overgrow (Principal). A habilidade oculta Chlorophyll ainda não existia nesta geração."
    elif key=="za":r["abilities"]="Habilidades tradicionais não são utilizadas nesta edição."
    else:r["abilities"]="Overgrow (Principal) · Chlorophyll (Oculta)."
    if key=="za":
        r["breeding"]="Reprodução não existe nesta edição."
    if key not in ("rb","yellow","gold","silver","crystal","za"):
        r["ev_yield"]=[0,0,0,2,1,0]
    elif key in ("rb","yellow","gold","silver","crystal"):
        r["ev_yield"]=[0]*6
    gid=groups[key]
    r["moves_by_method"]={"level":[],"evolution":[],"tm":[],"egg":[],"tutor":[],"tr":[],"other":[]}
# Alguns registros PokeAPI usam jogos DLC. Coletar por chave usando os grupos.
actual=defaultdict(int)
unknown_ids=set()
for row in rows("pokemon_moves"):
    if row["pokemon_id"]!="3":continue
    gid=integer(row["version_group_id"])
    keys=[k for k,g in groups.items() if g==gid]
    if gid in (25,26,27):keys += [k for k in ("scarlet","violet") if k not in keys]
    if gid in (20,21,22):keys += [k for k in ("sword","shield") if k not in keys]
    # O dataset pode conter grupos DLC de forma incremental:
    if not keys: continue
    mid=integer(row["move_id"]);method=integer(row["pokemon_move_method_id"])
    if mid not in moves:unknown_ids.add(mid);continue
    for key in keys:
        r=v["records"][key]
        gen=["I","II","III","IV","V","VI","VII","VIII","IX"].index(r["gen"])+1
        d=move_details(mid,key,gid,gen)
        if method==1:
            d["method"]="level"
            d["level"]=integer(row["level"]) or 1
            r["moves_by_method"]["level"].append(d)
        elif method==2:
            if gen<=1 or key=="za":continue
            d["method"]="egg"
            r["moves_by_method"]["egg"].append(d)
        elif method==3:
            if key=="za":continue
            d["method"]="tutor"
            r["moves_by_method"]["tutor"].append(d)
        elif method==4:
            codes=machines.get((gid,mid),[])
            if not codes:continue
            for code in codes:
                d2=dict(d)
                d2["machine"]=code
                d2["method"]="tr" if code.startswith("TR") else "tm"
                r["moves_by_method"][d2["method"]].append(d2)
        elif method==13:
            d["method"]="evolution";d["level"]=0
            r["moves_by_method"]["evolution"].append(d)
        else:
            # Não atribuir nome de método errado.
            continue
# Remover duplicações idênticas por espécie/edição/método; registrar amostras por edição.
summary={}
for key,r in v["records"].items():
    for method,values in r["moves_by_method"].items():
        seen=set();uniq=[]
        for d in values:
            stamp=(d["name"],d.get("level"),d.get("machine"))
            if stamp not in seen:seen.add(stamp);uniq.append(d)
        uniq.sort(key=lambda d:(d.get("level",0),d.get("machine",""),d["name"]))
        r["moves_by_method"][method]=uniq
    n={m:len(x) for m,x in r["moves_by_method"].items()}
    summary[key]=n
    r["review_status"]="partial" if any(n.values()) else "beta"
    r["last_review"]="2026-11-23"
    r["learnset_notes"]="Movimentos extraídos do conjunto estruturado PokeAPI; revisões por edição ainda pendentes. Detalhes históricos de golpes e métodos de obtenção não estão certificados."
# Nunca marcar edições com zero golpes como completas.
if not any(sum(s.values()) for s in summary.values()):
    raise RuntimeError("Nenhum movimento carregado: dados externos inconsistentes.")
# Não publicar JSONs com estado completo e falsa certeza.
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
REPORT.write_text(json.dumps({"status":"PARCIAL_NAO_PUBLICAR_COMO_COMPLETA",
 "source":"PokeAPI/pokeapi data/v2/csv (movimentos e metadados públicos)",
 "pokemon":"Venusaur","editions":len(v["records"]),"moves_by_edition":summary,
 "uncertain_moves":list(sorted(unknown_ids)),
 "sum_moves_all":sum(sum(s.values()) for s in summary.values()),
 "verification":"Compilado de tabelas, não certifica cada golpe/localização individualmente"},
 ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Edições:",len(v["records"]),"Total de linhas de golpes:",
      sum(sum(s.values()) for s in summary.values()))
