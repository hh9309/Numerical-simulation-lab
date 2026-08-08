import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Activity, 
  HelpCircle, 
  Compass, 
  ChevronRight, 
  Binary, 
  Hash, 
  Maximize2,
  Code2,
  Scale,
  Cpu
} from 'lucide-react';
import { MathComponent, LatexText } from './MathRenderer';

interface DocSlice {
  id: string;
  title: string;
  subTitle: string;
  badge: string;
  badgeColor: string;
  intro: string;
  formula: string;
  formulaDesc: string;
  steps: string[];
  codeSnippet: string;
  errorAnalysis: {
    truncation: string;
    roundoff: string;
    stiffness: string;
  };
  industrialApp: {
    title: string;
    desc: string;
  };
}

const DOCUMENT_SLICES: DocSlice[] = [
  {
    id: 'root',
    title: '非线性逼近与根搜索',
    subTitle: 'Section 01 · 零点迭代解法与压缩映射',
    badge: 'Roots',
    badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    intro: '在动力学平衡态分析中，连续流形常表示为非线性隐式方程 $f(x) = 0$。求解其零点是离散物理学中最底层的事物。通过构造压缩映射序列，在极限尺度下逼近精确解析根。',
    formula: 'x_{k+1} = x_k - \\frac{f(x_k)}{f\'(x_k)}',
    formulaDesc: '牛顿-拉夫逊 (Newton-Raphson) 局部切线迭代算子。每次迭代具有二阶二次收敛性，即 $e_{k+1} \\approx C \\cdot e_k^2$。',
    steps: [
      '确定包含单根的初值区间 $[a, b]$ 确保 $f(a) \\cdot f(b) < 0$。',
      '二分法 (Bisection): 逐步分半区间，保证线性收敛性，绝对可靠。',
      '牛顿法 (Newton): 沿切线方向发射探测步。当初始点偏离算子收敛域（如驻点、拐点、极值点）时易发生奇异漂移和混沌发散。'
    ],
    codeSnippet: `// 经典牛顿-拉夫逊单步迭代核心结构
function newtonStep(xCurr: number, f: (x: number) => number, df: (x: number) => number) {
  const slope = df(xCurr);
  if (Math.abs(slope) < 1e-12) {
    throw new Error("导数过小，切线趋于水平导致分母奇异！");
  }
  return xCurr - f(xCurr) / slope;
}`,
    errorAnalysis: {
      truncation: '二分法阶段截断绝对收敛，第 $n$ 步误差界限为 $(b - a)/2^n$；牛顿法只要初值条件处于超收敛半径内，就单调呈指数级逼近。',
      roundoff: '极度逼近真实的机底极限 $\\epsilon$ (IEEE-754 约为 2.22e-16) 时，函数值浮点噪声大于真实变化值，从而发生随机零点截断极值阻滞。',
      stiffness: '当物理边界具有大偏导数（Stiffness 陡峭梯度）时，切线导数急剧变化，迭代路径会形成周期振荡或逃逸出安全边界。'
    },
    industrialApp: {
      title: '流动力学热力平衡方程 (EOS)',
      desc: '在航空航天流体力学中，用于求解真实气体状态方程（如范德华尔斯方程、Peng-Robinson 状态方程）计算指定温度与压力下的相律体积分，指导推进管内的能量喷射。'
    }
  },
  {
    id: 'integration',
    title: '离散积分与微元累积',
    subTitle: 'Section 02 · 黎曼求和与高阶泰勒辛普森求积',
    badge: 'Integral',
    badgeColor: 'text-blue-600 bg-blue-50 border-blue-100',
    intro: '离散物理学通过将时空划分为有限微元 $dt$、$dx$，以代数累加代替连续黎曼积分。这是非均匀受力作功、引力势能、离散概率通量等一切累积物理量的核心机制。',
    formula: 'S = \\int_{a}^{b} f(x) dx \\approx \\sum_{i=1}^{n} w_i f(x_i)',
    formulaDesc: '标准代数数值方差积分格式。其中梯形积分为 $w = [h/2, h, \\dots, h/2]$；辛普森积分为 $w = [h/3, 4h/3, 2h/3, \\dots, h/3]$。',
    steps: [
      '对总积分区间进行 $n$ 等分均匀离散，获得基本微元步长 $h = (b - a) / n$。',
      '梯形公式 (Trapezoid): 将每个单元视为一阶线性截面，通过两个边界值取均值计算，局部截断误差 $O(h^3)$。',
      '辛普森公式 (Simpson): 使用抛物二次曲线自适应拟合三点截面，奇妙地对三次高阶多项式仍能达到理论无误差精度（代数精度 3 次）。'
    ],
    codeSnippet: `// 复合辛普森 (Simpson 1/3) 数值积分算法
function simpsonSum(a: number, b: number, n: number, f: (x: number) => number) {
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0) ? 2 * f(x) : 4 * f(x);
  }
  return (h / 3) * sum;
}`,
    errorAnalysis: {
      truncation: '复合梯形精度为 $O(h^2)$，复合辛普森精度为 $O(h^4)$。随着划分微元增多，积分精度随步长呈四次幂单调陡峭降低。',
      roundoff: '当划分极其细密（如 $n > 10^7$）时，微小的单步浮点数大数吃小数（Loss of Significance）会使舍入误差超过截断精度。',
      stiffness: '在急剧振荡脉冲（如震荡电荷激发）或奇异边界积分处，固定的步长累积会被极大漏项，必须引入自适应步长黎曼法。'
    },
    industrialApp: {
      title: '有限体积元结构载荷仿真',
      desc: '土木工程及桥梁力学设计中，通过对截面应力张量和自重载荷分布进行密集的高阶定积分，测算出受力支撑主梁的危险弯矩折点与疲劳寿命。'
    }
  },
  {
    id: 'ode',
    title: '常微分方程经典沙盒',
    subTitle: 'Section 03 · 动力学演化与龙格-库塔高精度推进',
    badge: 'Dynamics',
    badgeColor: 'text-amber-600 bg-amber-50 border-amber-100',
    intro: '经典动力学（单摆、天体轨道、火箭弹道）本质都是描述系统对时间的斜率变化 $dy/dt = f(t, y)$。ODE 算子在时间轴上自适应地开辟状态推进路径，实现全时变模拟。',
    formula: 'y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)',
    formulaDesc: '经典四阶龙格-库塔 (RK4) 推导公式。其基于时间节点内多个采样点的斜率加权，实现了四阶代数精度：局部截断误差为 $O(dt^5)$，全局精度为 $O(dt^4)$。',
    steps: [
      '状态离散化：将位置和速度合并为一阶高维系统状态向量 $Y = [\\theta, \\omega]^T$。',
      '导数斜率预测：在当前时间步中，分别计算四个不同时间节点（起点、半步中点、另半步中点、终点）的斜率 $k_1, k_2, k_3, k_4$。',
      '精确加权迭代：利用 Simpson 1/3 加权算子合并四个斜率进行下一步状态更新推进，在极小步长下获得优异动力稳定性。'
    ],
    codeSnippet: `// 经典四阶龙格-库塔单步推进
function rungeKutta4Step(t: number, y: number[], dt: number, f: (t: number, y: number[]) => number[]) {
  const k1 = f(t, y);
  const y2 = y.map((v, i) => v + 0.5 * dt * k1[i]);
  const k2 = f(t + 0.5 * dt, y2);
  const y3 = y.map((v, i) => v + 0.5 * dt * k2[i]);
  const k3 = f(t + 0.5 * dt, y3);
  const y4 = y.map((v, i) => v + dt * k3[i]);
  const k4 = f(t + dt, y4);
  
  return y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}`,
    errorAnalysis: {
      truncation: '显式欧拉推进局部截断误差为 $O(dt^2)$，RK4 则是高度强劲的五阶 $O(dt^5)$，全局累积误差限收敛于四阶 $O(dt^4)$。',
      roundoff: '在长效动力学推进中（如多星体动力轨迹），重复时间步累加会导致机底微小舍入误差呈扩散式漂移。',
      stiffness: '对于具有大差异特征绝对值的刚性方程组（Stiffness），显式推进必须采用极其微小的稳定步长，否则计算会完全崩塌。'
    },
    industrialApp: {
      title: '多自由度航天器轨道控制与动力学仿真',
      desc: '在深空探测和近地卫星变轨控制中，计算发动机变推力冲量作用下，航天器高维状态转移轨道的实时演化与对准定位。'
    }
  },
  {
    id: 'montecarlo',
    title: '蒙特卡洛统计与高维概率',
    subTitle: 'Section 04 · 随机采样与大数定律求积',
    badge: 'MonteCarlo',
    badgeColor: 'text-rose-600 bg-rose-50 border-rose-100',
    intro: '蒙特卡洛（Monte Carlo）是一种不依赖于几何网格划分的随机概率积分思想。其通过海量无规高频随机采样（投点），以随机涌现的概率渐近收敛于完美精确解。',
    formula: '\\lim_{N \\to \\infty} P\\left( \\left| \\frac{n}{N} - S \\right| < \\epsilon \\right) = 1',
    formulaDesc: '贝努利大数定律在积分求解中的物理映射。其平均积分误差收敛速度恒为 $O(1/\\sqrt{N})$，与高维空间维数完全无关。',
    steps: [
      '基于线性同余或梅森旋转算法在特定网格区间内投射高密度伪随机点。',
      '设置几何边界过滤器：针对每个投射坐标，执行解析方程几何状态穿透判定（如是否处于积分目标单元内）。',
      '概率汇总：计算通过判定点占总投射点数的比例，自适应折合乘数空间代数积分。'
    ],
    codeSnippet: `// 蒙特卡洛求圆面积（比值π估算）
function monteCarloPi(totalPoints: number) {
  let insideCount = 0;
  for (let i = 0; i < totalPoints; i++) {
    const x = Math.random() * 2 - 1; // [-1, 1]
    const y = Math.random() * 2 - 1;
    if (x*x + y*y <= 1.0) {
      insideCount++;
    }
  }
  const ratio = insideCount / totalPoints;
  return ratio * 4.0; // 整个 2x2 矩形区域面积为 4
}`,
    errorAnalysis: {
      truncation: '蒙特卡洛不存在传统网格划分产生的截断误差。其精度受概率不确定度支配：误差减小 10 倍，运算投点总数必须陡峭增加 100 倍。',
      roundoff: '单精度或双精度浮点发生器在大容量点列下的舍入误差基本服从均值极小的正态累积，对统计收敛曲线影响极微。',
      stiffness: '经典伪随机数在发生巨大重叠周期时具有相关退化（Lattice Effect），通常需要低偏差混沌序列（Sobol 序列）解决聚类漂移。'
    },
    industrialApp: {
      title: '高维中子动力输运与期权定价',
      desc: '应用于国家核工业反应堆堆芯挡板的中子慢化屏蔽厚度计算、以及华尔街复杂奇异衍生品在高维随机游走模型中的路径资产期望计算。'
    }
  },
  {
    id: 'matrix',
    title: '残矩阵离散与线性求解',
    subTitle: 'Section 05 · 偏微分空间离散与松弛迭代代数法',
    badge: 'Matrix',
    badgeColor: 'text-slate-700 bg-slate-50 border-slate-200',
    intro: '本方案将抽象的线性方程组 $Ax = b$ 求解过程转化为直观的物理交互体验：',
    formula: 'u_{i,j}^{k+1} = (1-\\omega)u_{i,j}^k + \\frac{\\omega}{4}(u_{i+1,j}^k + u_{i-1,j}^{k+1} + u_{i,j+1}^k + u_{i,j-1}^{k+1})',
    formulaDesc: '超松弛迭代 (SOR) 自适应网格局部更新格式。通过松弛增量因子 ω ∈ (1, 2)，跳跃逼近特征向量，能够成倍加速稳态收敛。',
    steps: [
      '三维地形寻迹：将目标函数 $F(x)$ 渲染为动态曲面。解向量 $x$ 表现为沿梯度方向滚动的小球，实时演示雅可比、梯度下降或共轭梯度法的收敛路径。',
      '残差动态瀑布：右侧实时呈现残差 $r = b - Ax$ 的动态柱状图，随迭代过程由红（误差大）至绿（收敛）渐变，通过视觉反馈量化收敛进度。'
    ],
    codeSnippet: `// 加速迭代二维稳态 Laplacian 多层松弛核心
function gaussSeidelRelaxation(grid: number[][], omega: number) {
  const rows = grid.length;
  const cols = grid[0].length;
  let maxDelta = 0;
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const oldVal = grid[r][c];
      const newVal = 0.25 * (grid[r+1][c] + grid[r-1][c] + grid[r][c+1] + grid[r][c-1]);
      // 超松弛反馈
      const relaxedVal = (1 - omega) * oldVal + omega * newVal;
      grid[r][c] = relaxedVal;
      maxDelta = Math.max(maxDelta, Math.abs(relaxedVal - oldVal));
    }
  }
  return maxDelta;
}`,
    errorAnalysis: {
      truncation: '空间截断误差取决于空间微分格式，二阶中心差分格式的截断阶满足 O(Δx² + Δy²)。减半空间网格粒度，截断残差可缩减至 1/4。',
      roundoff: '由于在大矩阵求解中需要进行极高频率的重复数值相加，极易积累产生有限字长舍入漂移。',
      stiffness: '如果材料属性或边界条件等物理通量具有瞬态阶跃突变，导致矩阵主方差谱半径收敛趋于僵滞。'
    },
    industrialApp: {
      title: '飞行器热防护罩与静电场仿真',
      desc: '用于求解高超音速耐热瓦超高温非稳态流变热辐射分布，以及深亚微米绝缘介质的稳态势场求解。'
    }
  }
];

