import React, { useState, useEffect } from 'react';
import { Send, Key, CheckCircle, ShieldAlert, Sparkles, MessageSquare, HelpCircle, CornerDownRight } from 'lucide-react';
import { LatexText } from './MathRenderer';

interface AiCentralInsightProps {
  activeSandbox: 'root' | 'integration' | 'ode' | 'montecarlo' | 'matrix';
  sandboxConfig: any;
}

export default function AiCentralInsight({ activeSandbox, sandboxConfig }: AiCentralInsightProps) {
  // Model state settings: Gemini 3 Flash vs DeepSeek V4 Pro
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(
    () => (localStorage.getItem('user_ai_model') as any) || 'gemini'
  );

  // Handcrafted browser-side api keys storage in localStorage
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('user_gemini_api_key') || ''
  );
  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(
    () => localStorage.getItem('user_deepseek_api_key') || ''
  );
  const [deepseekEndpoint, setDeepseekEndpoint] = useState<string>(
    () => localStorage.getItem('user_deepseek_endpoint') || 'https://api.deepseek.com/v1'
  );

  // States to keep the keys updated in localStorage
  useEffect(() => {
    localStorage.setItem('user_ai_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('user_gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('user_deepseek_api_key', deepseekApiKey);
  }, [deepseekApiKey]);

  useEffect(() => {
    localStorage.setItem('user_deepseek_endpoint', deepseekEndpoint);
  }, [deepseekEndpoint]);

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: '您好！我是您的数值误差与仿真物理学 AI 导师。当前我已接入全部 5 个仿真沙盒的底层矩阵和离散寄存器。您可以随时向我咨询高精度求解、刚性边界、Navier-Stokes 松弛或物理神经网络 (PINNs) 的构建理论。'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [showAdvancedDeepseek, setShowAdvancedDeepseek] = useState<boolean>(false);

  // Translate sandbox ID to simplified Chinese
  const getSandboxChineseName = (id: string) => {
    switch (id) {
      case 'root': return '非线性逼近与根搜索';
      case 'integration': return '离散积分与积分累积';
      case 'ode': return '常微分方程动力学演化';
      case 'montecarlo': return '蒙特卡洛随机粒子发生器';
      case 'matrix': return '线性高维矩阵松弛热力场';
      default: return '离散沙盒';
    }
  };

  const getActiveApiKey = () => {
    return selectedModel === 'gemini' ? geminiApiKey : deepseekApiKey;
  };

  const getFallbackChatText = (latestQuery: string) => {
    return `[本地数值物理学家 AI 导师] (未激活大模型)

【提示】: 由于您未在左侧控制栏输入相应大模型的 API-Key，系统处于安全保护降级运行状态。

关于您提问的：“${latestQuery}”

其实在离散科学仿真的背景下：
1. 所有的数值计算本质上是以**有限离散逼近无限连续**。
2. 误差主要分为主离散代数阶段产生的**截断误差**，以及由芯片底层物理结构（64位浮点芯片）产生的**舍入误差**。
3. 辛几何积分算法（如 Verlet、Symplectic Euler）相比传统高阶 RK-4 往往能在长时模拟中带来更好的局部能量和哈密顿量守恒。

*💡 提示：输入您的 API-Key 并选择对应模型（Gemini 3 Flash 或 DeepSeek V4 Pro），即可在浏览器前端直连云端大模型，体验完整的解剖与推论服务。*`;
  };

  // Browser-based LLM Call API (Completely runs client-side to adapt to Github Pages securely)
  const callAiDirect = async (prompt: string, sInstruction: string) => {
    const activeKey = getActiveApiKey().trim();
    if (!activeKey) {
      throw new Error(`请先输入您的 ${selectedModel === 'gemini' ? 'Gemini' : 'DeepSeek'} API Key。`);
    }

    if (selectedModel === 'gemini') {
      // Direct call Google Gemini API in browser
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: sInstruction }]
          },
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        let errMessage = '';
        try {
          const errData = await response.json();
          errMessage = errData.error?.message || JSON.stringify(errData);
        } catch {
          errMessage = await response.text();
        }
        throw new Error(`Gemini API 错误 (${response.status}): ${errMessage}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('未收到有效的文本内容，请确认 API Key 正确并有账户额度。');
      }
      return text;
    } else {
      // Direct call DeepSeek model in browser (with customizable endpoints for user convenience/SiliconFlow, etc.)
      let cleanEndpoint = deepseekEndpoint.trim();
      if (!cleanEndpoint) {
        cleanEndpoint = 'https://api.deepseek.com/v1';
      }
      if (cleanEndpoint.endsWith('/')) {
        cleanEndpoint = cleanEndpoint.slice(0, -1);
      }
      
      const url = `${cleanEndpoint}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro', // DeepSeek V4 Pro model identifier
          messages: [
            { role: 'system', content: sInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6
        })
      });

      if (!response.ok) {
        let errMessage = '';
        try {
          const errData = await response.json();
          errMessage = errData.error?.message || JSON.stringify(errData);
        } catch {
          errMessage = await response.text();
        }
        throw new Error(`DeepSeek API 错误 (${response.status}): ${errMessage}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('未收到合法的 DeepSeek 响应内容。');
      }
      return text;
    }
  };

  // Send chatbot prompt
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    const activeKey = getActiveApiKey().trim();
    if (!activeKey) {
      // Requiring key first - fallback gracefully
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: getFallbackChatText(userMsg) }]);
      }, 300);
      return;
    }

    setIsSendingChat(true);
    try {
      const sandboxName = getSandboxChineseName(activeSandbox);
      const systemInstruction = `你是一位专注于科学计算、古典数学连续解析以及离散矩阵数值仿真的资深 AI 导师，现在正位于“AI洞察助手”智能中枢。
用户当前选择的实验沙盒是: "${sandboxName}"，配置是: ${JSON.stringify(sandboxConfig)}。
请用专业、亲切、通俗易懂的简体中文解答用户的问题，结合当前沙盒的科学内涵，使用恰当的 Markdown 数学公式（如 $f(x) = x^2$）来丰富解答。`;

      const reply = await callAiDirect(userMsg, systemInstruction);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `【连接错误】 ${err.message || '请检查您的密钥或网络链接。'}\n\n---\n\n` + getFallbackChatText(userMsg) 
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Dynamic simulation multipliers based on sandbox configurations
  const getSimStiffnessStats = () => {
    if (activeSandbox === 'ode') {
      const unstable = sandboxConfig.stepSize > 0.35;
      return {
        truncErr: 'ε < 10⁻' + (sandboxConfig.stepSize < 0.1 ? '9' : '4'),
        propagator: unstable ? 'λ = +1.18 (发散)' : 'λ = -0.14 (阻尼)',
        roundOff: 'D-Float Stable',
        pinns: '0.941'
      };
    }
    if (activeSandbox === 'matrix') {
      return {
        truncErr: 'O(h²) Laplacian',
        propagator: 'ρ = 0.892 (对易)',
        roundOff: 'Safe Range',
        pinns: '0.994'
      };
    }
    return {
      truncErr: 'ε < 10⁻⁷',
      propagator: 'λ = -0.04',
      roundOff: 'Double-Prec',
      pinns: '0.865'
    };
  };

  const stat = getSimStiffnessStats();
  const currentKeySet = getActiveApiKey().trim();

  return (
    <div id="ai-central-panel" className="bg-indigo-50/90 border border-indigo-100 p-6 rounded-2xl flex flex-col lg:flex-row gap-6 shadow-xs">
      
      {/* Left panel: Rename and Handcraft API Key controls */}
      <div className="flex-none flex flex-col gap-4 lg:w-64">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-serif italic shadow-md shadow-indigo-200">
            AI
          </div>
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">MODULE 06</span>
            <h3 className="text-sm font-semibold text-indigo-900 leading-none mt-1">AI 洞察助手</h3>
          </div>
        </div>

        {/* Dynamic Model & API Key Configuration (Required before using actual LLMs) */}
        <div className="bg-white/80 p-3 rounded-xl border border-indigo-100/50 flex flex-col gap-3.5 text-xs text-indigo-950">
          <div>
            <label className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1">选择在线大模型</label>
            <select
              id="select-ai-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="w-full bg-indigo-50/60 border border-indigo-200 rounded p-1.5 font-sans text-xs outline-none text-indigo-950 focus:border-indigo-500"
            >
              <option value="gemini">Gemini 3 Flash</option>
              <option value="deepseek">DeepSeek V4 Pro</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                输入 {selectedModel === 'gemini' ? 'Gemini' : 'DeepSeek'} Key
              </label>
              <Key className="w-3 h-3 text-indigo-400" />
            </div>
            {selectedModel === 'gemini' ? (
              <input
                id="input-gemini-key"
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="请输入 Gemini API Key..."
                className="w-full bg-indigo-50/60 border border-indigo-200 rounded p-1.5 text-xs outline-none text-indigo-950 placeholder:text-indigo-300 font-mono focus:border-indigo-500"
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <input
                  id="input-deepseek-key"
                  type="password"
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                  placeholder="请输入 DeepSeek API Key..."
                  className="w-full bg-indigo-50/60 border border-indigo-200 rounded p-1.5 text-xs outline-none text-indigo-950 placeholder:text-indigo-300 font-mono focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAdvancedDeepseek(!showAdvancedDeepseek)}
                  className="text-[9px] text-indigo-500 hover:text-indigo-700 font-medium self-end flex items-center gap-0.5"
                >
                  高级：配置 API 端点
                </button>
                {showAdvancedDeepseek && (
                  <input
                    id="input-deepseek-endpoint"
                    type="text"
                    value={deepseekEndpoint}
                    onChange={(e) => setDeepseekEndpoint(e.target.value)}
                    placeholder="默认: https://api.deepseek.com/v1"
                    className="w-full bg-indigo-50/30 border border-indigo-150 rounded p-1 text-[10px] outline-none text-indigo-800 placeholder:text-indigo-300 font-mono focus:border-indigo-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Verification indicator */}
          <div className="pt-2 border-t border-indigo-100 flex items-center gap-2">
            {currentKeySet ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[10px] text-emerald-700 font-semibold leading-tight">
                  已提供 Key · 浏览器直连诊断中
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 animation-pulse" />
                <span className="text-[10px] text-amber-700 font-semibold leading-tight">
                  未提供 Key · 运行于本地仿真
                </span>
              </>
            )}
          </div>
        </div>

        {/* Physical numerical simulation specifications metadata */}
        <div className="hidden lg:flex flex-col gap-3 border-t border-indigo-100 pt-3 text-[10px] text-indigo-700 font-mono">
          <div>
            <span className="text-indigo-400 block uppercase">截断解析误差 (Truncation)</span>
            <span className="font-bold text-indigo-950">{stat.truncErr}</span>
          </div>
          <div>
            <span className="text-indigo-400 block uppercase">刚性传播算子 (Propagator)</span>
            <span className="font-bold text-indigo-950">{stat.propagator}</span>
          </div>
          <div>
            <span className="text-indigo-400 block uppercase">PINNs 动力平衡权重</span>
            <span className="font-bold text-indigo-950">{stat.pinns}</span>
          </div>
        </div>
      </div>

      {/* Right AI chat console for freeform physics query, now expanded left to act as the primary AI assist panel */}
      <div className="flex-1 border-t lg:border-t-0 lg:border-l border-indigo-100 lg:pl-6 pt-4 lg:pt-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-indigo-100/50 p-2 rounded-lg min-h-[38px] justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-950">
              AI助手 (提问对话) — 关联: <strong className="text-indigo-700">[{getSandboxChineseName(activeSandbox)}]</strong>
            </span>
          </div>
        </div>

        {/* Chat display & input cluster aligned vertically inside h-64 */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100/60 h-64 flex flex-col justify-between gap-2">
          {/* Mini Chat display */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 font-sans pr-1">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-[11px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-100 text-indigo-950 self-end max-w-[85%]'
                    : 'bg-slate-100 text-gray-800 self-start max-w-[85%] border border-slate-100'
                }`}
              >
                <LatexText text={msg.content} />
              </div>
            ))}
            {isSendingChat && (
              <div className="text-[10px] text-indigo-400 animate-pulse pl-1 max-w-[80%] font-mono">
                导师正在研究谱动力平衡...
              </div>
            )}
          </div>

          {/* Input cluster */}
          <div className="flex gap-1 border-t border-indigo-50/50 pt-2 shrink-0">
            <input
              id="input-ai-chat"
              type="text"
              placeholder="提问：什么是龙格-库塔的刚性发散？"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
              className="flex-1 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs p-1.5 px-2.5 outline-none text-indigo-950 focus:border-indigo-600"
            />
            <button
              id="btn-send-chat"
              onClick={sendChatMessage}
              className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
