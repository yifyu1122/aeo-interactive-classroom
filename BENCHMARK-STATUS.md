# AEO 論文 f1–f31 基準函數追蹤

本表依 Zhao, Wang, and Zhang (2020) 第 3 節 Tables 1–4 核對。PDF 中的分類、維度、範圍與最佳值已逐頁視覺檢查：印刷頁碼 9392（f1–f23）及 9393（f24–f31）。公式可在網站函數目錄查閱；下表記錄執行狀態與阻礙。

## 執行狀態

| 論文函數 | 類別／名稱 | 維度 | 搜尋範圍 | 論文最佳值 | 公式與資料狀態 | 執行／數學驗證 |
|---|---|---:|---|---:|---|---|
| f1 | 單峰：Sphere | 30 | [-100,100]³⁰ | 0 | `Σxᵢ²` | 可執行；零點、維度、固定 Seed 已測 |
| f2 | 單峰：Schwefel 2.22 | 30 | [-10,10]³⁰ | 0 | `Σ|xᵢ| + Π|xᵢ|` | 可執行；零點已測 |
| f3 | 單峰：Schwefel 1.2 | 30 | [-100,100]³⁰ | 0 | `Σᵢ(Σⱼ≤ᵢxⱼ)²` | 可執行；零點已測 |
| f4 | 單峰：Schwefel 2.21 | 30 | [-100,100]³⁰ | 0 | `maxᵢ|xᵢ|` | 可執行；零點已測 |
| f5 | 單峰：Rosenbrock | 30 | [-30,30]³⁰ | 0 | 標準相鄰座標 Rosenbrock 式 | 可執行；全 1 最佳點已測 |
| f6 | 單峰：Step | 30 | [-100,100]³⁰ | 0 | `Σ(xᵢ+0.5)²` | 可執行；全 −0.5 最佳點已測 |
| f7 | 單峰：Quartic | 30 | [-1.28,1.28]³⁰ | 0 | `Σi·xᵢ⁴ + random[0,1)`；需定義與 AEO Seed 分離的評估噪聲流 | 暫不執行；避免不可重現或偷偷消除論文噪聲 |
| f8 | 多峰：Schwefel | 30 | [-500,500]³⁰ | −12569.5 | `−Σxᵢsin(√|xᵢ|)` | 可執行；常見近似最優點已核對，值與表列四捨五入值相符 |
| f9 | 多峰：Rastrigin 平方項 | 30 | [-5.12,5.12]³⁰ | 0 | `Σ[xᵢ²−10cos(2πxᵢ)+10]²`；照原論文逐維平方 | 可執行；原點及非零座標辨別性測試已通過 |
| f10 | 多峰：Ackley | 30 | [-32,32]³⁰ | 0 | Ackley 式，均方根項與平均 cosine 項 | 可執行；原點已測 |
| f11 | 多峰：Griewank（平移 100） | 30 | [-600,600]³⁰ | 0 | 論文式中的 `xᵢ−100` 與 `cos((xᵢ−100)/√i)` | 可執行；全 100 最佳點已測 |
| f12 | 多峰：Penalized 1 | 30 | [-50,50]³⁰ | 0 | 含 `yᵢ=1+(xᵢ+1)/4` 與 `u(xᵢ;10,100,4)` | 可執行；全 −1 最佳點已測 |
| f13 | 多峰：Penalized 2 | 30 | [-50,50]³⁰ | 0 | 含 `u(xᵢ;5,10,4)`；高解析原頁已確認懲罰係數 k=10 | 可執行；全 1 最佳點與越過懲罰門檻的 x=6 數值已測 |
| f14 | 低維：Shekel’s Foxholes | 2 | [-65.536,65.536]² | 0.998 | 5×5 網格 `a₁,a₂ ∈ {-32,-16,0,16,32}` | 可執行；文獻常見最小點附近得到 0.99800384，符合論文四捨五入值 |
| f15 | 低維：Kowalik | 4 | [-5,5]⁴ | 3.0759×10⁻⁴ | 使用已發表的 11 筆 `aᵢ` 及 `bᵢ⁻¹` 表，程式以倒數轉成公式中的 `bᵢ` | 可執行；已知最佳點近似值計算為 3.07495×10⁻⁴，符合論文精度 |
| f16 | 低維：Six-Hump Camel | 2 | [-5,5]² | −1.0316 | 論文多項式式 | 可執行；已知最小點數值測試通過 |
| f17 | 低維：Branin | 2 | [-5,10]×[0,15] | 0.398 | 公式可直接實作，但目前共用引擎只有單一上下界，不能表達逐維矩形範圍 | 暫不執行；需先支援逐維 bounds |
| f18 | 低維：Goldstein–Price | 2 | [-2,2]² | 3 | 高解析原頁第二乘項印為 `(2x₁+1−3x₂)²`，但該式與表列最佳值 3 不一致（在標準 Goldstein–Price 最佳點 `(0,−1)` 會得到 −18） | 暫不執行；保留原文與最佳值矛盾，未自行改成常見版本 |
| f19 | 低維：Hartman 3 | 3 | [0,1]³ | −3.86 | 使用公開 benchmark 的 α、A、P 係數表 | 可執行；已知最佳位置算得 −3.862782，符合論文表列精度 |
| f20 | 低維：Hartman 6 | 6 | [0,1]⁶ | −3.322 | 使用公開 benchmark 的 α、A、P 係數表 | 可執行；已知最佳位置算得 −3.322368，符合論文表列精度 |
| f21 | 低維：Shekel 5 | 4 | [0,10]⁴ | −10.1532 | 使用公開的前 5 列中心 `aᵢ` 與 `cᵢ` 常數表 | 可執行；(4,4,4,4) 算得 −10.153196 |
| f22 | 低維：Shekel 7 | 4 | [0,10]⁴ | −10.4028 | 使用公開的前 7 列中心 `aᵢ` 與 `cᵢ` 常數表 | 可執行；(4,4,4,4) 算得 −10.402819 |
| f23 | 低維：Shekel 10 | 4 | [0,10]⁴ | −10.5364 | 使用公開的 10 列中心 `aᵢ` 與 `cᵢ` 常數表 | 可執行；(4,4,4,4) 算得 −10.536284，與表列四捨五入值相符 |
| f24 | 複合：Composition 1（N=5） | 30 | [-100,100]³⁰ | 2300 | 對應 CEC’14 composition F23；需要官方 shift、rotation 及分量參數 | 暫不執行；未複製外部資料 |
| f25 | 複合：Composition 2（N=3） | 30 | [-100,100]³⁰ | 2400 | 對應 CEC’14 composition F24；需要官方資料 | 暫不執行；未複製外部資料 |
| f26 | 複合：Composition 3（N=3） | 30 | [-100,100]³⁰ | 2500 | 對應 CEC’14 composition F25；需要官方資料 | 暫不執行；未複製外部資料 |
| f27 | 複合：Composition 4（N=5） | 30 | [-100,100]³⁰ | 2600 | 對應 CEC’14 composition F26；需要官方資料 | 暫不執行；未複製外部資料 |
| f28 | 複合：Composition 5（N=5） | 30 | [-100,100]³⁰ | 2700 | 對應 CEC’14 composition F27；需要官方資料 | 暫不執行；未複製外部資料 |
| f29 | 複合：Composition 6（N=5） | 30 | [-100,100]³⁰ | 2800 | 對應 CEC’14 composition F28；需要官方資料 | 暫不執行；未複製外部資料 |
| f30 | 複合：Composition 7（N=3） | 30 | [-100,100]³⁰ | 2900 | 對應 CEC’14 composition F29；需要官方資料 | 暫不執行；未複製外部資料 |
| f31 | 複合：Composition 8（N=3） | 30 | [-100,100]³⁰ | 3000 | 對應 CEC’14 composition F30；需要官方資料 | 暫不執行；未複製外部資料 |

