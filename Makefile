PY := .venv/Scripts/python.exe

.PHONY: all pipeline harness export app clean-processed

all: pipeline harness export

pipeline:
	$(PY) pipeline/_ndc_targets.py
	$(PY) pipeline/01_ingest.py
	$(PY) pipeline/02_normalize.py
	$(PY) pipeline/03_coverage.py
	$(PY) pipeline/04_align.py
	$(PY) pipeline/05_archetypes.py
	$(PY) pipeline/06_hypotheses.py
	$(PY) pipeline/07_conformal.py

harness:
	$(PY) validation/harness.py

export:
	$(PY) pipeline/08_export.py

app:
	cd app && npm install && npm run dev

# Deletes cached intermediates but keeps data/raw/ (the downloaded CMS files and the
# NDC cache), so a re-run of `make all` stays offline.
clean-processed:
	rm -rf data/processed/*.parquet app/public/data/*.json