interface AlgorithmDocsSlicesProps {
  activeSandbox: 'root' | 'integration' | 'ode' | 'montecarlo' | 'matrix';
}

export default function AlgorithmDocsSlices({ activeSandbox }: AlgorithmDocsSlicesProps) {
  const [selectedTabId, setSelectedTabId] = useState<string>('root');
  const [showCode, setShowCode] = useState<boolean>(true);

  // Sync state tab automatically based on user selecting different upper sandboxes
  useEffect(() => {
    setSelectedTabId(activeSandbox);
  }, [activeSandbox]);

  const activeSlice = DOCUMENT_SLICES.find(item => item.id === selectedTabId) || DOCUMENT_SLICES[0];

  return (
    <div id="quick-guide" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[520px]">
      
      {/* Left Navigation: Documents slices list */}
      <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-150 bg-slate-50/50 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-2 px-1">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">LIBRARY INDEX</h4>
            <span className="text-sm font-bold text-slate-800">计算知识切片</span>
          </div>
        </div>
        
        <p className="text-[11px] text-slate-450 leading-normal px-1 mb-2">
          数值仿真的本质是以「离散逼近连续，用代数逼近解析」。下方为本平台5大物理分支的核心算法切片，随时支持实时沙盒联动。
        </p>

        {/* Channels/Tabs list */}
        <div className="flex flex-col gap-1.5">
          {DOCUMENT_SLICES.map((slice) => {
            const isActive = slice.id === selectedTabId;
            return (
              <button
                key={slice.id}
                id={`btn-doc-tab-${slice.id}`}
                onClick={() => setSelectedTabId(slice.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-150 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                      isActive 
                        ? 'bg-indigo-700 border-indigo-500 text-indigo-100' 
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {slice.badge}
                    </span>
                    <span className="text-xs font-extrabold tracking-tight truncate">
                      {slice.title}
                    </span>
                  </div>
                  <span className={`text-[10px] mt-1 truncate ${isActive ? 'text-indigo-200' : 'text-slate-400 font-mono'}`}>
                    {slice.subTitle.split('·')[0]}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-indigo-100 translate-x-0.5' : 'text-slate-350 group-hover:translate-x-0.5'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Sync hint */}
        <div className="mt-auto pt-4 border-t border-slate-150/50 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>正在与上方仿真沙盒数据总线保持连接...</span>
        </div>
      </div>

      {/* Right Content display: interactive details panel */}
      <div className="flex-1 p-5 sm:p-7 flex flex-col gap-6 bg-white shrink-0">
        
        {/* Active Title slice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit font-mono ${activeSlice.badgeColor}`}>
              模块切片 0{DOCUMENT_SLICES.indexOf(activeSlice) + 1} · {activeSlice.subTitle}
            </span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              {activeSlice.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-snippet"
              onClick={() => setShowCode(!showCode)}
              className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-1.5 px-3.5 rounded-lg border border-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showCode ? '隐藏核心 TS 算子' : '展示核心 TS 算子'}
            </button>
          </div>
        </div>

        {/* Main interactive area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left info body */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div>
              <h5 className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase mb-1.5">物理图景与离散背景</h5>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <LatexText text={activeSlice.intro} />
              </p>
            </div>

            {/* Math Formula Card (redesigned with high elegance) */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">数学物理离散算子 (LaTeX Format)</span>
              <div className="bg-white border border-slate-100 p-3 rounded-lg flex items-center justify-center font-mono text-sm sm:text-base font-semibold text-slate-900 overflow-x-auto text-center shadow-2xs">
                <MathComponent math={activeSlice.formula} block={true} />
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                <LatexText text={activeSlice.formulaDesc} />
              </p>
            </div>

            {/* Run steps */}
            <div>
              <h5 className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase mb-2">算子递推步骤 (Algorithmic Steps)</h5>
              <ol className="flex flex-col gap-2">
                {activeSlice.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-600 leading-relaxed">
                    <span className="bg-indigo-50 text-indigo-600 font-mono font-bold text-[10px] w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span><LatexText text={step} /></span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right code or statistics panel */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Real engineering application */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>现实工业映射 (Industrial Mirror)</span>
              </div>
              <p className="font-semibold text-[11px] text-indigo-950 leading-tight">
                【{activeSlice.industrialApp.title}】
              </p>
              <p className="text-[11px] text-slate-600 leading-normal font-sans">
                <LatexText text={activeSlice.industrialApp.desc} />
              </p>
            </div>

            {/* Error Analysis Grid */}
            <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 p-2.5 px-3 border-b border-slate-150 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>离散误差与刚性边界评估 (Error bounds)</span>
              </div>
              <div className="p-3.5 flex flex-col gap-3 text-[11px] leading-relaxed">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="block text-[8px] text-amber-500 font-bold uppercase">截断 (Truncation)</span>
                    <span className="block mt-1 text-[10px] font-mono pr-1 text-slate-450 leading-tight">阶数自适应</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="block text-[8px] text-teal-600 font-bold uppercase">舍入 (Roundoff)</span>
                    <span className="block mt-1 text-[10px] font-mono text-slate-450 leading-tight">53-Bit Limit</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="block text-[8px] text-rose-500 font-bold uppercase">刚性 (Stiffness)</span>
                    <span className="block mt-1 text-[10px] font-mono text-slate-450 leading-tight">谱内凹阻矩</span>
                  </div>
                </div>
                <div className="text-slate-600 font-sans flex flex-col gap-2">
                  <p><strong>截断误差:</strong> <LatexText text={activeSlice.errorAnalysis.truncation} /></p>
                  <p><strong>机底舍入:</strong> <LatexText text={activeSlice.errorAnalysis.roundoff} /></p>
                  <p><strong>流形刚性:</strong> <LatexText text={activeSlice.errorAnalysis.stiffness} /></p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* TypeScript Code Editor Drawer with pristine syntax coloring */}
        {showCode && (
          <div className="bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 flex flex-col shadow-lg">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="ml-2 font-mono text-slate-400">discrete_{activeSlice.id}_solver.ts</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-black tracking-widest bg-slate-950/80 px-2 py-0.5 rounded border border-indigo-950/80 uppercase">TS CODE</span>
            </div>
            
            <pre className="p-4 overflow-x-auto font-mono text-[11px] sm:text-xs leading-relaxed text-emerald-300/90 bg-slate-950 select-all">
              <code>
                {activeSlice.codeSnippet}
              </code>
            </pre>
          </div>
        )}

      </div>

    </div>
  );
}
