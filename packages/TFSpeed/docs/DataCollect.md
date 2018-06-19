## 统计getEntries与clearResourceTimings的支持情况
根据用户上报统计结果得到

1. 不支持`performance` 0.7%
2. 支持`performance`但不支持`getEntries`占比 7.12%
3. 支持`getEntries`占比92.18%

|  平台 |支持性| 占比 |
| ------------ | ------------|------------|
|微信 | 不支持 performance | 0.7%  |
|微信 | 支持 performance | 6.9% |
|微信 | 支持 performance,getEntries| 92.08% |
|微信 | 支持 performance,getEntries,clearResourceTimings | 0.32 |
|手Q | 不支持 performance | 0.43%  |
|手Q | 支持 performance | 22.57% |
|手Q | 支持 performance,getEntries  | 75.19% |
|手Q | 支持 performance,getEntries,clearResourceTimings| 1.81% |
