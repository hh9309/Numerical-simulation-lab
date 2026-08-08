import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { OdePoint } from '../types';
import { LatexText } from './MathRenderer';

interface OdeModel {
  id: string;
  name: string;
  desc: string;
  varnames: [string, string];
  initValues: [number, number];
  duration: number;
  derivs: (t: number, y: number[], params: any) => number[];
  getAnalyticalOrLabel: (y: number[]) => string;
}

const MODELS: OdeModel[] = [
  {
    id: 'pendulum',
    name: '阻尼非线性单摆 (Damped Pendulum)',
    desc: '角度与角速度空间。不稳定性在大步长下表现为能量不守恒，导致摆球无限向上盘旋。',
    varnames: ['角度 θ', '角速度 ω'],
    initValues: [2.5, 0.0],
    duration: 15.0,
    derivs: (t, y, params) => {
      const theta = y[0];
      const omega = y[1];
      const g_l = params.g_l || 1.0;
      const damping = params.damping || 0.15;
      return [
        omega,
        -g_l * Math.sin(theta) - damping * omega
      ];
    },
    getAnalyticalOrLabel: (y) => `θ = ${y[0].toFixed(3)}, ω = ${y[1].toFixed(3)}`
  },
  {
    id: 'lotka',
    name: 'Lotka-Volterra 捕食者与猎物模型',
    desc: '生态平衡环路。显式欧拉会因为累积局域截断误差而周期性膨胀，最终系统崩溃生态灭绝。',
    varnames: ['原住被捕食兔 (x)', '捕食猞猁 (y)'],
    initValues: [1.2, 0.8],
    duration: 16.0,
    derivs: (t, y, params) => {
      const x = y[0];
      const yVal = y[1];
      const alpha = 1.0;
      const beta = 1.0;
      const delta = 0.75;
      const gamma = 1.0;
      return [
        alpha * x - beta * x * yVal,
        delta * x * yVal - gamma * yVal
      ];
    },
    getAnalyticalOrLabel: (y) => `兔 = ${y[0].toFixed(3)}, 狼 = ${y[1].toFixed(3)}`
  }
];

