import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Compass, 
  Layers, 
  HelpCircle, 
  Layers2, 
  Binary 
} from 'lucide-react';

import RootFindingLab from './components/RootFindingLab';
import IntegrationLab from './components/IntegrationLab';
import OdeSolverLab from './components/OdeSolverLab';
import MonteCarloLab from './components/MonteCarloLab';
import MatrixSolverLab from './components/MatrixSolverLab';
import AiCentralInsight from './components/AiCentralInsight';
import AlgorithmDocsSlices from './components/AlgorithmDocsSlices';
import { SandboxType } from './types';

export default function App() {
  const [activeSandbox, setActiveSandbox] = useState<SandboxType>('root');

  // Simple state proxies to populate the AI engine's context
  const [rootConfig] = useState({ function: '三次多项式', tolerance: 0.0001, maxSteps: 15 });
  const [integrationConfig] = useState({ function: '谐振弦波', subdivisions: 12, method: 'trapezoid' });
  const [odeConfig] = useState({ model: 'pendulum', stepSize: 0.12, damping: 0.15 });
  const [mcConfig] = useState({ approach: 'circle', totalPoints: 2000 });
  const [matrixConfig] = useState({ size: '12x12', topBoundary: 100, solver: 'gauss_seidel' });

  // Get active config bundle to pass to the AI panel
  const getActiveConfig = () => {
    switch (activeSandbox) {
      case 'root': return rootConfig;
      case 'integration': return integrationConfig;
      case 'ode': return odeConfig;
      case 'montecarlo': return mcConfig;
      case 'matrix': return matrixConfig;
    }
  };

  return (
    <div id="geometric-balance-app" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Header Navigation in Geometric Balance Theme */}
      <header className="h-16 px-4 sm:px-6 md:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 flex items-center justify-center rounded-xs shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <div>
            <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-tight text-slate-800 flex items-center gap-1">
              <span>数值计算与仿真工厂</span>
              <span className="text-slate-400 font-normal text-[10px] tracking-wide hidden lg:inline">2.0</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <button 
            id="nav-sandbox"
            className={`border-b-2 pb-1 transition-all ${
              activeSandbox ? 'text-slate-900 border-slate-900' : 'border-transparent hover:text-slate-950'
            }`}
          >
            核心沙盒
          </button>
          <a href="#ai-central-panel" className="hover:text-slate-900 border-b-2 border-transparent pb-1 transition-all">AI助手</a>
          <a href="#quick-guide" className="hover:text-slate-900 border-b-2 border-transparent pb-1 transition-all">计算知识</a>
        </nav>

        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] md:text-xs font-bold ring-1 ring-blue-100 hidden sm:block">
            集群: 在线
          </div>
          <div className="w-7 h-7 sm:w-8 md:w-9 md:h-9 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 text-[10px] md:text-xs font-bold text-slate-700">
            JD
          </div>
        </div>
      </header>

      {/* Main Grid Workspace Workspace */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Upper Dashboard Selector row */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
          
          {/* Card 01 - Root Finding */}
          <button
            id="btn-nav-root"
            onClick={() => setActiveSandbox('root')}
            className={`text-left p-4 bg-white border rounded-lg transition-all flex flex-col justify-between h-28 relative group cursor-pointer ${
              activeSandbox === 'root'
                ? 'border-slate-900 ring-1 ring-slate-900'
                : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">01 ROOT-FINDING</span>
              <span className="text-[10px] text-emerald-500 font-mono font-bold">Newton & Bisec</span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-800 tracking-tight block">
              非线性逼近与根搜索
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-slate-900 h-full w-4/12 group-hover:w-full transition-all duration-500"></div>
            </div>
          </button>

          {/* Card 02 - Integration */}
          <button
            id="btn-nav-integration"
            onClick={() => setActiveSandbox('integration')}
            className={`text-left p-4 bg-white border rounded-lg transition-all flex flex-col justify-between h-28 relative group cursor-pointer ${
              activeSandbox === 'integration'
                ? 'border-slate-900 ring-1 ring-slate-900'
                : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">02 INTEGRATION</span>
              <span className="text-[10px] text-blue-500 font-mono font-bold">Riemann & Simp</span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-800 tracking-tight block">
              离散积分与微元累积
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-600 h-full w-6/12 group-hover:w-full transition-all duration-500"></div>
            </div>
          </button>

          {/* Card 03 - ODE solver */}
          <button
            id="btn-nav-ode"
            onClick={() => setActiveSandbox('ode')}
            className={`text-left p-4 bg-white border rounded-lg transition-all flex flex-col justify-between h-28 relative group cursor-pointer ${
              activeSandbox === 'ode'
                ? 'border-slate-900 ring-1 ring-slate-900'
                : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">03 ODE SOLVER</span>
              <span className="text-[10px] text-amber-500 font-mono font-bold">Euler vs RK-4</span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-800 tracking-tight block">
              常微分方程经典沙盒
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-amber-500 h-full w-8/12 group-hover:w-full transition-all duration-500"></div>
            </div>
          </button>

          {/* Card 04 - Monte Carlo */}
          <button
            id="btn-nav-montecarlo"
            onClick={() => setActiveSandbox('montecarlo')}
            className={`text-left p-4 bg-white border rounded-lg transition-all flex flex-col justify-between h-28 relative group cursor-pointer ${
              activeSandbox === 'montecarlo'
                ? 'border-slate-900 ring-1 ring-slate-900'
                : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">04 MONTE CARLO</span>
              <span className="text-[10px] text-indigo-500 font-mono font-bold">Buffon Needle</span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-800 tracking-tight block">
              随机涌现与发生器
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-indigo-500 h-full w-5/12 group-hover:w-full transition-all duration-500"></div>
            </div>
          </button>

          {/* Card 05 - Matrix heat solver (Slate-900 colored highlight) */}
          <button
            id="btn-nav-matrix"
            onClick={() => setActiveSandbox('matrix')}
            className={`text-left p-4 border rounded-lg transition-all flex flex-col justify-between h-28 relative group cursor-pointer col-span-2 md:col-span-1 ${
              activeSandbox === 'matrix'
                ? 'bg-slate-950 border-slate-950 text-white ring-2 ring-slate-800 shadow-md'
                : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-950 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">05 LINEAR SYSTEM</span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">Laplace heat</span>
            </div>
            <div className="mt-2 text-xs font-bold tracking-tight block">
              残矩阵离散与线性求解
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-400 h-full w-10/12 group-hover:w-full transition-all duration-300"></div>
            </div>
          </button>

        </section>

        {/* Live Active Experimental Workspace Canvas Frame */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[460px] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-450 tracking-widest uppercase">ACTIVE WORKSPACE CONSOLE</span>
            </div>
            <span className="text-[10px] bg-slate-200 hover:bg-slate-300 transition-colors py-0.5 px-2 rounded-full font-mono text-slate-600">
              {activeSandbox.toUpperCase()} - NODE CALIBRATED
            </span>
          </div>

          <div className="p-4 md:p-6 flex-1">
            {activeSandbox === 'root' && <RootFindingLab />}
            {activeSandbox === 'integration' && <IntegrationLab />}
            {activeSandbox === 'ode' && <OdeSolverLab />}
            {activeSandbox === 'montecarlo' && <MonteCarloLab />}
            {activeSandbox === 'matrix' && <MatrixSolverLab />}
          </div>
        </section>

        {/* Module 6: Intel Central Engine AI bottom panel */}
        <section>
          <AiCentralInsight activeSandbox={activeSandbox} sandboxConfig={getActiveConfig()} />
        </section>

        {/* Dynamic interactive Algorithm Documentation Slices readers */}
        <section>
          <AlgorithmDocsSlices activeSandbox={activeSandbox} />
        </section>

      </main>

      {/* Footer Navigation bar in Geometric Balance */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 text-[10px] md:text-xs">
        <div className="flex gap-4 md:gap-6 items-center text-slate-400 font-medium font-mono">
          <span>系统状态: 标称 (NOMINAL)</span>
          <span>引擎版本: V2.6-LTS</span>
          <span>算法通道: 离散对等开启</span>
        </div>
        <div className="text-slate-400">
          &copy; 2026 数值计算与离散物理科学仿真实验室
        </div>
      </footer>

    </div>
  );
}
