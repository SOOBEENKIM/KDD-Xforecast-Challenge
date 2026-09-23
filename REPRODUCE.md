# 세 모델을 위한 최소 보관본

이 저장소의 보관 범위는 **최종 제출 노트북 2개와 대표 Chronos 노트북 1개를
원본 입력에서 다시 실행하고 수정하는 것**이다. 다른 모델의 실험 이력과
기존 실행에서 만들어진 가중치·CSV·전처리 캐시는 보관 대상에서 제외한다.

## 반드시 필요한 파일

| 모델 | 실행할 노트북 | 입력 파일 | 추가 코드 / 학습된 가중치 |
| --- | --- | --- | --- |
| Final 1 | `finx-hanyang-xforecast-final.ipynb` | `train.parquet`, `test.parquet`, `gemini_textemb.parquet` | 필요한 Python 모듈 26개가 노트북에 포함되어 있다. 처음부터 학습하므로 기존 가중치는 필요 없다. |
| Final 2 | `finx-hanyang-xforecast-final2.ipynb` | `train.parquet`, `test.parquet`, 임베딩 6종, `submission_samples.csv` | 필요한 Python 모듈 26개와 XForecast 구현이 노트북에 포함되어 있다. 처음부터 학습하므로 기존 가중치는 필요 없다. |
| Chronos | `finx-hanyang-xforecast-chronos.ipynb` | 검증용 `train.parquet`; 제출 예측용 `test.parquet`, `submission_samples.csv` | 노트북 코드로 실행한다. 공식 Chronos-Bolt-small 가중치를 지정된 revision에서 내려받는다. |

임베딩 6종은 `bert`, `gemini`, `lgai`, `linq`, `nvda`, `qwen`의
`*_textemb.parquet`이다. 모델별 필수 입력, 노트북 해시, 설치 파일과 생성물
구분은 [model-inputs.json](model-inputs.json)에 기록되어 있다.

