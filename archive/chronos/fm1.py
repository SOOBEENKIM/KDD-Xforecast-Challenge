import pandas as pd, numpy as np, torch
from sklearn.metrics import roc_auc_score
import warnings; warnings.filterwarnings('ignore')
from chronos import BaseChronosPipeline
D='data/kaggle/'
te=pd.read_parquet(D+'test.parquet'); te['date']=pd.to_datetime(te['date'])
df=te.sort_values(['ticker','date']).reset_index(drop=True)
g=df.groupby('ticker',sort=False)
df['ret20']=g['close'].shift(-20)/df['close']-1
df['up']=np.where(df['ret20']>0,1.0,0.0); df.loc[df['ret20'].isna()|(df['ret20']==0),'up']=np.nan
df['tyear']=pd.to_datetime(g['date'].shift(-20)).dt.year
med=df.groupby('date')['ret20'].transform('median')
df['rel_up']=np.where(df['ret20']>med,1.0,0.0); df.loc[df['ret20'].isna(),'rel_up']=np.nan
C=256
ctx=np.zeros((len(df),C),dtype=np.float32); OK=np.zeros(len(df),dtype=bool)
for t,gi in df.groupby('ticker',sort=False).indices.items():
    gi=np.sort(gi); c=df['close'].values[gi]
    for pos in range(C,len(gi)):
        ctx[gi[pos]]=c[pos-C+1:pos+1]
    OK[gi[C:]]=True
val=OK&df['up'].notna()&df['rel_up'].notna()&df['tyear'].isin([2021,2022]).values
sub=df[val].copy(); X=ctx[val]
print("instances:",len(sub),flush=True)
pipe=BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small",device_map="cuda:0",torch_dtype=torch.bfloat16)
qs=np.arange(0.05,0.96,0.05)
pups=[]
for b in range(0,len(X),256):
    q,_=pipe.predict_quantiles(inputs=torch.tensor(X[b:b+256]),prediction_length=20,quantile_levels=list(qs))
    last=q[:,-1,:].float().numpy()          # (B, n_q) 20일째 가격 분포 분위수
    anchor=X[b:b+256,-1][:,None]
    pups.append((last>anchor).mean(axis=1)) # 분위수 중 앵커 위 비율 ≈ P(up)
    if b%5120==0: print(b,flush=True)
p=np.concatenate(pups); sub['p']=p
for y_ in (2021,2022):
    m=sub['tyear']==y_
    yu=sub.loc[m,'up']; yrl=sub.loc[m,'rel_up']; pp=sub.loc[m,'p']
    hit=((pp>=0.5).astype(float)==yu).mean()
    print(f"[Chronos-Bolt] val={y_}: AUC(up)={roc_auc_score(yu,pp):.4f} AUC(rel)={roc_auc_score(yrl,pp):.4f} hit@0.5={hit:.4f} base={yu.mean():.4f}",flush=True)
    o=np.argsort(pp.values); k=500
    print(f"   하락콜{k}정밀={1-yu.values[o[:k]].mean():.4f} 기준={1-yu.mean():.4f}",flush=True)
