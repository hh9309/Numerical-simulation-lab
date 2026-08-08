import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Compass, Sliders, Sparkles, HelpCircle, Activity, ArrowRight, Dribbble } from 'lucide-react';
import { MathComponent, LatexText } from './MathRenderer';

export default function MatrixSolverLab() {
  // --- Standard 3D Terrain State & Coefficients ---
  const [optMethod, setOptMethod] = useState<'gd' | 'momentum' | 'adam'>('momentum');
  const [lr, setLr] = useState<number>(0.12);
  const [optimizerMomentum, setOptimizerMomentum] = useState<number>(0.85);
  
  // Custom interactive physical state coefficients
  const [gravity, setGravity] = useState<number>(5.5);
  const [damping, setDamping] = useState<number>(0.16);
  const [springStrength, setSpringStrength] = useState<number>(18.0);

  // Ball positions & tracking
  const [pX, setPX] = useState<number>(2.5);
  const [pY, setPY] = useState<number>(-2.2);
  const [targetX, setTargetX] = useState<number>(2.5);
  const [targetY, setTargetY] = useState<number>(-2.2);
  const [optPath, setOptPath] = useState<{ x: number; y: number; z: number }[]>([]);
  
  const [isOptRunning, setIsOptRunning] = useState<boolean>(false);
  const [yaw, setYaw] = useState<number>(-0.75);
  const [pitch, setPitch] = useState<number>(0.55);

  // Numerical metrics
  const [iterations, setIterations] = useState<number>(0);
  const [currentZ, setCurrentZ] = useState<number>(0);
  const [currentVelocity, setCurrentVelocity] = useState<number>(0);

  // Refs for animation fluid performance and to prevent closure stale state reading
  const pXRef = useRef<number>(2.5);
  const pYRef = useRef<number>(-2.2);
  const targetXRef = useRef<number>(2.5);
  const targetYRef = useRef<number>(-2.2);
  const velXRef = useRef<number>(0.0);
  const velYRef = useRef<number>(0.0);
  const optPathRef = useRef<{ x: number; y: number; z: number }[]>([]);
  
  const mathVelRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mathAdamMRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mathAdamVRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mathAdamStepRef = useRef<number>(0);

  // Drag interaction trackers
  const isDraggingRef = useRef<boolean>(false);
  const lastDragTimeRef = useRef<number>(0);
  const lastDragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    type: 'drag_ball' | 'orbit';
    startX: number;
    startY: number;
    startYaw?: number;
    startPitch?: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic surface target function F(x, y) (with multiple wavy hills & valleys)
  const computeZ = (x: number, y: number) => {
    return 0.15 * (x * x + y * y) - 0.8 * Math.cos(1.8 * x) * Math.cos(1.8 * y) + 0.8;
  };

  // Slope / Gradient evaluation (analytical partial derivatives)
  const computeGradient = (x: number, y: number) => {
    const dx = 0.3 * x + 1.44 * Math.sin(1.8 * x) * Math.cos(1.8 * y);
    const dy = 0.3 * y + 1.44 * Math.cos(1.8 * x) * Math.sin(1.8 * y);
    return { dx, dy };
  };

  // Sync references when state changes externally via buttons / sliders
  useEffect(() => {
    pXRef.current = pX;
    pYRef.current = pY;
    setCurrentZ(computeZ(pX, pY));
  }, [pX, pY]);

  useEffect(() => {
    targetXRef.current = targetX;
    targetYRef.current = targetY;
  }, [targetX, targetY]);

  useEffect(() => {
    optPathRef.current = optPath;
  }, [optPath]);

  // Sync solver metrics
  const resetOptimization = () => {
    setIsOptRunning(false);
    pXRef.current = 2.5;
    pYRef.current = -2.2;
    targetXRef.current = 2.5;
    targetYRef.current = -2.2;
    velXRef.current = 0.0;
    velYRef.current = 0.0;
    
    setPX(2.5);
    setPY(-2.2);
    setTargetX(2.5);
    setTargetY(-2.2);
    
    const initialZ = computeZ(2.5, -2.2);
    const path = [{ x: 2.5, y: -2.2, z: initialZ }];
    setOptPath(path);
    optPathRef.current = path;
    
    setIterations(0);
    setCurrentVelocity(0);

    mathVelRef.current = { x: 0, y: 0 };
    mathAdamMRef.current = { x: 0, y: 0 };
    mathAdamVRef.current = { x: 0, y: 0 };
    mathAdamStepRef.current = 0;
  };

  // Advance the analytical math solver one iteration
  const advanceSolverMathStep = () => {
    const tx = targetXRef.current;
    const ty = targetYRef.current;
    const g = computeGradient(tx, ty);

    let nextTx = tx;
    let nextTy = ty;

    if (optMethod === 'gd') {
      nextTx = tx - lr * g.dx;
      nextTy = ty - lr * g.dy;
    } else if (optMethod === 'momentum') {
      const vx = optimizerMomentum * mathVelRef.current.x + lr * g.dx;
      const vy = optimizerMomentum * mathVelRef.current.y + lr * g.dy;
      mathVelRef.current = { x: vx, y: vy };
      nextTx = tx - vx;
      nextTy = ty - vy;
    } else if (optMethod === 'adam') {
      mathAdamStepRef.current += 1;
      const b1 = 0.9;
      const b2 = 0.999;
      const eps = 1e-8;

      const mx = b1 * mathAdamMRef.current.x + (1 - b1) * g.dx;
      const my = b1 * mathAdamMRef.current.y + (1 - b1) * g.dy;
      mathAdamMRef.current = { x: mx, y: my };

      const vx = b2 * mathAdamVRef.current.x + (1 - b2) * g.dx * g.dx;
      const vy = b2 * mathAdamVRef.current.y + (1 - b2) * g.dy * g.dy;
      mathAdamVRef.current = { x: vx, y: vy };

      const mHatX = mx / (1 - Math.pow(b1, mathAdamStepRef.current));
      const mHatY = my / (1 - Math.pow(b1, mathAdamStepRef.current));

      const vHatX = vx / (1 - Math.pow(b2, mathAdamStepRef.current));
      const vHatY = vy / (1 - Math.pow(b2, mathAdamStepRef.current));

      nextTx = tx - (lr * mHatX) / (Math.sqrt(vHatX) + eps);
      nextTy = ty - (lr * mHatY) / (Math.sqrt(vHatY) + eps);
    }

    // Constraint within visual space
    nextTx = Math.min(3.0, Math.max(-3.0, nextTx));
    nextTy = Math.min(3.0, Math.max(-3.0, nextTy));

    targetXRef.current = nextTx;
    setTargetX(nextTx);
    setTargetY(nextTy);

    const matchZ = computeZ(nextTx, nextTy);
    const newPath = [...optPathRef.current, { x: nextTx, y: nextTy, z: matchZ }];
    if (newPath.length > 250) {
      newPath.shift();
    }
    optPathRef.current = newPath;
    setOptPath(newPath);
    setIterations(prev => prev + 1);

    const gradNorm = Math.hypot(g.dx, g.dy);
    if (gradNorm < 1e-4) {
      setIsOptRunning(false);
    }
  };

  // Dynamic continuous schedule for mathematical solver steps
  useEffect(() => {
    if (isOptRunning) {
      loopTimerRef.current = setInterval(() => {
        advanceSolverMathStep();
      }, 450);
    } else {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    }
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    };
  }, [isOptRunning, lr, optimizerMomentum, optMethod]);

  // Handle click on canvas and drag interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cx = rect.width / 2;
    const cy = rect.height / 2 + 15;
    const scale = Math.min(rect.width, rect.height) * 0.14;

    const xp = pXRef.current;
    const yp = pYRef.current;
    const zp = computeZ(xp, yp);

    // Project coordinates to 2D viewport
    const x1 = xp * Math.cos(yaw) - yp * Math.sin(yaw);
    const y1 = xp * Math.sin(yaw) + yp * Math.cos(yaw);
    const z1 = zp;

    const x2 = x1;
    const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);

    const ballSx = cx + scale * x2;
    const ballSy = cy - scale * y2;

    const distanceToBall = Math.hypot(mouseX - ballSx, mouseY - ballSy);

    if (distanceToBall < 20) {
      // User targeted the physics ball
      isDraggingRef.current = true;
      dragStateRef.current = {
        type: 'drag_ball',
        startX: mouseX,
        startY: mouseY,
      };
      
      velXRef.current = 0.0;
      velYRef.current = 0.0;
      lastDragTimeRef.current = performance.now();
      lastDragPosRef.current = { x: xp, y: yp };
    } else {
      // Rotating the 3D grid viewport
      dragStateRef.current = {
        type: 'orbit',
        startX: mouseX,
        startY: mouseY,
        startYaw: yaw,
        startPitch: pitch,
      };
    }

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!dragStateRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const drag = dragStateRef.current;

    if (drag.type === 'orbit') {
      const deltaX = mouseX - drag.startX;
      const deltaY = mouseY - drag.startY;
      setYaw((drag.startYaw ?? -0.75) + deltaX * 0.012);
      setPitch(Math.max(0.12, Math.min(Math.PI / 2 - 0.08, (drag.startPitch ?? 0.55) - deltaY * 0.012)));
    } else if (drag.type === 'drag_ball') {
      const cx = rect.width / 2;
      const cy = rect.height / 2 + 15;
      const scale = Math.min(rect.width, rect.height) * 0.14;

      let bestX = pXRef.current;
      let bestY = pYRef.current;
      let minDist = Infinity;

      // Un-project mouse coordinates to recover 3D spatial points
      for (let mx = -3.0; mx <= 3.0; mx += 0.08) {
        for (let my = -3.0; my <= 3.0; my += 0.08) {
          const mz = computeZ(mx, my);
          const x1 = mx * Math.cos(yaw) - my * Math.sin(yaw);
          const y1 = mx * Math.sin(yaw) + my * Math.cos(yaw);
          const z1 = mz;

          const x2 = x1;
          const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);

          const sx = cx + scale * x2;
          const sy = cy - scale * y2;

          const d = Math.hypot(mouseX - sx, mouseY - sy);
          if (d < minDist) {
            minDist = d;
            bestX = mx;
            bestY = my;
          }
        }
      }

      const roundedX = Math.min(3.0, Math.max(-3.0, bestX));
      const roundedY = Math.min(3.0, Math.max(-3.0, bestY));

      // Continuous drag speed / velocity estimation
      const now = performance.now();
      const dt = (now - lastDragTimeRef.current) / 1000;
      if (dt > 0.005) {
        const measuredVx = (roundedX - lastDragPosRef.current.x) / dt;
        const measuredVy = (roundedY - lastDragPosRef.current.y) / dt;
        
        // Low-pass filter to dampen jittering speed readings
        velXRef.current = velXRef.current * 0.35 + measuredVx * 0.65;
        velYRef.current = velYRef.current * 0.35 + measuredVy * 0.65;
      }
      lastDragTimeRef.current = now;
      lastDragPosRef.current = { x: roundedX, y: roundedY };

      pXRef.current = roundedX;
      pYRef.current = roundedY;
      
      setPX(roundedX);
      setPY(roundedY);

      // If user drags the ball, matching the analytical target there immediately
      targetXRef.current = roundedX;
      targetYRef.current = roundedY;
      setTargetX(roundedX);
      setTargetY(roundedY);
    }
  };

  const handleGlobalMouseUp = () => {
    isDraggingRef.current = false;
    dragStateRef.current = null;
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  // Clean up global drag listeners
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [yaw, pitch]);

  // Initialize initial coordinate state
  useEffect(() => {
    if (optPath.length === 0) {
      setOptPath([{ x: pX, y: pY, z: computeZ(pX, pY) }]);
    }
  }, []);

  // --- Real-time Physical Interleaved Simulation & 60 FPS Render Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updatePhysicsTicks = (dt: number) => {
      if (isDraggingRef.current) return;

      const currX = pXRef.current;
      const currY = pYRef.current;

      // 1. Calculate gravity/slope force (pulls down the slope: proportional to the negative gradient)
      const grad = computeGradient(currX, currY);
      const F_gravity_x = -grad.dx * gravity;
      const F_gravity_y = -grad.dy * gravity;

      // 2. Coupling spring force towards analytical optimizer target
      const springK = isOptRunning ? springStrength : 0;
      const F_spring_x = springK * (targetXRef.current - currX);
      const F_spring_y = springK * (targetYRef.current - currY);

      // Total forces sum
      const accelX = F_gravity_x + F_spring_x;
      const accelY = F_gravity_y + F_spring_y;

      // Apply drag / friction damping
      const dragFactor = Math.exp(-damping * 10 * dt); // Exponential damping with dt
      let newVx = (velXRef.current + accelX * dt) * dragFactor;
      let newVy = (velYRef.current + accelY * dt) * dragFactor;

      // Numerical integration to compute visual rolling coordinates
      let nextX = currX + newVx * dt;
      let nextY = currY + newVy * dt;

      // Coordinate boundaries with elastic collision bounce restitution
      const boundaryLimit = 3.0;
      const bounceRestitution = -0.45; // reverse and absorb 55% energy

      if (nextX < -boundaryLimit) {
        nextX = -boundaryLimit;
        newVx *= bounceRestitution;
      } else if (nextX > boundaryLimit) {
        nextX = boundaryLimit;
        newVx *= bounceRestitution;
      }

      if (nextY < -boundaryLimit) {
        nextY = -boundaryLimit;
        newVy *= bounceRestitution;
      } else if (nextY > boundaryLimit) {
        nextY = boundaryLimit;
        newVy *= bounceRestitution;
      }

      // Record states back
      velXRef.current = newVx;
      velYRef.current = newVy;
      pXRef.current = nextX;
      pYRef.current = nextY;

      // Sync state back to React seamlessly
      setPX(nextX);
      setPY(nextY);
      setCurrentVelocity(Math.hypot(newVx, newVy));
    };

    const draw3DSandboxGameCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 480;
      const h = rect.height || 380;

      // Support high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Premium Cyber Slate grid space canvas
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 18;
      const scale = Math.min(w, h) * 0.145;

      // Unified 3D Projection coordinate system matrix
      const project = (xp: number, yp: number, zp: number): [number, number, number] => {
        const x1 = xp * Math.cos(yaw) - yp * Math.sin(yaw);
        const y1 = xp * Math.sin(yaw) + yp * Math.cos(yaw);
        const z1 = zp;

        const x2 = x1;
        const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
        const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

        const sx = cx + scale * x2;
        const sy = cy - scale * y2;
        return [sx, sy, z2];
      };

      // 1. Calculate physical vertices mesh
      const meshN = 25; // Dense grid points
      const meshPoints: [number, number, number][][] = [];
      for (let i = 0; i < meshN; i++) {
        meshPoints[i] = [];
        for (let j = 0; j < meshN; j++) {
          const mx = -3.0 + (6.0 * i) / (meshN - 1);
          const my = -3.0 + (6.0 * j) / (meshN - 1);
          const mz = computeZ(mx, my);
          meshPoints[i][j] = [mx, my, mz];
        }
      }

      // Gather quad surfaces and sort by depth coordinate to resolve Z-fighting
      interface VisualQuad {
        i: number;
        j: number;
        depth: number;
      }
      const quads: VisualQuad[] = [];
      for (let i = 0; i < meshN - 1; i++) {
        for (let j = 0; j < meshN - 1; j++) {
          const [, , d1] = project(...meshPoints[i][j]);
          const [, , d2] = project(...meshPoints[i + 1][j]);
          const [, , d3] = project(...meshPoints[i + 1][j + 1]);
          const [, , d4] = project(...meshPoints[i][j + 1]);
          const avgDepth = (d1 + d2 + d3 + d4) / 4;
          quads.push({ i, j, depth: avgDepth });
        }
      }

      quads.sort((a, b) => a.depth - b.depth);

      // Render sorted 3D tiles with dynamic height color interpolation
      quads.forEach(({ i, j }) => {
        const p1 = meshPoints[i][j];
        const p2 = meshPoints[i + 1][j];
        const p3 = meshPoints[i + 1][j + 1];
        const p4 = meshPoints[i][j + 1];

        const [s1x, s1y] = project(...p1);
        const [s2x, s2y] = project(...p2);
        const [s3x, s3y] = project(...p3);
        const [s4x, s4y] = project(...p4);

        const zAverage = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;
        
        // Map height to a sleek glowing cyber palette
        const htRatio = Math.min(1.0, Math.max(0, zAverage / 2.3));
        const rColor = Math.round(15 + htRatio * (210 - 15));
        const gColor = Math.round(23 + htRatio * (90 - 23));
        const bColor = Math.round(180 + (1 - htRatio) * (110 - 180));

        // Tile background
        ctx.fillStyle = `rgba(12, 19, 39, 0.78)`;
        ctx.beginPath();
        ctx.moveTo(s1x, s1y);
        ctx.lineTo(s2x, s2y);
        ctx.lineTo(s3x, s3y);
        ctx.lineTo(s4x, s4y);
        ctx.closePath();
        ctx.fill();

        // Edge wireframe line
        ctx.strokeStyle = `rgba(${rColor}, ${gColor}, ${bColor}, 0.28)`;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });

      // 2. Coordinate floor boundaries outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      const boundaryPts = [
        [-3, -3, 0], [3, -3, 0], [3, 3, 0], [-3, 3, 0],
        [-3, -3, 2.5], [3, -3, 2.5], [3, 3, 2.5], [-3, 3, 2.5]
      ];
      const sBounds = boundaryPts.map(pt => project(pt[0], pt[1], pt[2]));
      ctx.beginPath();
      ctx.moveTo(sBounds[0][0], sBounds[0][1]);
      ctx.lineTo(sBounds[1][0], sBounds[1][1]);
      ctx.lineTo(sBounds[2][0], sBounds[2][1]);
      ctx.lineTo(sBounds[3][0], sBounds[3][1]);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw bounding box vertical staves on four corners
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(sBounds[k][0], sBounds[k][1]);
        ctx.lineTo(sBounds[k + 4][0], sBounds[k + 4][1]);
      }
      ctx.stroke();

      // 3. Render analytical convergence trace paths (Emerald ribbon with shadow projection)
      if (optPathRef.current.length > 1) {
        // Shadow trail projection on the basin floor
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.09)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const [flX, flY] = project(optPathRef.current[0].x, optPathRef.current[0].y, 0);
        ctx.moveTo(flX, flY);
        for (let k = 1; k < optPathRef.current.length; k++) {
          const [shX, shY] = project(optPathRef.current[k].x, optPathRef.current[k].y, 0);
          ctx.lineTo(shX, shY);
        }
        ctx.stroke();

        // Authentic 3D surface trace line with neon glow setting
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const [startSx, startSy] = project(optPathRef.current[0].x, optPathRef.current[0].y, optPathRef.current[0].z);
        ctx.moveTo(startSx, startSy);
        for (let k = 1; k < optPathRef.current.length; k++) {
          const [sx, sy] = project(optPathRef.current[k].x, optPathRef.current[k].y, optPathRef.current[k].z);
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0; // reset shadow glow
        ctx.shadowColor = 'transparent';

        // Convergence step dots
        optPathRef.current.forEach((pt, k) => {
          if (k % 4 === 0 || k === optPathRef.current.length - 1) {
            const [sx, sy] = project(pt.x, pt.y, pt.z);
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = k === optPathRef.current.length - 1 ? '#34d399' : 'rgba(52, 211, 153, 0.7)';
            ctx.fill();
          }
        });
      }

      // 4. Render Active target Attractor tracking point (Gold crosshairs)
      if (isOptRunning) {
        const activeTargetX = targetXRef.current;
        const activeTargetY = targetYRef.current;
        const activeTargetZ = computeZ(activeTargetX, activeTargetY);
        const [targetSx, targetSy] = project(activeTargetX, activeTargetY, activeTargetZ);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(targetSx, targetSy, 8, 0, 2 * Math.PI);
        ctx.stroke();

        // Crosshairs lines
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.beginPath();
        ctx.moveTo(targetSx - 15, targetSy);
        ctx.lineTo(targetSx + 15, targetSy);
        ctx.moveTo(targetSx, targetSy - 15);
        ctx.lineTo(targetSx, targetSy + 15);
        ctx.stroke();

        // Label annotation
        ctx.fillStyle = '#f59e0b';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText("MATH TARGET", targetSx + 12, targetSy - 4);
      }

      // 5. Render Physical Converging Ball (Glass spheres with lighting highlights)
      const pxVal = pXRef.current;
      const pyVal = pYRef.current;
      const pzVal = computeZ(pxVal, pyVal);

      const [ballSx, ballSy] = project(pxVal, pyVal, pzVal);
      const [shadowSx, shadowSy] = project(pxVal, pyVal, 0);

      // Render physical shadow projection on coordinate floor basin
      ctx.beginPath();
      ctx.ellipse(shadowSx, shadowSy, 11, 5, 0, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(2, 4, 10, 0.65)';
      ctx.fill();

      // Draw altitude alignment vertical staff (ground correlation line)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(shadowSx, shadowSy);
      ctx.lineTo(ballSx, ballSy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw physical sphere marble with glowing glass specular overlay
      const ballRadius = 8.5;
      const sphereGrad = ctx.createRadialGradient(
        ballSx - ballRadius * 0.32,
        ballSy - ballRadius * 0.32,
        ballRadius * 0.08,
        ballSx,
        ballSy,
        ballRadius
      );
      sphereGrad.addColorStop(0, '#ff9090'); // Specular focus point
      sphereGrad.addColorStop(0.35, '#ef4444'); // Vivid red core
      sphereGrad.addColorStop(0.85, '#b91c1c'); // Red shadow boundary
      sphereGrad.addColorStop(1, '#6b1111'); // Dark ambient edge shadow

      ctx.beginPath();
      ctx.arc(ballSx, ballSy, ballRadius, 0, 2 * Math.PI);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Outer glassy translucent ring glow
      ctx.strokeStyle = 'rgba(252, 165, 165, 0.75)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // 6. Draw floating UI text HUD
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`物理状态向量 x_phys = [${pxVal.toFixed(3)}, ${pyVal.toFixed(3)}]`, 20, 28);
      ctx.fillText(`地形位能 F(x)       = ${pzVal.toFixed(4)} eV`, 20, 43);
      ctx.fillText(`当前滚动速率 |v|    = ${Math.hypot(velXRef.current, velYRef.current).toFixed(3)} m/s`, 20, 58);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀ 鼠标左键拖拽旋转视角 | 选中并滑动红色小球获得物理初速度 ◀', w / 2, h - 14);
      ctx.textAlign = 'left';
    };

    const continuousFrameLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.08); // cap dt to avoid numeric leaps on frame drops
      lastTime = time;

      updatePhysicsTicks(dt);
      draw3DSandboxGameCanvas();

      animationFrameId = requestAnimationFrame(continuousFrameLoop);
    };

    animationFrameId = requestAnimationFrame(continuousFrameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [yaw, pitch, isOptRunning, gravity, damping, springStrength]);

  return (
    <div id="sandbox-matrix" className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-white flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-widest block mb-1">
            05 LINEAR SYSTEMS & PHYSICS OPTIMIZATION
          </span>
          <h2 className="text-xl font-medium text-slate-100 tracking-tight flex items-center gap-2">
            三维地形梯度寻优与惯性物理仿真沙盒
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            在多峰值非线性连续位能曲面上，将梯度算法抽象为受引力约束的重力小球，通过惯性、阻尼系数等物理量逼近能级极限，实现高维代数矩阵的最优渐进松弛。
          </p>
        </div>
        
        <div className="mt-3 md:mt-0 flex gap-2">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 pointer-events-none flex items-center gap-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>实时物理反馈激活 (60 FPS)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Parameters & Optimizers Panels */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Card 1: Optimizer Controls */}
          <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-4">
            <div>
              <span className="text-[9px] text-emerald-400 font-extrabold tracking-widest uppercase block mb-1">ALGORITHM METHOD</span>
              <h3 className="text-xs font-bold text-slate-200">优化器算法选择及离散递推</h3>
            </div>

            {/* Selector */}
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-1.5">更新优化器架构</label>
              <select
                id="select-opt-method"
                value={optMethod}
                onChange={(e) => setOptMethod(e.target.value as any)}
                className="w-full text-xs bg-slate-900 border border-slate-700/80 rounded px-2.5 py-2 font-mono text-white outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="gd">经典梯度下降 (Vanilla Gradient Descent)</option>
                <option value="momentum">聚能动量加速法 (Momentum GD)</option>
                <option value="adam">自适应一二阶矩估计 (Adam Optimizer)</option>
              </select>
            </div>

            {/* Learning rate alpha */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span className="font-mono text-[11px]">步长/学习率 α = {lr.toFixed(3)}</span>
              </div>
              <input
                id="range-opt-lr"
                type="range"
                min="0.01"
                max="0.45"
                step="0.01"
                value={lr}
                onChange={(e) => setLr(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>

            {/* Momentum factor if applicable */}
            {optMethod === 'momentum' && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono text-[11px]">动量加速常数 β = {optimizerMomentum.toFixed(2)}</span>
                </div>
                <input
                  id="range-opt-momentum"
                  type="range"
                  min="0.4"
                  max="0.98"
                  step="0.02"
                  value={optimizerMomentum}
                  onChange={(e) => setOptimizerMomentum(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Card 2: Interactive Physics Sandbox parameters */}
          <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-4">
            <div>
              <span className="text-[9px] text-blue-400 font-extrabold tracking-widest uppercase block mb-1">PHYSICS SANDBOX ENGINE</span>
              <h3 className="text-xs font-bold text-slate-200">阻力、阻尼与滑行重力场设置</h3>
            </div>

            {/* Gravity */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  模拟重力常数 G = {gravity.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">坡度惯性滑行大小</span>
              </div>
              <input
                id="range-physics-gravity"
                type="range"
                min="0.0"
                max="10.0"
                step="0.2"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>

            {/* Damping / Friction */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  介质阻尼 / 摩擦系数 D = {damping.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">耗散位能与滑行速度</span>
              </div>
              <input
                id="range-physics-damping"
                type="range"
                min="0.0"
                max="0.8"
                step="0.02"
                value={damping}
                onChange={(e) => setDamping(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>

            {/* Elastic tracking strength */}
            <div className={isOptRunning ? "block" : "opacity-45 pointer-events-none transition-opacity"}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span className="font-mono text-[11px]">弹性绳曳拉系数 K = {springStrength.toFixed(0)}</span>
                <span className="text-[9px] text-slate-500">重力球追逐算法刚度</span>
              </div>
              <input
                id="range-physics-spring"
                type="range"
                min="5.0"
                max="45.0"
                step="1.0"
                value={springStrength}
                disabled={!isOptRunning}
                onChange={(e) => setSpringStrength(parseFloat(e.target.value))}
                className="w-full accent-orange-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons bar */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="btn-opt-toggle-run"
              onClick={() => setIsOptRunning(!isOptRunning)}
              className={`py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isOptRunning
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              }`}
            >
              {isOptRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>暂停算法</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 animate-pulse" />
                  <span>持续追踪</span>
                </>
              )}
            </button>
            
            <button
              id="btn-opt-step"
              disabled={isOptRunning}
              onClick={advanceSolverMathStep}
              className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-xs py-2 disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>单步递进</span>
            </button>

            <button
              id="btn-opt-reset"
              onClick={resetOptimization}
              className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
              title="复位环境"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>复位</span>
            </button>
          </div>

          {/* Diagnostic Stats Panel */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1.5 mb-1.5 text-slate-400 font-medium text-[10px]">
              <span>仿真求解器诊断指标</span>
              <span className="text-emerald-500">LIVE</span>
            </div>
            <div className="flex justify-between">
              <span>当前坐标 [x, y]：</span>
              <span className="text-emerald-400 font-medium">[{pX.toFixed(3)}, {pY.toFixed(3)}]</span>
            </div>
            <div className="flex justify-between">
              <span>曲面高度 F(x, y)：</span>
              <span className="text-emerald-400 font-medium">{currentZ.toFixed(5)} eV</span>
            </div>
            <div className="flex justify-between">
              <span>小球视线速率 |v|：</span>
              <span className="text-blue-400 font-medium">{currentVelocity.toFixed(3)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span>数学迭代状态 Step k：</span>
              <span className="text-amber-400 font-medium">{iterations} 次</span>
            </div>
          </div>

        </div>

        {/* 3D Visual Mesh Canvas Right panel */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Main Renderer Container */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col relative overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className="w-full h-[400px] bg-[#0a0f1d] rounded-lg cursor-grab active:cursor-grabbing border border-slate-900 shadow-inner"
            />
            
            {/* Camera Coordinates Overlay badge */}
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800/80 rounded-md px-2.5 py-1.5 text-[9px] font-mono text-slate-400 pointer-events-none flex items-center gap-2 shadow-lg">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Yaw: {(yaw * (180 / Math.PI)).toFixed(0)}° | Pitch: {(pitch * (180 / Math.PI)).toFixed(0)}°
              </span>
            </div>

            {/* Drag helper indicators */}
            <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-slate-800/85 rounded p-2 text-[10px] font-sans text-slate-400 pointer-events-none flex flex-col gap-1 shadow-sm max-w-[210px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>红色高透重力玻璃球 (物理态)</span>
              </div>
              {isOptRunning && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>金色锁定圆环 (数学优化解析态)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>最优渐进收敛路径 (Trace轨迹)</span>
              </div>
            </div>
          </div>

          {/* Mathematical Insights Panel (Explosition of Physical vs Solver duality) */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 leading-relaxed text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              THEORETICAL DUALITY OF INERTIA OPTIMIZATION - 物理与数学的对偶性
            </span>
            <p className="font-sans text-xs text-slate-400 leading-relaxed mb-3">
              在梯度下降的演进中，经典算法与质点受力物理规律天然吻合。如果我们将算法中学习率 <MathComponent math="\alpha" /> 与动量 <MathComponent math="\beta" /> 映射至经典牛顿力学，可以得到绝妙的代数自恰：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 p-3 rounded border border-slate-850 flex flex-col gap-1.5">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">重力势能与损失函数梯度度量</span>
                <MathComponent math="x^{(k+1)} = x^{(k)} - \alpha \nabla f(x^{(k)})" block={true} />
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  如果我们将损失函数 <MathComponent math="F(x)" /> 建模成地球重力位能，梯度 <MathComponent math="\nabla f(x)" /> 即为最大下降方向，小球所受重力切向分量时刻拉拽小球朝势阱底涌进。
                </p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded border border-slate-850 flex flex-col gap-1.5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">聚能动量加速法对应物理小球惯性</span>
                <MathComponent math="v^{(k+1)} = \beta v^{(k)} + \alpha \nabla f(x^{(k)})" block={true} />
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  二阶牛顿惯性运动中：极小值点梯度为零零但小球因惯性冲上陡坡、跃出局部势垒与最优极值局限。动量因子二阶衰落阻碍机制完美抵御了数值鞍点的振荡问题。
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
