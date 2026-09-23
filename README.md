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
Raw data, model weights, and generated predictions are not included in this repository.

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
