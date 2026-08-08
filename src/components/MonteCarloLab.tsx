import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Layers, Award, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { MonteCarloPoint, BuffonNeedle } from '../types';

export default function MonteCarloLab() {
  const [approach, setApproach] = useState<'circle' | 'buffon'>('circle');
  const [totalPoints, setTotalPoints] = useState<number>(2000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [points, setPoints] = useState<MonteCarloPoint[]>([]);
  const [needles, setNeedles] = useState<BuffonNeedle[]>([]);
  const [estimatesHistory, setEstimatesHistory] = useState<number[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear or reinject
  const resetSimulation = () => {
    setIsRunning(false);
    setPoints([]);
    setNeedles([]);
    setEstimatesHistory([]);
  };

  useEffect(() => {
    resetSimulation();
  }, [approach]);

  // Handle step-wise addition during normal run, or quick batch create
  const runBatchSimulation = () => {
    if (approach === 'circle') {
      const newPoints: MonteCarloPoint[] = [];
      let insideCount = 0;
      const history: number[] = [];

      for (let i = 1; i <= totalPoints; i++) {
        const x = Math.random();
        const y = Math.random();
        const isInside = x * x + y * y <= 1.0;
        if (isInside) insideCount++;
        
        newPoints.push({ x, y, isInside });
        
        // Sampling milestones for historical convergence plotting
        if (i < 200 || i % 100 === 0 || i === totalPoints) {
          history.push((insideCount / i) * 4);
        }
      }
      setPoints(newPoints);
      setEstimatesHistory(history);
    } else {
      // Buffon Needle
      const newNeedles: BuffonNeedle[] = [];
      let crossingCount = 0;
      const history: number[] = [];
      const needleLength = 0.5; // d = 1.0, L = 0.5
      const gridSpacing = 1.0;

      for (let i = 1; i <= totalPoints; i++) {
        // x-coord of center of needle, ranges 0 to 2
        const x = Math.random() * 2.0; 
        const y = Math.random() * 2.5;
        const angle = Math.random() * Math.PI; // angle with vertical grid lines

        // Distance from needle center to closest vertical grid line (spaced at every 1.0)
        // Main grid lines are at 0, 1.0, 2.0
        const closestGridLine = Math.round(x);
        const distToLine = Math.abs(x - closestGridLine);

        // Needle crosses if distToLine <= (L/2) * sin(angle)
        const projection = (needleLength / 2) * Math.sin(angle);
        const isCrossing = distToLine <= projection;

        if (isCrossing) crossingCount++;
        newNeedles.push({ x, y, angle, isCrossing });

        if (i < 200 || i % 100 === 0 || i === totalPoints) {
          // p = 2 * L / (d * pi) -> pi = 2 * L / (d * p) = 2 * L * N_tot / (d * N_crossed)
          const prob = crossingCount / i;
          const estimate = prob > 0 ? (2 * needleLength) / (gridSpacing * prob) : 0;
          history.push(estimate);
        }
      }
      setNeedles(newNeedles);
      setEstimatesHistory(history);
    }
  };

  // Live progressive animation
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTotalPoints((prev) => {
          const next = prev + 150;
          if (next > 10000) {
            setIsRunning(false);
            return 10000;
          }
          return next;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  // Solve instantly on setting change
  useEffect(() => {
    runBatchSimulation();
  }, [totalPoints, approach]);

  // Render Monte Carlo visual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (approach === 'circle') {
      const size = Math.min(width, height) - 40;
      const marginX = (width - size) / 2;
      const marginY = (height - size) / 2;

      // Draw Square frame bounding boxes
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(marginX, marginY, size, size);

      // Draw inside quadrant arc limit
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(marginX, marginY + size, size, 1.5 * Math.PI, 2.0 * Math.PI);
      ctx.stroke();

      // Sample draw maximum of 900 points to keep canvas performance rapid
      const maxToDraw = Math.min(points.length, 1200);
      points.slice(0, maxToDraw).forEach((pt) => {
        const sx = marginX + pt.x * size;
        const sy = marginY + (1.0 - pt.y) * size;

        ctx.fillStyle = pt.isInside ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.0, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Quick info tag overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(`显示点数: ${maxToDraw} / ${points.length}`, marginX + 10, marginY + size - 10);
    } else {
      // Buffon Needs Visual
      const sizeX = width - 80;
      const sizeY = height - 60;
      const scale = 120; // 1.0 logic unit = 120 pixels

      // Grid line columns (drawn at x=0, x=1.0, x=2.0)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      
      for (let gridX = 0; gridX <= 2.2; gridX += 1.0) {
        const sx = 40 + gridX * scale;
        ctx.beginPath();
        ctx.moveTo(sx, 30);
        ctx.lineTo(sx, 30 + sizeY);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(`x = ${gridX.toFixed(1)}`, sx - 15, height - 12);
      }

      // Draw dropped needles
      const maxToDraw = Math.min(needles.length, 500);
      const needleLength = 0.5 * scale;

      needles.slice(0, maxToDraw).forEach((nd) => {
        const sx = 40 + nd.x * scale;
        const sy = 30 + nd.y * scale;

        // Calc end points
        const dx = (needleLength / 2) * Math.sin(nd.angle);
        const dy = (needleLength / 2) * Math.cos(nd.angle);

        ctx.strokeStyle = nd.isCrossing ? '#ef4444' : '#6366f1'; // Red crossing, blue safe
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - dx, sy - dy);
        ctx.lineTo(sx + dx, sy + dy);
        ctx.stroke();
      });
    }
  }, [approach, points, needles]);

  // Calculations for displays
  const getSimCalculations = () => {
    if (approach === 'circle') {
      const insideCount = points.filter(p => p.isInside).length;
      const total = points.length || 1;
      const estimate = (insideCount / total) * 4;
      const error = Math.abs(estimate - Math.PI) / Math.PI * 100;
      return {
        insideCount,
        estimate,
        error
      };
    } else {
      const crossCount = needles.filter(n => n.isCrossing).length;
      const total = needles.length || 1;
      const prob = crossCount / total;
      const estimate = prob > 0 ? (2 * 0.5) / (1.0 * prob) : 0;
      const error = Math.abs(estimate - Math.PI) / Math.PI * 100;
      return {
        insideCount: crossCount,
        estimate,
        error
      };
    }
  };

  const calcs = getSimCalculations();

  return (
    <div id="sandbox-monte-carlo" className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight">随机涌现与蒙特卡洛发生器</h2>
          <p className="text-sm text-gray-500 mt-1">
            利用概率与高频实验（投点/投针）逼近收敛常数，直观呈现不确定离散波澜如何合成极致准确。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column Config */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">选择采样模式</label>
            <div className="flex flex-col gap-2">
              <button
                id="btn-mc-circle"
                onClick={() => setApproach('circle')}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm text-left font-medium transition-all ${
                  approach === 'circle'
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <Target className="w-4 h-4" />
                四分之一圆投射 (Area PI)
              </button>
              <button
                id="btn-mc-buffon"
                onClick={() => setApproach('buffon')}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm text-left font-medium transition-all ${
                  approach === 'buffon'
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                布丰投针实验 (Buffon's Needle)
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-gray-500">粒子几何投射数 N = <strong className="text-gray-900">{totalPoints}</strong></label>
            </div>
            <input
              id="range-mc-n"
              type="range"
              min="100"
              max="20000"
              step="100"
              value={totalPoints}
              onChange={(e) => setTotalPoints(parseInt(e.target.value) || 1000)}
              className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>N=100</span>
              <span>N=10,000</span>
              <span>N=20,000 (极多/渐近零)</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              id="btn-mc-toggle-run"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? '暂停滚落' : '持续累投'}
            </button>
            <button
              id="btn-mc-reset"
              onClick={resetSimulation}
              className="px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              清空
            </button>
          </div>

          {/* Quick Realtime calculations feedback */}
          <div className="bg-white border border-gray-200 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-[11px] text-gray-600">
            <span className="font-semibold text-gray-700">实时概率状态:</span>
            {approach === 'circle' ? (
              <>
                <div>· 圆域落入数: {calcs.insideCount} / {totalPoints}</div>
                <div>· 估计落入概率: {((calcs.insideCount / totalPoints) * 100).toFixed(2)}%</div>
                <div>· 理论概率(π/4): ~ 78.54%</div>
              </>
            ) : (
              <>
                <div>· 跨线交织数: {calcs.insideCount} / {totalPoints}</div>
                <div>· 估计相交概率: {((calcs.insideCount / totalPoints) * 100).toFixed(2)}%</div>
                <div>· 针长系数(2L/d): 1.0</div>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Sandbox render */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 flex justify-center">
            <canvas
              ref={canvasRef}
              width={550}
              height={300}
              className="max-w-full rounded-lg bg-gray-50"
            />
          </div>

          {/* Estimates feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-600 uppercase font-medium">蒙特卡洛计算 π</span>
              <span className="text-base font-bold font-mono mt-0.5">{calcs.estimate.toFixed(6)}</span>
            </div>
            <div className="p-3.5 bg-slate-50 text-gray-900 rounded-xl border border-gray-200 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 uppercase font-medium">数学标准常数 π</span>
              <span className="text-base font-bold font-mono mt-0.5">3.141592...</span>
            </div>
            <div className="p-3.5 bg-rose-50 text-rose-950 rounded-xl border border-rose-100 flex flex-col justify-center">
              <span className="text-[10px] text-rose-600 uppercase font-medium">相对计算偏差百分比</span>
              <span className="text-base font-bold font-mono mt-0.5">{calcs.error.toFixed(4)}%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