export default function OdeSolverLab() {
  const [selectedModelId, setSelectedModelId] = useState<string>('pendulum');
  const [stepSize, setStepSize] = useState<number>(0.12);
  const [damping, setDamping] = useState<number>(0.15);
  
  // Solved outputs
  const [eulerPoints, setEulerPoints] = useState<OdePoint[]>([]);
  const [rk4Points, setRk4Points] = useState<OdePoint[]>([]);
  const [systemFailureDetected, setSystemFailureDetected] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];

  useEffect(() => {
    solveODE();
  }, [selectedModelId, stepSize, damping]);

  const solveODE = () => {
    const model = activeModel;
    const dt = stepSize;
    const tMax = model.duration;
    const params = { damping, g_l: 1.5 };

    // 1. Solve via Explicit Euler
    let t = 0;
    const ePoints: OdePoint[] = [];
    let curY = [...model.initValues];
    let eulerExploded = false;

    ePoints.push({ t, y: [...curY] });
    
    while (t < tMax) {
      const derivs = model.derivs(t, curY, params);
      const nextY = [
        curY[0] + dt * derivs[0],
        curY[1] + dt * derivs[1]
      ];
      t += dt;
      curY = nextY;

      // Explode protection
      if (isNaN(curY[0]) || Math.abs(curY[0]) > 50 || Math.abs(curY[1]) > 50) {
        eulerExploded = true;
        break;
      }
      ePoints.push({ t, y: [...curY] });
    }

    // 2. Solve via Classic RK-4 (Runge-Kutta 4th Order)
    t = 0;
    const rPoints: OdePoint[] = [];
    curY = [...model.initValues];

    rPoints.push({ t, y: [...curY] });

    while (t < tMax) {
      // k1
      const dy1 = model.derivs(t, curY, params);
      
      // k2
      const y_k2 = [
        curY[0] + 0.5 * dt * dy1[0],
        curY[1] + 0.5 * dt * dy1[1]
      ];
      const dy2 = model.derivs(t + 0.5 * dt, y_k2, params);

      // k3
      const y_k3 = [
        curY[0] + 0.5 * dt * dy2[0],
        curY[1] + 0.5 * dt * dy2[1]
      ];
      const dy3 = model.derivs(t + 0.5 * dt, y_k3, params);

      // k4
      const y_k4 = [
        curY[0] + dt * dy3[0],
        curY[1] + dt * dy3[1]
      ];
      const dy4 = model.derivs(t + dt, y_k4, params);

      // Combine weights
      const nextY = [
        curY[0] + (dt / 6) * (dy1[0] + 2 * dy2[0] + 2 * dy3[0] + dy4[0]),
        curY[1] + (dt / 6) * (dy1[1] + 2 * dy2[1] + 2 * dy3[1] + dy4[1])
      ];

      t += dt;
      curY = nextY;
      rPoints.push({ t, y: [...curY] });
    }

    setEulerPoints(ePoints);
    setRk4Points(rPoints);
    setSystemFailureDetected(eulerExploded || ePoints.length < rPoints.length);
  };

  // Phase Space Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dynamic scale depending on system
    const isPendulum = selectedModelId === 'pendulum';
    const xMin = isPendulum ? -5 : 0;
    const xMax = isPendulum ? 5 : 4;
    const yMin = isPendulum ? -5 : 0;
    const yMax = isPendulum ? 5 : 4;

    const toScreenX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * (width - 80);
    const toScreenY = (y: number) => (height - 40) - ((y - yMin) / (yMax - yMin)) * (height - 80);

    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 6) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), 40);
      ctx.lineTo(toScreenX(x), height - 40);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(x.toFixed(1), toScreenX(x) - 10, height - 25);
    }

    for (let y = yMin; y <= yMax; y += (yMax - yMin) / 6) {
      ctx.beginPath();
      ctx.moveTo(40, toScreenY(y));
      ctx.lineTo(width - 40, toScreenY(y));
      ctx.stroke();
      ctx.fillText(y.toFixed(1), 15, toScreenY(y) + 3);
    }

    // Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), 40);
      ctx.lineTo(toScreenX(0), height - 40);
      ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(40, toScreenY(0));
      ctx.lineTo(width - 40, toScreenY(0));
      ctx.stroke();
    }

    // Graph Labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${activeModel.varnames[0]} (X轴)`, width - 110, toScreenY(0) - 8);
    ctx.fillText(`${activeModel.varnames[1]} (Y轴)`, toScreenX(0) + 8, 30);

    // 1. Draw Euler Trajectory (Red)
    if (eulerPoints.length > 1) {
      ctx.strokeStyle = '#ef4444'; // Red for Euler
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toScreenX(eulerPoints[0].y[0]), toScreenY(eulerPoints[0].y[1]));
      for (let i = 1; i < eulerPoints.length; i++) {
        const px = toScreenX(eulerPoints[i].y[0]);
        const py = toScreenY(eulerPoints[i].y[1]);
        if (px >= 40 && px <= width - 40 && py >= 40 && py <= height - 40) {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Node markers
      ctx.fillStyle = '#ef4444';
      eulerPoints.forEach((p, idx) => {
        if (idx % Math.max(1, Math.floor(eulerPoints.length / 10)) === 0) {
          ctx.beginPath();
          ctx.arc(toScreenX(p.y[0]), toScreenY(p.y[1]), 3.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // 2. Draw RK-4 Trajectory (Green)
    if (rk4Points.length > 1) {
      ctx.strokeStyle = '#10b981'; // Green for RK4
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toScreenX(rk4Points[0].y[0]), toScreenY(rk4Points[0].y[1]));
      for (let i = 1; i < rk4Points.length; i++) {
        ctx.lineTo(toScreenX(rk4Points[i].y[0]), toScreenY(rk4Points[i].y[1]));
      }
      ctx.stroke();

      // Nodes
      ctx.fillStyle = '#10b981';
      rk4Points.forEach((p, idx) => {
        if (idx % Math.max(1, Math.floor(rk4Points.length / 10)) === 0) {
          ctx.beginPath();
          ctx.arc(toScreenX(p.y[0]), toScreenY(p.y[1]), 4.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // Start anchor highlight
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(toScreenX(activeModel.initValues[0]), toScreenY(activeModel.initValues[1]), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px sans-serif';
    ctx.fillText('始', toScreenX(activeModel.initValues[0]) - 4, toScreenY(activeModel.initValues[1]) + 3);

  }, [selectedModelId, eulerPoints, rk4Points, activeModel]);

  // Adjust pre-set to easily demonstrate catastrophic Euler decay (Violating Orbit Entropy)
  const setUnstableLimit = () => {
    setSelectedModelId('pendulum');
    setStepSize(0.38); // High step ODE solver goes unstable immediately
    setDamping(0.02);
  };

  return (
    <div id="sandbox-ode" className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight">常微分方程常驻沙盒 (ODE Solver Suite)</h2>
          <p className="text-sm text-gray-500 mt-1">
            探究一阶与二阶动力学演迭代下的累积截断误差，揭示经典一阶显式初值法与高级高阶算法的稳定性。
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex gap-2">
          <button
            id="btn-ode-unstable-preset"
            onClick={setUnstableLimit}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded border border-red-200 transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            演示不稳定性发散
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Layout */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">选择动力学模型</label>
            <select
              id="select-ode-model"
              value={selectedModelId}
              onChange={(e) => { setSelectedModelId(e.target.value); setSystemFailureDetected(false); }}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-gray-900 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {activeModel.desc}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-gray-500">数值积分步长 dt = <strong className="text-gray-900">{stepSize.toFixed(3)}s</strong></label>
            </div>
            <input
              id="range-ode-dt"
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={stepSize}
              onChange={(e) => setStepSize(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0.01s (极其高频/极精密)</span>
              <span>0.25s</span>
              <span>0.50s (低保真/可能发散)</span>
            </div>
          </div>

          {selectedModelId === 'pendulum' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-slate-500">摆球固有阻尼因子 β = <strong className="text-gray-900">{damping.toFixed(2)}</strong></label>
              </div>
              <input
                id="range-ode-damping"
                type="range"
                min="0.00"
                max="0.60"
                step="0.01"
                value={damping}
                onChange={(e) => setDamping(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <div className="p-3 bg-white border border-gray-100 rounded-lg flex flex-col gap-1.5 font-mono text-[11px] text-gray-600">
            <span className="font-semibold text-gray-700">演化运行状态:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>前向显式欧拉 (Explicit Euler): {systemFailureDetected ? '⚠️ 截断误差自谐振发散' : '运行正常'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>高级四阶龙格库塔 (RK4 Solver): 极度收敛稳定</span>
            </div>
          </div>
        </div>

        {/* Phase Space plot representation & comparison cards */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 self-start pl-2">相空间动态演化轨线比较 (y vs dy/dt)</span>
            <canvas
              ref={canvasRef}
              width={550}
              height={320}
              className="max-w-full rounded-lg bg-gray-50"
            />
          </div>

          {/* Theoretical error card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-gray-700 mb-1">前向显式欧拉法 (Euler's Method)</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                <LatexText text="局部截断误差约合复杂度为 $O(dt^2)$，全局误差累积速率为线性级 $O(dt^1)$。在微小的动力振幅偏离下，欧拉法由于无对称辛保性能量会无限振荡膨胀。" />
              </p>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-800 mb-1">古典四阶龙格库塔法 (Runge-Kutta 4)</h4>
              <p className="text-xs text-emerald-700/90 leading-relaxed">
                <LatexText text="局部截断误差复杂度极度强劲，达到 $O(dt^5)$，全局积分精度收敛于 $O(dt^4)$。通过四个斜率导数的精确加权完美克服了曲线曲度变化。" />
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
