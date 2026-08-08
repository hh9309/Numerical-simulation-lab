import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, CheckCircle2, ChevronRight, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { IntegrationResult, IntegrationSubdivision } from '../types';
import { MathComponent, LatexText } from './MathRenderer';

interface FunctionOption {
  id: string;
  name: string;
  expr: string;
  latex: string;
  f: (x: number) => number;
  F: (x: number) => number; // Analytical antiderivative
  defaultA: number;
  defaultB: number;
  plotMin: number;
  plotMax: number;
}

const FUNCTIONS: FunctionOption[] = [
  {
    id: 'bell',
    name: '高斯曲线特征域',
    expr: 'e^(-x^2)',
    latex: 'f(x) = e^{-x^2}',
    f: (x) => Math.exp(-(x ** 2)),
    F: (x) => {
      // Numerical approximation of erf(x) * sqrt(pi)/2
      // Using a high accuracy series for erf
      const t = 1.0 / (1.0 + 0.5 * Math.abs(x));
      const ans = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
      const erf = x >= 0 ? ans : -ans;
      return (erf * Math.sqrt(Math.PI)) / 2;
    },
    defaultA: 0.0,
    defaultB: 2.0,
    plotMin: -0.5,
    plotMax: 2.5,
  },
  {
    id: 'sin',
    name: '谐振弦波',
    expr: 'sin(x) + 1.2',
    latex: 'f(x) = \\sin(x) + 1.2',
    f: (x) => Math.sin(x) + 1.2,
    F: (x) => -Math.cos(x) + 1.2 * x,
    defaultA: 0.0,
    defaultB: Math.PI,
    plotMin: -0.5,
    plotMax: Math.PI + 0.5,
  },
  {
    id: 'poly',
    name: '高阶不规则多项式',
    expr: 'x^3 - 2x^2 + 2',
    latex: 'f(x) = x^3 - 2x^2 + 2',
    f: (x) => x ** 3 - 2 * (x ** 2) + 2,
    F: (x) => 0.25 * (x ** 4) - (2 / 3) * (x ** 3) + 2 * x,
    defaultA: -0.5,
    defaultB: 2.0,
    plotMin: -1.0,
    plotMax: 2.5,
  }
];

