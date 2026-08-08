import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Info, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { RootFindingStep, RootFindingResult } from '../types';

interface FunctionOption {
  id: string;
  name: string;
  expr: string;
  latex: string;
  f: (x: number) => number;
  df: (x: number) => number;
  defaultA: number;
  defaultB: number;
  defaultX0: number;
  plotMin: number;
  plotMax: number;
}

const FUNCTIONS: FunctionOption[] = [
  {
    id: 'poly',
    name: '三次多项式',
    expr: 'x^3 - 2x - 5 = 0',
    latex: 'f(x) = x^3 - 2x - 5',
    f: (x) => x ** 3 - 2 * x - 5,
    df: (x) => 3 * (x ** 2) - 2,
    defaultA: 1.0,
    defaultB: 3.0,
    defaultX0: 1.2,
    plotMin: 0,
    plotMax: 3.5,
  },
  {
    id: 'dottie',
    name: 'Dottie 恒等式',
    expr: 'cos(x) - x = 0',
    latex: 'f(x) = \\cos(x) - x',
    f: (x) => Math.cos(x) - x,
    df: (x) => -Math.sin(x) - 1,
    defaultA: 0.0,
    defaultB: 1.5,
    defaultX0: 0.1,
    plotMin: -0.5,
    plotMax: 2.0,
  },
  {
    id: 'lambert',
    name: 'Lambert W 关联项',
    expr: 'x * e^x - 1 = 0',
    latex: 'f(x) = x e^x - 1',
    f: (x) => x * Math.exp(x) - 1,
    df: (x) => Math.exp(x) * (1 + x),
    defaultA: 0.0,
    defaultB: 1.5,
    defaultX0: 0.1,
    plotMin: -0.5,
    plotMax: 1.5,
  },
  {
    id: 'chaos',
    name: '多峰谐振 (易振荡/失败)',
    expr: 'x^3 - 5x = 0',
    latex: 'f(x) = x^3 - 5x',
    f: (x) => x ** 3 - 5 * x,
    df: (x) => 3 * (x ** 2) - 5,
    defaultA: 1.0,
    defaultB: 3.0,
    defaultX0: 1.285, // Extremely close to sqrt(5/3) ~ 1.29099, slope near 0 -> shoots off
    plotMin: -3.0,
    plotMax: 3.0,
  },
];

