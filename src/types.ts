export type SandboxType = 'root' | 'integration' | 'ode' | 'montecarlo' | 'matrix';

// Root Finding Types
export interface RootFindingStep {
  step: number;
  x: number;          // Current guess or midpoint
  fx: number;         // function value at x
  error: number;      // absolute difference or interval width
  extra?: {           // method-specific details
    a?: number;       // left boundary for Bisection
    b?: number;       // right boundary for Bisection
    tangentX0?: number; // Newton tangent start
    tangentX1?: number; // Newton tangent intersection
  };
}

export type RootResultStatus = 'converged' | 'max_reached' | 'failed';

export interface RootFindingResult {
  steps: RootFindingStep[];
  root: number;
  status: RootResultStatus;
  message: string;
}

// Numerical Integration Types
export interface IntegrationSubdivision {
  index: number;
  xStart: number;
  xEnd: number;
  yEval: number;      // Value at evaluation point
  area: number;       // Component area
}

export interface IntegrationResult {
  subdivisions: IntegrationSubdivision[];
  numericalValue: number;
  analyticalValue: number;
  errorPercentage: number;
}

// ODE Solver Types
export interface OdePoint {
  t: number;
  y: number[];        // State vector (e.g. [position, velocity] or [prey, predator])
  exactY?: number[];  // Analytical comparison if available
}

export interface OdeResult {
  points: OdePoint[];
  finalTime: number;
  errorAccumulated: number;
}

// Monte Carlo Types
export interface MonteCarloPoint {
  x: number;
  y: number;
  isInside: boolean;  // Inside circle or region
}

export interface BuffonNeedle {
  x: number;          // Center X
  y: number;          // Center Y
  angle: number;      // Angle in radians
  isCrossing: boolean; // Crosses grid lines
}

export interface MonteCarloResult {
  ratioInside: number;
  estimatedConstant: number;
  actualConstant: number;
  errorPercentage: number;
}

// Matrix Grid Solver Types
export interface MatrixSolverResult {
  grid: number[][];   // 2D grid values
  iterations: number;
  residuals: number[]; // Change per iteration
  isConverged: boolean;
}