export default function IntegrationLab() {
  const [selectedFuncId, setSelectedFuncId] = useState<string>('sin');
  const [method, setMethod] = useState<'riemann_left' | 'riemann_right' | 'riemann_mid' | 'trapezoid' | 'simpson'>('trapezoid');
  const [a, setA] = useState<number>(0.0);
  const [b, setB] = useState<number>(Math.PI);
  const [subdivisions, setSubdivisions] = useState<number>(12);
  const [result, setResult] = useState<IntegrationResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeFunc = FUNCTIONS.find(f => f.id === selectedFuncId) || FUNCTIONS[0];

  useEffect(() => {
    setA(activeFunc.defaultA);
    setB(activeFunc.defaultB);
    setResult(null);
  }, [selectedFuncId, activeFunc]);

  const computeIntegration = () => {
    const n = subdivisions;
    const h = (b - a) / n;
    const subdivisionsList: IntegrationSubdivision[] = [];
    let numericalValue = 0;

    if (method === 'riemann_left') {
      for (let i = 0; i < n; i++) {
        const xStart = a + i * h;
        const xEnd = xStart + h;
        const yEval = activeFunc.f(xStart);
        const area = yEval * h;
        numericalValue += area;
        subdivisionsList.push({ index: i, xStart, xEnd, yEval, area });
      }
    } else if (method === 'riemann_right') {
      for (let i = 0; i < n; i++) {
        const xStart = a + i * h;
        const xEnd = xStart + h;
        const yEval = activeFunc.f(xEnd);
        const area = yEval * h;
        numericalValue += area;
        subdivisionsList.push({ index: i, xStart, xEnd, yEval, area });
      }
    } else if (method === 'riemann_mid') {
      for (let i = 0; i < n; i++) {
        const xStart = a + i * h;
        const xEnd = xStart + h;
        const xMid = xStart + h / 2;
        const yEval = activeFunc.f(xMid);
        const area = yEval * h;
        numericalValue += area;
        subdivisionsList.push({ index: i, xStart, xEnd, yEval, area });
      }
    } else if (method === 'trapezoid') {
      for (let i = 0; i < n; i++) {
        const xStart = a + i * h;
        const xEnd = xStart + h;
        const y0 = activeFunc.f(xStart);
        const y1 = activeFunc.f(xEnd);
        const yEval = (y0 + y1) / 2;
        const area = yEval * h;
        numericalValue += area;
        subdivisionsList.push({ index: i, xStart, xEnd, yEval, area });
      }
    } else if (method === 'simpson') {
      // Simpson's 1/3 Rule on each subinterval
      for (let i = 0; i < n; i++) {
        const xStart = a + i * h;
        const xEnd = xStart + h;
        const xMid = xStart + h / 2;
        const y0 = activeFunc.f(xStart);
        const y1 = activeFunc.f(xMid);
        const y2 = activeFunc.f(xEnd);
        
        // Simpson weight: h/6 * (y0 + 4*yMid + y2) or h/3 * (y0 + 4*y1 + y2) if interval is h/2
        const area = (h / 6) * (y0 + 4 * y1 + y2);
        numericalValue += area;
        
        // Representative y height for visualization
        const yEval = (y0 + 4 * y1 + y2) / 6;
        subdivisionsList.push({ index: i, xStart, xEnd, yEval, area });
      }
    }

    const analyticalValue = activeFunc.F(b) - activeFunc.F(a);
    const errorPercentage = Math.abs(numericalValue - analyticalValue) / (Math.abs(analyticalValue) || 1e-15) * 100;

    setResult({
      subdivisions: subdivisionsList,
      numericalValue,
      analyticalValue,
      errorPercentage
    });
  };

  useEffect(() => {
    computeIntegration();
  }, [selectedFuncId, method, a, b, subdivisions]);

  // Draw Riemann slices on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const xMin = activeFunc.plotMin;
    const xMax = activeFunc.plotMax;
    const yMin = -0.5;
    const yMax = 4.0;

    const toScreenX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    const toScreenY = (y: number) => (height - padding) - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

    // Draw grid axes
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let y = 0; y <= yMax; y += 1) {
      ctx.beginPath();
      ctx.moveTo(padding, toScreenY(y));
      ctx.lineTo(width - padding, toScreenY(y));
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px monospace';
      ctx.fillText(y.toFixed(1), padding - 25, toScreenY(y) + 3);
    }

    const dx = (xMax - xMin) / 6;
    for (let x = xMin; x <= xMax; x += dx) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), padding);
      ctx.lineTo(toScreenX(x), height - padding);
      ctx.stroke();
      ctx.fillText(x.toFixed(2), toScreenX(x) - 10, height - padding + 15);
    }

    // Baseline Y = 0
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, toScreenY(0));
    ctx.lineTo(width - padding, toScreenY(0));
    ctx.stroke();

    // Draw Riemann / numerical slices
    if (result && result.subdivisions.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // Slate light blue
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 1;

      result.subdivisions.forEach((sub) => {
        const xStartS = toScreenX(sub.xStart);
        const xEndS = toScreenX(sub.xEnd);
        const yTopS = toScreenY(sub.yEval);
        const yBaseS = toScreenY(0);

        if (method.startsWith('riemann')) {
          // Flat horizontal rectangles
          ctx.beginPath();
          ctx.fillRect(xStartS, yTopS, xEndS - xStartS, yBaseS - yTopS);
          ctx.strokeRect(xStartS, yTopS, xEndS - xStartS, yBaseS - yTopS);
        } else if (method === 'trapezoid') {
          // Trapezoid boundaries
          const y0S = toScreenY(activeFunc.f(sub.xStart));
          const y1S = toScreenY(activeFunc.f(sub.xEnd));
          
          ctx.beginPath();
          ctx.moveTo(xStartS, yBaseS);
          ctx.lineTo(xStartS, y0S);
          ctx.lineTo(xEndS, y1S);
          ctx.lineTo(xEndS, yBaseS);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (method === 'simpson') {
          // Simpson parabolic approximation visual representation
          const xMid = (sub.xStart + sub.xEnd) / 2;
          const y0S = toScreenY(activeFunc.f(sub.xStart));
          const yMidS = toScreenY(activeFunc.f(xMid));
          const y1S = toScreenY(activeFunc.f(sub.xEnd));

          // Draw a curved path matching Simpson's parabola integration slice
          ctx.beginPath();
          ctx.moveTo(xStartS, yBaseS);
          ctx.lineTo(xStartS, y0S);
          
          // Interpolate quadratic curve between Start, Mid and End
          for (let sx = xStartS; sx <= xEndS; sx++) {
            const ratio = (sx - xStartS) / (xEndS - xStartS);
            const xVal = sub.xStart + ratio * (sub.xEnd - sub.xStart);
            // Parabolic interpolator
            const l0 = ((xVal - xMid) * (xVal - sub.xEnd)) / ((sub.xStart - xMid) * (sub.xStart - sub.xEnd));
            const l1 = ((xVal - sub.xStart) * (xVal - sub.xEnd)) / ((xMid - sub.xStart) * (xMid - sub.xEnd));
            const l2 = ((xVal - sub.xStart) * (xVal - xMid)) / ((sub.xEnd - sub.xStart) * (sub.xEnd - xMid));
            const yInterp = activeFunc.f(sub.xStart) * l0 + activeFunc.f(xMid) * l1 + activeFunc.f(sub.xEnd) * l2;
            ctx.lineTo(sx, toScreenY(yInterp));
          }
          
          ctx.lineTo(xEndS, yBaseS);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    // Draw Pure Continuous Function Curve
    ctx.beginPath();
    ctx.strokeStyle = '#1e293b'; // Slate deep
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

    // Fill area under exact curve bounds in a thin dash
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(toScreenX(a), toScreenY(0));
    ctx.lineTo(toScreenX(a), toScreenY(activeFunc.f(a)));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toScreenX(b), toScreenY(0));
    ctx.lineTo(toScreenX(b), toScreenY(activeFunc.f(b)));
    ctx.stroke();
    ctx.setLineDash([]);

  }, [selectedFuncId, method, a, b, subdivisions, result, activeFunc]);

  return (
    <div id="sandbox-integration" className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight">离散积分与面积累积器</h2>
          <p className="text-sm text-gray-500 mt-1">
            探究计算机解析连续代数曲线的高阶积分逼近。对比黎曼和、左右节点法与高阶拟合的数学精度。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar inputs */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">选取被积函数</label>
            <select
              id="select-integration-func"
              value={selectedFuncId}
              onChange={(e) => setSelectedFuncId(e.target.value)}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-gray-900 outline-none"
            >
              {FUNCTIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.expr})</option>
              ))}
            </select>
            <div className="mt-2 text-xs bg-white py-1 px-2.5 rounded border border-gray-100 text-center font-mono text-gray-600 flex items-center justify-center min-h-[34px]">
              <MathComponent math={activeFunc.latex} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">网格切分积分算法</label>
            <select
              id="select-integration-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="riemann_left">黎曼左矩形和 (Riemann Left)</option>
              <option value="riemann_right">黎曼右矩形和 (Riemann Right)</option>
              <option value="riemann_mid">中点矩形和 (Riemann Midpoint)</option>
              <option value="trapezoid">梯形拟合公式 (Trapezoidal Rule)</option>
              <option value="simpson">辛普森二次拟合 (Simpson's 1/3 Rule)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">积分下限 a</label>
              <input
                id="input-integration-a"
                type="number"
                step="0.1"
                value={a}
                onChange={(e) => setA(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">积分上限 b</label>
              <input
                id="input-integration-b"
                type="number"
                step="0.1"
                value={b}
                onChange={(e) => setB(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-gray-500">网格切分阶数 N = <strong className="text-gray-900">{subdivisions}</strong></label>
              <span className="text-[10px] font-mono text-gray-400">步长 h = {((b - a) / subdivisions).toFixed(4)}</span>
            </div>
            <input
              id="range-integration-n"
              type="range"
              min="2"
              max="128"
              step="1"
              value={subdivisions}
              onChange={(e) => setSubdivisions(parseInt(e.target.value) || 4)}
              className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>N=2 (粗糙)</span>
              <span>N=64</span>
              <span>N=128 (精细)</span>
            </div>
          </div>
        </div>

        {/* Right Plot Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 flex justify-center">
            <canvas
              ref={canvasRef}
              width={550}
              height={300}
              className="max-w-full rounded-lg bg-gray-50"
            />
          </div>

          {result && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="text-[10px] text-blue-500 tracking-wider uppercase font-medium">离散解数值 (Riemann/Trapezoidal)</span>
                <span className="text-base font-bold font-mono text-blue-900 mt-0.5">{result.numericalValue.toFixed(8)}</span>
              </div>
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-center">
                <span className="text-[10px] text-emerald-500 tracking-wider uppercase font-medium">解析解 (Continuous Exact)</span>
                <span className="text-base font-bold font-mono text-emerald-900 mt-0.5">{result.analyticalValue.toFixed(8)}</span>
              </div>
              <div className="p-3.5 bg-violet-50/50 rounded-xl border border-violet-100 flex flex-col justify-center">
                <span className="text-[10px] text-violet-500 tracking-wider uppercase font-medium">数值绝对相对误差 (Error)</span>
                <span className="text-base font-bold font-mono text-violet-950 mt-0.5">{result.errorPercentage.toExponential(3)}%</span>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-700">算法误差分析：</strong>
              <LatexText text="二分、梯形或辛普森法的渐进截断误差分别为平方 $O(h^2)$ 和四次方 $O(h^4)$ 关系。增加切分阶数 $N$ 会使得离散累积和无限趋近于连续极限，但在极细微尺度下，浮点数舍入误差最终会接管并限制逼近上限。" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