export default function RootFindingLab() {
  const [selectedFuncId, setSelectedFuncId] = useState<string>('poly');
  const [method, setMethod] = useState<'bisection' | 'newton'>('bisection');
  const [a, setA] = useState<number>(1.0);
  const [b, setB] = useState<number>(3.0);
  const [x0, setX0] = useState<number>(1.2);
  const [tolerance, setTolerance] = useState<number>(0.0001);
  const [maxSteps, setMaxSteps] = useState<number>(15);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [result, setResult] = useState<RootFindingResult | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeFunc = FUNCTIONS.find(f => f.id === selectedFuncId) || FUNCTIONS[0];

  useEffect(() => {
    setA(activeFunc.defaultA);
    setB(activeFunc.defaultB);
    setX0(activeFunc.defaultX0);
    setCurrentStep(-1);
    setResult(null);
    setIsPlaying(false);
  }, [selectedFuncId, activeFunc]);

  // Autoplay loop timer for iterating steps
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && result && result.steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= result.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, result]);

  const togglePlay = () => {
    if (!result || result.steps.length === 0) return;
    if (currentStep >= result.steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Run selected Root Finding algorithm
  const computeRoot = () => {
    setIsPlaying(false);
    const steps: RootFindingStep[] = [];
    const f = activeFunc.f;
    const df = activeFunc.df;
    
    if (method === 'bisection') {
      let curA = a;
      let curB = b;
      
      // Initial bounds check
      const fa = f(curA);
      const fb = f(curB);
      if (fa * fb > 0) {
        setResult({
          steps: [],
          root: NaN,
          status: 'failed',
          message: `二分边界同号：f(a)=${fa.toFixed(4)}, f(b)=${fb.toFixed(4)}。请选择具有异号值的区间。`
        });
        setCurrentStep(0);
        return;
      }
      
      let stepCount = 0;
      let converged = false;
      let mid = curA;

      while (stepCount < maxSteps) {
        stepCount++;
        mid = (curA + curB) / 2;
        const fmid = f(mid);
        const err = Math.abs(curB - curA) / 2;
        
        steps.push({
          step: stepCount,
          x: mid,
          fx: fmid,
          error: err,
          extra: { a: curA, b: curB }
        });

        if (err < tolerance || Math.abs(fmid) < 1e-15) {
          converged = true;
          break;
        }

        if (fa * fmid < 0) {
          // root on left half
          curB = mid;
        } else {
          // root on right half
          curA = mid;
        }
      }

      setResult({
        steps,
        root: mid,
        status: converged ? 'converged' : 'max_reached',
        message: converged 
          ? `收敛成功：于 ${stepCount} 步内，逼近根为 ${mid.toFixed(6)}，剩余精度半径 ${Math.abs(curB - curA).toExponential(3)}。`
          : `达到最大迭代次数。逼近值为 ${mid.toFixed(6)}。`
      });
      setCurrentStep(0);
      
    } else {
      // Newton Raphson
      let currX = x0;
      let stepCount = 0;
      let converged = false;
      let err = 0;
      
      while (stepCount < maxSteps) {
        stepCount++;
        const fxVal = f(currX);
        const dfxVal = df(currX);
        
        // Zero derivative guard
        if (Math.abs(dfxVal) < 1e-12) {
          steps.push({
            step: stepCount,
            x: currX,
            fx: fxVal,
            error: Infinity,
            extra: { tangentX0: currX, tangentX1: NaN }
          });
          setResult({
            steps,
            root: NaN,
            status: 'failed',
            message: `迭代崩溃：处在 x = ${currX.toFixed(5)} 时导数极近零 (f'(x) = ${dfxVal.toExponential(3)})，切线平行于 x 轴。`
          });
          setCurrentStep(0);
          return;
        }

        const nextX = currX - fxVal / dfxVal;
        err = Math.abs(nextX - currX);
        
        steps.push({
          step: stepCount,
          x: currX,
          fx: fxVal,
          error: err,
          extra: { tangentX0: currX, tangentX1: nextX }
        });

        if (err < tolerance || Math.abs(fxVal) < 1e-15) {
          converged = true;
          currX = nextX;
          break;
        }

        currX = nextX;
      }

      setResult({
        steps,
        root: currX,
        status: converged ? 'converged' : 'max_reached',
        message: converged
          ? `收敛成功：牛顿法迭代 ${stepCount} 步，解得近似根 ${currX.toFixed(6)}，差分容差 ${err.toExponential(3)}。`
          : `超过最大步数：解得最佳估计值为 ${currX.toFixed(6)}。`
      });
      setCurrentStep(0);
    }
  };

  // Render plot canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);

    // Padding & Ranges
    const padding = 40;
    const xMin = activeFunc.plotMin;
    const xMax = activeFunc.plotMax;
    
    // Sample points to find y bounds
    let yMin = -6;
    let yMax = 6;
    
    // Draw grid coordinate helpers
    const toScreenX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    const toScreenY = (y: number) => (height - padding) - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

    // Draw grid axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let y = Math.floor(yMin); y <= Math.ceil(yMax); y += 2) {
      ctx.beginPath();
      ctx.moveTo(padding, toScreenY(y));
      ctx.lineTo(width - padding, toScreenY(y));
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px monospace';
      ctx.fillText(y.toString(), padding - 20, toScreenY(y) + 3);
    }

    // Vertical grid lines
    const dx = (xMax - xMin) / 5;
    for (let x = xMin; x <= xMax; x += dx) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), padding);
      ctx.lineTo(toScreenX(x), height - padding);
      ctx.stroke();
      ctx.fillText(x.toFixed(1), toScreenX(x) - 10, height - padding + 15);
    }

    // Draw X and Y main axis
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    
    // X Axis (Y=0)
    if (yMin <= 0 && yMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(padding, toScreenY(0));
      ctx.lineTo(width - padding, toScreenY(0));
      ctx.stroke();
    }
    // Y Axis (X=0)
    if (xMin <= 0 && xMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), padding);
      ctx.lineTo(toScreenX(0), height - padding);
      ctx.stroke();
    }

    // Draw Function Curve
    ctx.beginPath();
    ctx.strokeStyle = '#0f172a'; // Deep elegant charcoal
    ctx.lineWidth = 2.5;
    let started = false;
    for (let px = 0; px < width - 2 * padding; px++) {
      const xRatio = px / (width - 2 * padding);
      const x = xMin + xRatio * (xMax - xMin);
      const y = activeFunc.f(x);
      
      const sy = toScreenY(y);
      if (sy >= padding && sy <= height - padding) {
        if (!started) {
          ctx.moveTo(toScreenX(x), sy);
          started = true;
        } else {
          ctx.lineTo(toScreenX(x), sy);
        }
      }
    }
    ctx.stroke();

    // Plot iterations overlays
    if (result && result.steps.length > 0 && currentStep >= 0) {
      const stepIdx = Math.min(currentStep, result.steps.length - 1);
      const step = result.steps[stepIdx];

      if (method === 'bisection') {
        const extra = step.extra;
        if (extra && extra.a !== undefined && extra.b !== undefined) {
          const sA = toScreenX(extra.a);
          const sB = toScreenX(extra.b);
          const sMid = toScreenX(step.x);

          // Subinterval shading
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // pale emerald
          ctx.fillRect(sA, padding, sB - sA, height - 2 * padding);

          // Boundary lines
          ctx.strokeStyle = '#3b82f6'; // Blue left
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(sA, padding); ctx.lineTo(sA, height - padding);
          ctx.stroke();

          ctx.strokeStyle = '#ef4444'; // Red right
          ctx.beginPath();
          ctx.moveTo(sB, padding); ctx.lineTo(sB, height - padding);
          ctx.stroke();

          // Midpoint marker
          ctx.setLineDash([]);
          ctx.fillStyle = '#10b981'; // Emerald midpoint
          ctx.beginPath();
          ctx.arc(sMid, toScreenY(step.fx), 6, 0, 2 * Math.PI);
          ctx.fill();

          // Vertical line from mid to X axis
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sMid, toScreenY(0));
          ctx.lineTo(sMid, toScreenY(step.fx));
          ctx.stroke();

          // Label midpoint
          ctx.fillStyle = '#065f46';
          ctx.font = '10.5px Inter, sans-serif';
          ctx.fillText(`c${step.step} = ${step.x.toFixed(4)}`, sMid - 25, toScreenY(0) - (step.fx > 0 ? 10 : -18));
        }
      } else {
        // Newton Raphson
        const extra = step.extra;
        if (extra && extra.tangentX0 !== undefined) {
          const sX0 = toScreenX(extra.tangentX0);
          const y0 = activeFunc.f(extra.tangentX0);
          const sY0 = toScreenY(y0);
          
          // Tangent target
          const nextVal = extra.tangentX1;
          
          // Original node dot
          ctx.fillStyle = '#6366f1'; // Indigo point
          ctx.beginPath();
          ctx.arc(sX0, sY0, 6, 0, 2 * Math.PI);
          ctx.fill();

          // Vertical guide to X axis
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(sX0, toScreenY(0));
          ctx.lineTo(sX0, sY0);
          ctx.stroke();
          ctx.setLineDash([]);

          if (nextVal !== undefined && !isNaN(nextVal)) {
            const sX1 = toScreenX(nextVal);
            
            // Draw tangent line
            ctx.strokeStyle = '#ef4444'; // Red tangent slope
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sX0, sY0);
            ctx.lineTo(sX1, toScreenY(0));
            ctx.stroke();

            // Next node marker
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(sX1, toScreenY(0), 4, 0, 2 * Math.PI);
            ctx.fill();

            // Label next iterate
            ctx.fillStyle = '#7f1d1d';
            ctx.font = '10.5px Inter, sans-serif';
            ctx.fillText(`x${step.step} = ${nextVal.toFixed(4)}`, sX1 - 25, toScreenY(0) + (y0 > 0 ? 15 : -10));
          }
        }
      }
    }
  }, [selectedFuncId, method, a, b, x0, currentStep, result, activeFunc]);

  // Handle Quick Pre-configured stiff failures
  const triggerStiffFailure = () => {
    setSelectedFuncId('chaos');
    setMethod('newton');
    setX0(1.29099); // Near division limit where tangent goes flat (derivative ~ 0)
    setMaxSteps(10);
    setResult(null);
    setCurrentStep(-1);
  };

  return (
    <div id="sandbox-root-finding" className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight">非线性逼近与根搜索沙盒</h2>
          <p className="text-sm text-gray-500 mt-1">
            动态观察牛顿迭代中的切线连结与二分法的空间折叠，展现经典逼近控制与高阶微商失效边界。
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex gap-2">
          <button
            id="btn-chaos-preset"
            onClick={triggerStiffFailure}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded border border-amber-200 transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            数值崩溃预设
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">选取代数模型</label>
            <select
              id="select-root-func"
              value={selectedFuncId}
              onChange={(e) => setSelectedFuncId(e.target.value)}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-gray-900 outline-none"
            >
              {FUNCTIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.expr})</option>
              ))}
            </select>
            <div className="mt-2 text-xs bg-white py-1 px-2.5 rounded border border-gray-100 text-center font-mono text-gray-600">
              {activeFunc.latex}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">寻根离散算法</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-method-bisection"
                onClick={() => { setMethod('bisection'); setCurrentStep(-1); setResult(null); setIsPlaying(false); }}
                className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                  method === 'bisection'
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                二分收敛法
              </button>
              <button
                id="btn-method-newton"
                onClick={() => { setMethod('newton'); setCurrentStep(-1); setResult(null); setIsPlaying(false); }}
                className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                  method === 'newton'
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                牛顿切线迭代
              </button>
            </div>
          </div>

          {/* Boundaries Inputs */}
          {method === 'bisection' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-gray-500 mb-1">左边界 a</label>
                <input
                  id="input-root-a"
                  type="number"
                  step="0.1"
                  value={a}
                  onChange={(e) => { setA(parseFloat(e.target.value) || 0); setResult(null); }}
                  className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">右边界 b</label>
                <input
                  id="input-root-b"
                  type="number"
                  step="0.1"
                  value={b}
                  onChange={(e) => { setB(parseFloat(e.target.value) || 0); setResult(null); }}
                  className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-gray-900"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">初始估计初值 x₀</label>
              <input
                id="input-root-x0"
                type="number"
                step="0.05"
                value={x0}
                onChange={(e) => { setX0(parseFloat(e.target.value) || 0); setResult(null); }}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-gray-900"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">收敛容差 ε</label>
              <select
                id="select-root-tol"
                value={tolerance}
                onChange={(e) => { setTolerance(parseFloat(e.target.value)); setResult(null); }}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none"
              >
                <option value="1e-3">1e-3 (粗略)</option>
                <option value="1e-4">1e-4 (标准)</option>
                <option value="1e-6">1e-6 (工业级)</option>
                <option value="1e-8">1e-8 (极高精密)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最高迭代限制</label>
              <input
                id="input-root-max-steps"
                type="number"
                min="5"
                max="50"
                value={maxSteps}
                onChange={(e) => { setMaxSteps(parseInt(e.target.value) || 10); setResult(null); }}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none"
              />
            </div>
          </div>

          <button
            id="btn-run-root"
            onClick={computeRoot}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            启动逼近求解器
          </button>
        </div>

        {/* Right Plot & Iteration Visualizer */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center gap-2">
            <div className="w-full flex justify-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={270}
                className="max-w-full rounded-lg bg-gray-50"
              />
            </div>
            
            {/* Step controller bar */}
            {result && result.steps.length > 0 && (
              <div className="w-full bg-white px-3 py-2 rounded-lg border border-gray-150 shadow-xs flex flex-wrap gap-2 items-center justify-between">
                <span className="text-[11px] sm:text-xs font-mono font-semibold text-gray-700">
                  迭代级切片: <strong className="text-gray-900">{currentStep + 1}</strong> / {result.steps.length} 步
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  <button
                    id="btn-step-play"
                    onClick={togglePlay}
                    className={`p-1 px-2.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                      isPlaying 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        自动播放
                      </>
                    )}
                  </button>
                  <button
                    id="btn-step-prev"
                    disabled={currentStep <= 0}
                    onClick={() => { setCurrentStep(prev => prev - 1); setIsPlaying(false); }}
                    className="p-1 px-2.5 text-[11px] rounded border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    id="btn-step-next"
                    disabled={currentStep >= result.steps.length - 1}
                    onClick={() => { setCurrentStep(prev => prev + 1); setIsPlaying(false); }}
                    className="p-1 px-2.5 text-[11px] bg-gray-900 hover:bg-gray-800 text-white rounded disabled:opacity-40 transition-colors"
                  >
                    下一步
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Analysis */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                result.status === 'converged'
                  ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                  : 'bg-amber-50/50 border-amber-100 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {result.status === 'converged' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="text-sm font-semibold">求解状态分析</span>
              </div>
              <p className="text-xs leading-relaxed font-mono">{result.message}</p>
            </motion.div>
          )}

          {/* Convergence Table */}
          {result && result.steps.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-gray-50 py-2.5 px-4 border-b border-gray-100 flex items-center">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">收敛轨迹数据表</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-5/50 border-b border-gray-100 text-gray-500 font-medium">
                      <th className="p-2.5 pl-4">第k步</th>
                      <th className="p-2.5">估计解 x_k</th>
                      <th className="p-2.5">函数值 f(x_k)</th>
                      <th className="p-2.5">估计误差 Δx</th>
                      <th className="p-2.5 pr-4 text-right">轨迹切面</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono divide-y divide-gray-50">
                    {result.steps.map((st, i) => (
                      <tr
                        key={st.step}
                        onClick={() => setCurrentStep(i)}
                        className={`cursor-pointer hover:bg-gray-50/70 transition-colors ${
                          currentStep === i ? 'bg-gray-50 font-bold' : ''
                        }`}
                      >
                        <td className="p-2.5 pl-4">{st.step}</td>
                        <td className="p-2.5 text-gray-700">{st.x.toFixed(8)}</td>
                        <td className="p-2.5">{st.fx.toExponential(4)}</td>
                        <td className="p-2.5 text-gray-500">{st.error.toExponential(4)}</td>
                        <td className="p-2.5 pr-4 text-right">
                          <button className="text-[10px] bg-slate-100 hover:bg-slate-200 py-0.5 px-2 rounded font-sans font-medium text-slate-700 transition-colors">
                            查看
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