입력은 이미 [GitHub Release](https://github.com/SOOBEENKIM/KDD-Xforecast-Challenge/releases/tag/competition-inputs-2026-09-23)에
보관한 공통 데이터에서 받는다. 모델별로 중복 복사할 필요가 없다.
`submission_samples.csv`는 반드시 보관할 **입력 양식**이고, 실행 후 만들어지는
`submission.csv`는 다시 생성할 수 있는 **출력**이다.

## 다운로드 및 실행

Node.js 18 이상에서 저장소를 받고 입력을 복원한다.

```sh
git clone https://github.com/SOOBEENKIM/KDD-Xforecast-Challenge.git
cd KDD-Xforecast-Challenge
node scripts/download_inputs.cjs ./data
```

한 모델만 실행할 때는 필요한 파일만 받을 수 있다.

```sh
# Final 1
node scripts/download_inputs.cjs ./data --only kaggle/train.parquet,kaggle/test.parquet,kaggle/gemini_textemb.parquet

# Final 2
node scripts/download_inputs.cjs ./data --only kaggle/train.parquet,kaggle/test.parquet,kaggle/bert_textemb.parquet,kaggle/gemini_textemb.parquet,kaggle/lgai_textemb.parquet,kaggle/linq_textemb.parquet,kaggle/nvda_textemb.parquet,kaggle/qwen_textemb.parquet,submission_samples.csv

# Chronos
node scripts/download_inputs.cjs ./data --only kaggle/train.parquet,kaggle/test.parquet,submission_samples.csv
```

### Final 1 / Final 2

- Jupyter 환경에서 PyTorch를 하드웨어에 맞게 설치한 뒤
  `pip install -r requirements-final.txt`로 나머지 의존성을 설치한다.
  [공식 PyTorch 이전 버전 설치 안내](https://pytorch.org/get-started/previous-versions/)에서
  2.4.1에 해당하는 CPU/CUDA 설치 명령을 선택할 수 있다.
- 원본 노트북은 Kaggle 경로를 사용한다. 가장 직접적인 실행 방법은 각각을
  Kaggle의 **새 세션**에 올리고 GPU를 활성화한 뒤 입력 데이터셋을 연결하는 것이다.
  로컬에서는 같은 경로를 제공하거나 노트북의 경로 설정을 변경해야 한다.
- `train.parquet`, `test.parquet`, 필요한 임베딩을 같은 입력 폴더에 둔다.
  Final 2의 제출 양식은 별도 입력 폴더에 있어도 된다. 자세한 경로는
  [README의 실행 방법](README.md#running-the-notebooks)을 따른다.
- 위에서부터 셀을 실행한다. 노트북이 소스 파일과 전처리 파일을 만들고
  학습한 뒤 자체 작업 폴더에 `submission.csv`를 생성한다.

두 모델은 **별도의 빈 작업 폴더/세션**을 사용한다. 특히 기존 `features/`,
`xforecast_top3_panel.parquet`, `result/weight/baseline_compstate_backup.pt`를
옮겨 놓지 않는다. 마지막 파일은 필수 입력이 아니라 과거 설정을 덮어쓸 수 있는
선택적 파일이다. 없으면 노트북에 정의된 `char_lookback=252`, `corr_win=63`을 사용한다.

`requirements-final.txt`는 모든 내장 모듈의 import를 확인한 시작 환경이다.
원래 제출 당시의 정확한 패키지 버전 기록은 제공되지 않았고, 이 환경에서 두 모델의
전체 재학습은 아직 수행하지 않았다.

### Chronos

- Python 3.11과 하드웨어에 맞는 PyTorch 2.4.1을 준비하고
  `pip install -r requirements-chronos.txt`를 실행한다.
- 저장소 폴더에서 노트북을 열면 `./data`의 입력을 찾는다. Kaggle에서는
  `/kaggle/input`을 검색한다. 필요한 경우 `DATA_DIR`, `TEMPLATE_PATH`를 지정한다.
- 최초 실행에는 공식 사전학습 모델 다운로드를 위한 인터넷 연결이 필요하다.
  사용 모델은 `amazon/chronos-bolt-small`, revision은
  `772f3d25d38aec6d914c8949dab4462e2d46f5d8`이다.
- [공식 모델 snapshot](https://huggingface.co/amazon/chronos-bolt-small/tree/772f3d25d38aec6d914c8949dab4462e2d46f5d8)은
  GitHub의 대회 입력 아카이브와 별개다. 코드가 다시 내려받으므로 워크스테이션의
  Hugging Face 캐시는 필수 보관 대상이 아니다. 오프라인 실행에는 별도로 받은
  snapshot 폴더를 `MODEL_PATH`로 지정한다.

## 보관하지 않아도 되는 로컬 파일

이번 세 모델을 원본부터 다시 실행하는 목적에서는 다음 파일이 추가로 필요하지 않다.

- 학습으로 생성한 `.pt`, `.pth`, checkpoint와 `submission.csv` 등의 예측 결과
- `features/`, `.pkl`, `.npz`, 파생 Parquet 등 전처리·피처 캐시
- 실행 로그, 임시 파일, `__pycache__`, 가상환경 및 컨테이너 자체
- 다른 모델의 스크립트·노트북·실험 기록·결과와 중복 ZIP

대회 **원본** Parquet와 `submission_samples.csv`는 이 제외 목록에 해당하지 않으며,
이미 GitHub Release에 보관되어 있다. 기존 `results.zip`도 모델 실행의 필수 입력은 아니다.

## 확인한 범위

- 세 노트북의 모든 코드 셀을 문법 검사했다. 두 최종 노트북에서 각각 26개 모듈을
  빈 임시 폴더에 생성해 모두 import했고, 누락된 내부 모듈이 없음을 확인했다.
  [의존성 점검 기록](archive/dependency-audit.json)
- 입력 원본 19개의 52개 release 조각이 모두 업로드되어 있고 크기·SHA-256이
  manifest와 일치하는지 다시 확인했다. [Release 점검 기록](archive/input-release-verification.json)
- Chronos는 모든 실행 셀을 실행해 과거 3개 검증 구간과 52,000행 CSV 생성을 확인했다.
  [실행 기록](archive/chronos/verification.json)
- 최종 제출 두 개의 전체 재학습 및 당시 예측값과의 일치 검증은 하지 않았다.

**파일 의존성 점검상, 이 세 모델의 재실행·개발을 위해 추가로 보관해야 할
워크스테이션 전용 코드나 입력 파일은 발견되지 않았다.** 저장소와 Releases를
다시 받고 필요한 패키지·Chronos 모델을 설치하는 방식으로 작업을 이어갈 수 있다.