**目前可由共用引擎執行：** f1–f6、f8–f16、f19–f23，共 20 題。f7、f17–f18、f24–f31 共 11 題仍停用。函數目錄中的停用卡片只作公式與設定說明，不會被其他函數替代。

## 函數接入與測試

公式集中於 `benchmark-functions.js`，以無 DOM 的 evaluator 匯出，`benchmarks.js` 負責註冊至同一個 AEO Registry 和介面。`tests.cjs` 對目前接入函數核對維度、範圍／最佳值 metadata、固定 Seed 重現性與已知最佳點；表列最佳值精度較低的函數採符合來源有效位數的容差。f14 的網格、f15 的擬合資料、f19–f20 的 Hartmann 係數與 f21–f23 的 Shekel 係數均有公開來源，連結列於下方；測試以文獻最佳點附近向量核對計算值。

f9 有一處重要修正：論文 Table 2 印刷頁 9392 寫的是逐維項平方後求和。它與常見未平方的標準 Rastrigin 不相同；測試用 `x=0.5` 驗證該維貢獻為 `20.25² = 410.0625`，防止退回錯誤公式。高解析視覺核對也修正了 f13 的懲罰係數，確認論文是 `u(xᵢ;5,10,4)` 而非常見轉錄的 `u(xᵢ;5,100,4)`。

