# XForecast Challenge @ KDD 2026 — FINX-Hanyang

Three independent model notebooks for financial forecasting: **two final submission
solutions and one representative Chronos research baseline**. The
[XForecast Challenge](https://xforecast.github.io/) combines historical prices and
financial news from FinTexTS to forecast closing prices four weeks ahead for 100
stocks. This project studies directional prediction using multimodal learning,
market-wide signals, and pretrained time-series forecasting.

**The three notebooks share one archived competition dataset.** Each notebook
contains its own model pipeline and reads the files it needs from that shared
dataset; the data is stored once in GitHub Releases, not embedded in the notebooks.

## Models

| Notebook | Role | Model configuration | Inputs from the shared dataset |
| --- | --- | --- | --- |
| [finx-hanyang-xforecast-final.ipynb](finx-hanyang-xforecast-final.ipynb) | Final submission 1 | RegimeDiffusion, seed 25, market-common blend α = 0.90 | Train/test prices and Gemini embeddings |
| [finx-hanyang-xforecast-final2.ipynb](finx-hanyang-xforecast-final2.ipynb) | Final submission 2 | Three XForecast members + RegimeDiffusion, market-common blend α = 0.80 | Train/test prices, all six embeddings, submission template |
| [finx-hanyang-xforecast-chronos.ipynb](finx-hanyang-xforecast-chronos.ipynb) | Additional research baseline | Chronos-Bolt-small, zero-shot, 256-step context → 20-step forecast | Train prices for optional validation; test prices and submission template for export |

Each notebook runs independently. Run the two final submissions in separate
sessions because they write overlapping Python module names and output filenames.

### 1. RegimeDiffusion

A conditional discrete-diffusion classifier models return classes (down, flat,
up). Price history and the supplied Gemini news representations condition the
denoising network; iterative denoising yields class probabilities and an expected
return. Company and cross-stock information help describe the current market state.

The final direction blends each stock's own logit with the same-date market mean:

```text
L(i,t) = logit P(up | stock i, date t)
R(t)   = mean_i L(i,t)
score  = α R(t) + (1 − α) L(i,t)
```

Submission 1 uses **α = 0.90** and seed 25. The score sets direction; the model's
expected-return magnitude converts it to a predicted close. These values follow
the executable configuration in the supplied notebook.

### 2. XForecast + RegimeDiffusion ensemble

The XForecast branch uses three complementary price/news architectures:

- `official_itransformer_fused`, seed 3407: combines price and text features in a joint representation.
- `official_itransformer_separate`, seed 2026: processes price and text in separate backbones before combining their outputs.
- `market_residual`, seed 3407: combines a market-level signal with stock-specific information.

The iTransformer-based branches use attention over feature representations to
model dependencies. The three XForecast probabilities are averaged, then mixed
equally with **RegimeDiffusion, seed 42**:

```text
p_individual = 0.5 p_regime + 0.5 mean(p_xforecast_1, p_xforecast_2, p_xforecast_3)
```

The resulting logit uses the same market-common formula with **α = 0.80**. This
combines different price/news models while emphasizing their common market signal.

### 3. Chronos-Bolt-small

[Chronos-Bolt](https://huggingface.co/amazon/chronos-bolt-small) is a pretrained,
patch-based encoder–decoder that directly forecasts future quantiles. This
notebook uses **256 historical closes** to forecast **20 steps ahead**, without
task-specific training or news embeddings. The fraction of terminal forecast
quantiles above the anchor close supplies a directional score; it is a heuristic,
not a calibrated probability. The original 19 requested levels are interpolated
within Bolt's native 0.1–0.9 range, with the endpoints clamped. A fixed 0.5 threshold sets direction, which is
encoded as an anchor-relative ±1% close for the submission format.

The notebook was reconstructed from the existing
[`fm1.py` experiment](archive/chronos/fm1.py). The same small model was reused in
later context-length, model-size, fine-tuning and news-blend experiments. No
original Chronos notebook or complete three-fold ranking of those variants was
recovered, so this is a **representative baseline, not a claimed best or final
submission**. The [provenance record](archive/chronos/provenance.json) records its
source checksum and packaging changes. Its CSV adapter is new and does not
reproduce the separate historical Chronos/news rank-blend candidate.

## One shared input archive

The [competition-inputs release](https://github.com/SOOBEENKIM/KDD-Xforecast-Challenge/releases/tag/competition-inputs-2026-09-23)
contains **19 original files, 69,068,724,930 bytes (69.07 GB / 64.33 GiB)**:
train/test/text Parquets, six news-embedding Parquets, their nine sample CSVs, and
`submission_samples.csv`. The submission sample is an **input template**, not a
model's predicted output. Original text and sample CSVs are preserved even when a
notebook does not need them.

| Input file | Final 1 | Final 2 | Chronos |
| --- | :---: | :---: | :---: |
| `train.parquet` | Required | Required | Validation |
| `test.parquet` | Required | Required | Submission inference |
| `gemini_textemb.parquet` | Required | Required | — |
| `bert_textemb.parquet` | — | Required | — |
| `lgai_textemb.parquet` | — | Required | — |
| `linq_textemb.parquet` | — | Required | — |
| `nvda_textemb.parquet` | — | Required | — |
| `qwen_textemb.parquet` | — | Required | — |
| `submission_samples.csv` | Builds its own target grid | Required | Required for export |

### Download and restore

Install Node.js 18 or later, then:

```sh
git clone https://github.com/SOOBEENKIM/KDD-Xforecast-Challenge.git
cd KDD-Xforecast-Challenge
node scripts/download_inputs.cjs ./data
```

Allow at least 70 GB for the full dataset, plus space for model dependencies,
features and outputs. A Git clone alone does not download release assets. The
restoration script downloads up to four parts concurrently and verifies SHA-256
for every part and reconstructed file. Verified existing files are reused;
different existing files are not overwritten. An interrupted file restarts on the
next run. Filenames, sizes and checksums are in [input-manifest.json](input-manifest.json).

For **Chronos only**, the smaller price-only download is sufficient:

```sh
node scripts/download_inputs.cjs ./data --only kaggle/train.parquet,kaggle/test.parquet,submission_samples.csv
```

Restored files have this layout:

```text
data/
├── kaggle/
│   ├── train.parquet
│   ├── test.parquet
│   ├── text.parquet
│   ├── {bert,gemini,lgai,linq,nvda,qwen}_textemb.parquet
│   └── ...sample CSVs
└── submission_samples.csv
```

The pretrained Chronos weights are **separate from this competition archive**.
The notebook downloads the official `amazon/chronos-bolt-small` checkpoint at
revision `772f3d25d38aec6d914c8949dab4462e2d46f5d8`. A previously downloaded
snapshot can be supplied through `MODEL_PATH` for offline execution.

## Running the notebooks

### Final submissions: Kaggle

1. Import the chosen final notebook into Kaggle and enable a GPU.
2. Attach the required data. Both notebooks search under `/kaggle/input`; Final 2
   requires train/test and all six embedding files in the **same directory**.
   The submission template may be attached separately.
3. Use an environment with `torch`, `numpy`, `pandas`, `pyarrow`, and
   `scikit-learn`. The originals record Python 3.12.13, but no exact package lock
   was supplied for their original runs.
4. Run cells in order. The notebooks write their embedded model modules into
   `/kaggle/working`, prepare features, train, and create `submission.csv`.

Their preferred input layout is:

```text
/kaggle/input/datasets/xforecastdataset/xforecast-dataset/
    train.parquet, test.parquet, *_textemb.parquet
/kaggle/input/competitions/xforecast-challenge-kdd/
    submission_samples.csv
```

Local execution of the two original final notebooks requires adapting or mounting
those Kaggle paths. Their source code is preserved as supplied.

### Chronos: local Jupyter or Kaggle

1. In a Jupyter environment, install Python 3.11 and PyTorch 2.4.1 appropriate for
   your hardware, then run `pip install -r requirements-chronos.txt` using the
   [pinned dependencies](requirements-chronos.txt). The notebook also includes
   a self-contained optional installation cell for Kaggle.
2. Open `finx-hanyang-xforecast-chronos.ipynb` from the repository directory, or
   import it into Kaggle with the price tables and template attached.
3. Run the cells in order. Inputs are discovered under `./data` or `/kaggle/input`;
   set `DATA_DIR` and `TEMPLATE_PATH` if needed. A GPU is recommended; CPU fallback
   is supported by the code.
4. `RUN_VALIDATION` reports only the three historical target years 2020/2021/2022.
   `RUN_SUBMISSION` writes all template rows without calculating held-out metrics.

| Notebook | Generated submission file |
| --- | --- |
| Final 1 | `/kaggle/working/submission.csv` in its own session |
| Final 2 | `/kaggle/working/submission.csv` in its own session; also a named CSV under `xforecast07_private_alpha080_submission/submissions/` |
| Chronos | `outputs/chronos/submission.csv` locally; `/kaggle/working/chronos/submission.csv` on Kaggle |

## Archive and reproducibility

- The two final notebooks preserve all supplied code and Markdown sources.
  Stored outputs, execution counts/timings and widget state were cleared.
- All input-release asset hashes were checked. Public download and reconstruction
  were additionally tested for the training table, template and multipart Gemini
  embedding. Local inputs were not compared with the exact Kaggle dataset version
  used in the original final runs.
- All executable Chronos notebook cells were run in order on an RTX 3090 with
  Python 3.11.9 and PyTorch 2.4.1 / CUDA 12.1. Checks covered the three historical
  validation periods, anchor isolation, and generation of all 52,000 template
  rows. Its pinned model revision, environment and results are documented in
  [archive/chronos/verification.json](archive/chronos/verification.json).
- Final 1 and Final 2 were not retrained during archiving. Their original weights
  and final prediction CSVs are not yet included. The Chronos environment pins do
  not establish the original final-submission environment, and identical results
  across different hardware/software are not guaranteed.
- The original final notebooks are submission archives. In particular, Final 2
  uses its Private configuration for both submission blocks, and its 2022 block
  contains in-sample predictions; those are not independent walk-forward results.
  The added Chronos validation uses only anchor-available inputs, a fixed model,
  and a fixed threshold; it does not tune on the held-out competition year.

## References

- [Official XForecast Challenge](https://xforecast.github.io/)
- [Kaggle competition](https://www.kaggle.com/competitions/xforecast-challenge-kdd)
- [Chronos forecasting library](https://github.com/amazon-science/chronos-forecasting)
- [Chronos-Bolt-small model card](https://huggingface.co/amazon/chronos-bolt-small)
