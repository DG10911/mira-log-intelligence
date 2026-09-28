# Real Datasets on KIOXIA SSD

The full **LogHub** collection (19 datasets, ~6 GB) is downloaded to the KIOXIA
external SSD and streamed through the live detection pipeline. Nothing heavy
touches the boot disk.

## Location (KIOXIA SSD)
```
/Volumes/KIOXIA/acentra-logintel/
├── datasets/
│   ├── raw/          # verified .zip / .tar.gz (md5-checked against Zenodo)
│   ├── extracted/    # unpacked *.log files (what the pipeline reads)
│   └── download.log  # downloader progress log
```
If the SSD is unplugged, the app falls back to `backend/.data/` automatically
(`Settings.resolved_data_root()`), so nothing crashes.

## Datasets (LogHub, Zenodo record 8196385)
| Dataset | Size | Anomaly labels |
|---|---|---|
| HDFS_v1 | 178 MB | ✅ `anomaly_label.csv` (per-block) |
| BGL | 57 MB | ✅ inline (`-` = normal, else alert tag) |
| OpenStack | 5 MB | ✅ `anomaly_labels.txt` |
| Thunderbird | 2.0 GB | ✅ inline |
| Windows, Spark, HDFS_v2/v3, Android_v1/v2, Hadoop, HPC, SSH, Mac, Linux, Apache, Zookeeper, Proxifier, HealthApp | 0.2 MB – 1.7 GB | unlabeled (great for template mining / baseline) |

## Downloading / refreshing
```bash
cd backend
python3 scripts/download_datasets.py                 # all (resumable, md5-verified)
python3 scripts/download_datasets.py --only HDFS_v1,BGL
```

## Streaming a real dataset through the pipeline
REST (server running):
```bash
curl localhost:8000/api/datasets            # list what's on the SSD
curl -X POST localhost:8000/api/replay \
  -H 'content-type: application/json' \
  -d '{"path":"/Volumes/KIOXIA/acentra-logintel/datasets/extracted/BGL/BGL.log","rate_hz":2000,"max_lines":50000}'
```
The dashboard reacts live to real production logs, exactly as with the synthetic
attack simulator.

## Proving detector quality (labeled eval)
```bash
cd backend
uv run python scripts/evaluate_detectors.py \
  --path /Volumes/KIOXIA/acentra-logintel/datasets/extracted/BGL/BGL.log \
  --window 100 --limit 400000
# -> Precision / Recall / F1 for the combined detector bank on ground-truth labels
```

## Detector bank
- **robust_zscore** — per-feature modified z-score (median/MAD), contamination-guarded
- **cusum** — Page's tabular CUSUM for slow, sustained drift (new; `app/detection/cusum.py`)
- **novel_template** — never-before-seen Drain3 template = anomaly
- **security rules** — brute-force / credential-stuffing / injection *signals* (evidence-based, never "confirmed")
- **fusion** — combines detector scores + signals into one graded, explainable alert