## CEC’14 來源與限制

原論文參考文獻 [81]：J. J. Liang, B. Y. Qu, and P. N. Suganthan, “Problem Definitions and Evaluation Criteria for the CEC 2014 Special Session and Competition on Single Objective Real-Parameter Numerical Optimization,” Technical Report, Computational Intelligence Laboratory, Zhengzhou University and Nanyang Technological University, 2013。技術報告列出標準 CEC’14 的 30 個函數（F1–F30）；AEO 論文的 f24–f31 是 Composition 1–8，最佳值 2300–3000，對應 CEC 編號 F23–F30，不能因編號相差 1 就直接套用簡化位移公式。

CEC 正式問題定義：[Zhengzhou University CEC’14 technical report](https://www5.zzu.edu.cn/__local/A/69/BC/D3B5DFE94CD2574B38AD7CD1D12_C802DAFE_BC0C0.pdf?e=.pdf)；官方活動頁面：[CEC 2014 Real-Parameter Numerical Optimization](https://www5.zzu.edu.cn/ecilab/info/1036/1070.htm)。官方報告規定 shift vector、rotation matrices、component scaling 與 bias；程式尚未下載或複製這些係數檔。已找到的正式程式鏡像沒有明確的資料授權檔可供核實，因此本次不匯入其資料檔。使用者未授權安裝套件，也未變更系統環境。

## 參考資料

1. W. Zhao, L. Wang, and Z. Zhang, “Artificial ecosystem-based optimization: a novel nature-inspired meta-heuristic algorithm,” *Neural Computing and Applications*, vol. 32, no. 13, pp. 9383–9425, Jul. 2020. DOI: [10.1007/s00521-019-04452-x](https://doi.org/10.1007/s00521-019-04452-x)。PDF 核對日期：2026-11-26。
2. J. J. Liang, B. Y. Qu, and P. N. Suganthan, “Problem Definitions and Evaluation Criteria for the CEC 2014 Special Session and Competition on Single Objective Real-Parameter Numerical Optimization,” Technical Report, Computational Intelligence Laboratory, Zhengzhou University and Nanyang Technological University, 2013. [技術報告](https://www5.zzu.edu.cn/__local/A/69/BC/D3B5DFE94CD2574B38AD7CD1D12_C802DAFE_BC0C0.pdf?e=.pdf)。瀏覽日期：2026-11-26。
3. Ali R. Al-Roomi (2015), “Shekel’s Foxholes Function,” *Unconstrained Single-Objective Benchmark Functions Repository*. [函數定義與係數網格](https://www.al-roomi.org/benchmarks/unconstrained/2-dimensions/7-shekel-s-foxholes-function)。瀏覽日期：2026-11-26。
4. T. P. Runarsson and X. Yao, “Continuous Selection and Self-Adaptive Evolution Strategies,” §V（Kowalik 函數係數與最佳點）。[論文 PDF](https://scispace.com/pdf/continuous-selection-and-self-adaptive-evolution-strategies-4pnowmrtxz.pdf)。瀏覽日期：2026-11-26。
5. M. Schonlau, *Computer Experiments and Global Optimization*, §4.4.3, Table 4.3（Hartmann 6 係數）；[論文 PDF](https://www.schonlau.net/publication/thesis1side.pdf)。瀏覽日期：2026-11-26。
6. M. A. Ivorra, “A Collection of Benchmark Global Optimization Test Problems,” Appendix B, Table B.13（Shekel 5/7/10 係數）；[論文 PDF](https://wiredspace.wits.ac.za/server/api/core/bitstreams/b1e07e69-e41c-41a9-b679-790e6813cbfd/content)。瀏覽日期：2026-11-26。
7. Hartmann 3 公式、係數與已知最佳點：[BenchmarkFcns documentation](https://benchmarkfcns.info/generated/benchmarkfcns.hartmann3.html)。瀏覽日期：2026-11-26。
