# KDD XForecast Challenge 2026

The two final submission notebooks from team **FINX-Hanyang**.
Each notebook includes its model implementation and runs independently in a Kaggle notebook session.

| Notebook | Configuration |
| --- | --- |
| [finx-hanyang-xforecast-final.ipynb](finx-hanyang-xforecast-final.ipynb) | RegimeDiffusion, seed 25; market-common logit blend with alpha 0.90. |
| [finx-hanyang-xforecast-final2.ipynb](finx-hanyang-xforecast-final2.ipynb) | Three XForecast members plus RegimeDiffusion, seed 42; market-common logit blend with alpha 0.80. |

In the second notebook, the XForecast members are `official_itransformer_fused`
(seed 3407), `market_residual` (seed 3407), and
`official_itransformer_separate` (seed 2026). Their mean probability is combined
equally with the RegimeDiffusion probability before the market-common blend.

## Input data

Both notebooks use the organizer-provided XForecast dataset. The required
filenames were found in the local competition data directory during packaging.
The original inputs are archived separately in
[GitHub Releases](https://github.com/SOOBEENKIM/KDD-Xforecast-Challenge/releases/tag/competition-inputs-2026-09-23).
Model weights and generated predictions are not included.

### Download and restore the inputs

The archive contains **19 original files, 69,068,724,930 bytes (64.33 GiB)**:
nine Parquet files, their nine sample CSVs, and the submission template. Large
files are split into raw byte ranges and restored without changing their contents.

Clone this repository, install Node.js 18 or later, and run:

```sh
node scripts/download_inputs.cjs ./data
```

Allow at least 70 GB of free disk space for the data. The script downloads the
release assets, verifies each part's SHA-256, reconstructs the original files,
and verifies their full SHA-256 before installing them. Existing verified files
are reused on a later run; an interrupted file is downloaded again. Different
existing files are never overwritten.

The restored layout is `data/kaggle/` for the dataset files and
`data/submission_samples.csv` for the template. The exact filenames, sizes, part
order, and checksums are recorded in [input-manifest.json](input-manifest.json).
The release also contains a copy of this manifest.

For a small download check, restore only the training table and template:

```sh
node scripts/download_inputs.cjs ./data --only kaggle/train.parquet,submission_samples.csv
```

The raw data is stored as release assets, so a normal Git clone downloads only
the notebooks, documentation, manifest, and restoration script.

| Input file | `final` | `final2` |
| --- | :---: | :---: |
| `train.parquet` | Required | Required |
| `test.parquet` | Required | Required |
| `gemini_textemb.parquet` | Required | Required |
| `bert_textemb.parquet` | — | Required |
| `lgai_textemb.parquet` | — | Required |
| `linq_textemb.parquet` | — | Required |
| `nvda_textemb.parquet` | — | Required |
| `qwen_textemb.parquet` | — | Required |
| `submission_samples.csv` | Builds its own target grid | Required |

The full input set can be attached to both notebooks. `final2` requires all eight
Parquet files in the **same directory**. Its submission template may be attached
separately. Both notebooks search under `/kaggle/input`; their preferred layout is:

```text
/kaggle/input/
├── datasets/xforecastdataset/xforecast-dataset/
│   ├── train.parquet
│   ├── test.parquet
│   ├── bert_textemb.parquet
│   ├── gemini_textemb.parquet
│   ├── lgai_textemb.parquet
│   ├── linq_textemb.parquet
│   ├── nvda_textemb.parquet
│   └── qwen_textemb.parquet
└── competitions/xforecast-challenge-kdd/
    └── submission_samples.csv
```

## Running the notebooks

1. Import either notebook into Kaggle and attach the required inputs above.
2. Enable a GPU accelerator in the session settings. The notebook metadata alone
   does not enable a GPU.
3. Use a Python environment with `torch`, `numpy`, `pandas`, `pyarrow`, and
   `scikit-learn`. The submitted notebook metadata records Python 3.12.13;
   an exact package-version lock was not supplied.
4. Execute the cells in order. The notebooks write their embedded Python modules
   into `/kaggle/working` and train the models from the raw inputs.
5. Retrieve `/kaggle/working/submission.csv` from each notebook's own session.

Use separate sessions or working directories for the two notebooks: they write
overlapping module names and the same submission filename.

`final2` also saves its named submission at:

```text
/kaggle/working/xforecast07_private_alpha080_submission/submissions/
    submission_regime_plus_xf_top3_alpha_080.csv
```

## Archive and verification

All code and Markdown cell sources are preserved from the supplied final
notebooks. Stored outputs, execution counts, execution timing, and widget state
were cleared for the repository copies; the original attachments remain intact.

Packaging checks cover notebook structure, unchanged cell sources, and local
input-file presence. Training and evaluation were not rerun, and the local input
files were not compared byte-for-byte with the original Kaggle dataset version.

These are submission archives, not a new model-selection benchmark. In
particular, `final2` uses its Private configuration for both submission blocks,
and its 2022 block is explicitly generated from in-sample predictions. Those
predictions should not be presented as independent walk-forward validation.
