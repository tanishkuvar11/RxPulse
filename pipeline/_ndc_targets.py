"""
Build data/raw/ndc_cache.json: a mapping from 11-digit NDC -> {ingredient, drug_class}.

Strategy (see README for why): DE-SynPUF's PROD_SRVC_ID field is disclosure-perturbed
per the CMS codebook (PDE-4), and its record-level frequency distribution is far flatter
than real-world drug dispensing (no small set of NDCs dominates -- checked empirically).
Looking up all ~268k unique codes one at a time against RxNorm is impractical and
unnecessary. Instead we go the other direction: start from a fixed list of ~25
chronic-maintenance ingredients (the classes this project targets), pull every clinical
drug concept (RxNorm SCD/SBD, single-ingredient only -- no combination products) for
each, and pull the full historical NDC set for each concept via RxNorm's
allhistoricalndcs endpoint. That gives a target NDC set we can check PDE rows against
with an O(1) hash lookup -- no per-row API calls.

Run once. Idempotent: skips the fetch if data/raw/ndc_cache.json already exists.
"""
import json
import time
import sys
from pathlib import Path

import requests

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
CACHE_PATH = RAW_DIR / "ndc_cache.json"

RXNAV = "https://rxnav.nlm.nih.gov/REST"

# Chronic maintenance medication classes for this project: continuous daily dosing
# is the standard of care, all in wide use during the DE-SynPUF observation window
# (2008-2010).
TARGET_INGREDIENTS = {
    "antihypertensive": [
        "lisinopril", "enalapril", "ramipril", "benazepril",
        "losartan", "valsartan", "olmesartan", "irbesartan",
        "amlodipine", "diltiazem", "verapamil", "felodipine",
        "metoprolol", "atenolol", "carvedilol", "propranolol",
        "hydrochlorothiazide", "chlorthalidone", "furosemide",
    ],
    "statin": [
        "atorvastatin", "simvastatin", "lovastatin", "pravastatin", "rosuvastatin",
    ],
    "oral_antidiabetic": [
        "metformin", "glipizide", "glyburide", "glimepiride", "pioglitazone", "sitagliptin",
    ],
    "thyroid_replacement": [
        "levothyroxine",
    ],
}


def get_json(url, params=None, retries=3):
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=20)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == retries - 1:
                print(f"    FAILED: {url} params={params}: {e}", file=sys.stderr)
                return {}
            time.sleep(1.0)
    return {}


def ingredient_rxcui(name):
    d = get_json(f"{RXNAV}/rxcui.json", {"name": name, "search": 1})
    ids = d.get("idGroup", {}).get("rxnormId", [])
    return ids[0] if ids else None


def single_ingredient_drug_concepts(ing_rxcui, ing_name):
    """Return list of (rxcui, name) for SCD/SBD concepts that are this ingredient alone
    (no '/' in the name, which marks a combination product)."""
    out = []
    seen = set()
    for tty in ("SCD", "SBD"):
        d = get_json(f"{RXNAV}/rxcui/{ing_rxcui}/related.json", {"tty": tty})
        time.sleep(0.15)
        for group in d.get("relatedGroup", {}).get("conceptGroup", []) or []:
            for cp in group.get("conceptProperties", []) or []:
                name = cp.get("name", "")
                if "/" in name or cp["rxcui"] in seen:
                    continue  # combination product; skip for clean single-ingredient classification
                seen.add(cp["rxcui"])
                out.append((cp["rxcui"], name))
    return out


def historical_ndcs(drug_rxcui):
    d = get_json(f"{RXNAV}/rxcui/{drug_rxcui}/allhistoricalndcs.json")
    ndcs = []
    concept = d.get("historicalNdcConcept", {})
    for htime in concept.get("historicalNdcTime", []) or []:
        for entry in htime.get("ndcTime", []) or []:
            for ndc in entry.get("ndc", []) or []:
                ndcs.append(ndc)
    return ndcs


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if CACHE_PATH.exists():
        print(f"Cache already exists at {CACHE_PATH}, skipping fetch.")
        with open(CACHE_PATH) as f:
            cache = json.load(f)
        print(f"  {len(cache)} NDCs mapped across "
              f"{len(set(v['ingredient'] for v in cache.values()))} ingredients.")
        return

    cache = {}  # ndc11 -> {ingredient, drug_class}
    for drug_class, ingredients in TARGET_INGREDIENTS.items():
        for ing in ingredients:
            rxcui = ingredient_rxcui(ing)
            time.sleep(0.15)
            if not rxcui:
                print(f"  no rxcui found for {ing}")
                continue
            concepts = single_ingredient_drug_concepts(rxcui, ing)
            time.sleep(0.15)
            n_ndc_this_ing = 0
            for drug_rxcui, name in concepts:
                ndcs = historical_ndcs(drug_rxcui)
                time.sleep(0.15)
                for ndc in ndcs:
                    ndc = ndc.strip()
                    if len(ndc) != 11 or not ndc.isdigit():
                        continue
                    cache[ndc] = {"ingredient": ing, "drug_class": drug_class}
                    n_ndc_this_ing += 1
            print(f"  {drug_class:20s} {ing:18s} -> {len(concepts):3d} drug concepts, "
                  f"{n_ndc_this_ing:5d} NDCs")

    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=0, sort_keys=True)
    print(f"\nWrote {len(cache)} NDC -> ingredient mappings to {CACHE_PATH}")


if __name__ == "__main__":
    main()
