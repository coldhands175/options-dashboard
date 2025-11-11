/**
 * Black-Scholes Options Pricing Model
 *
 * Calculates theoretical option prices and Greeks (Delta, Gamma, Theta, Vega, Rho)
 * for European-style options.
 *
 * Note: American-style options may have different values due to early exercise,
 * but Black-Scholes provides a good approximation for most cases.
 */

// ===== Types =====

export interface OptionInput {
  /** Current stock price */
  stockPrice: number;
  /** Option strike price */
  strikePrice: number;
  /** Days until expiration */
  daysToExpiration: number;
  /** Risk-free interest rate (annual, as decimal, e.g., 0.05 for 5%) */
  riskFreeRate: number;
  /** Implied volatility (annual, as decimal, e.g., 0.30 for 30%) */
  impliedVolatility: number;
  /** Option type */
  optionType: 'CALL' | 'PUT';
  /** Dividend yield (annual, as decimal, optional) */
  dividendYield?: number;
}

export interface Greeks {
  /** Delta: Rate of change of option price with respect to stock price (-1 to 1) */
  delta: number;
  /** Gamma: Rate of change of delta with respect to stock price */
  gamma: number;
  /** Theta: Rate of change of option price with respect to time (daily decay) */
  theta: number;
  /** Vega: Rate of change of option price with respect to volatility */
  vega: number;
  /** Rho: Rate of change of option price with respect to interest rate */
  rho: number;
  /** Theoretical option price based on Black-Scholes */
  theoreticalPrice: number;
  /** Intrinsic value */
  intrinsicValue: number;
  /** Extrinsic value (time value) */
  extrinsicValue: number;
}

// ===== Helper Functions =====

/**
 * Standard normal cumulative distribution function (CDF)
 * Approximation using Abramowitz and Stegun formula
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return x > 0 ? 1 - prob : prob;
}

/**
 * Standard normal probability density function (PDF)
 */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 parameter for Black-Scholes
 */
function calculateD1(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  q: number = 0
): number {
  if (T <= 0 || sigma <= 0) return 0;

  return (
    (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) /
    (sigma * Math.sqrt(T))
  );
}

/**
 * Calculate d2 parameter for Black-Scholes
 */
function calculateD2(d1: number, sigma: number, T: number): number {
  if (T <= 0) return 0;
  return d1 - sigma * Math.sqrt(T);
}

// ===== Main Functions =====

/**
 * Calculate option price and all Greeks using Black-Scholes model
 *
 * @param input - Option parameters
 * @returns Greeks and theoretical price
 */
export function calculateGreeks(input: OptionInput): Greeks {
  const {
    stockPrice: S,
    strikePrice: K,
    daysToExpiration,
    riskFreeRate: r,
    impliedVolatility: sigma,
    optionType,
    dividendYield: q = 0,
  } = input;

  // Convert days to years
  const T = daysToExpiration / 365;

  // Handle edge cases
  if (T <= 0) {
    const intrinsic = optionType === 'CALL'
      ? Math.max(0, S - K)
      : Math.max(0, K - S);

    return {
      delta: optionType === 'CALL' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      theoreticalPrice: intrinsic,
      intrinsicValue: intrinsic,
      extrinsicValue: 0,
    };
  }

  if (sigma <= 0 || S <= 0 || K <= 0) {
    return {
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      theoreticalPrice: 0,
      intrinsicValue: 0,
      extrinsicValue: 0,
    };
  }

  // Calculate d1 and d2
  const d1 = calculateD1(S, K, T, r, sigma, q);
  const d2 = calculateD2(d1, sigma, T);

  // Calculate N(d1) and N(d2) for calls, or N(-d1) and N(-d2) for puts
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const NminusD1 = normalCDF(-d1);
  const NminusD2 = normalCDF(-d2);
  const nd1 = normalPDF(d1); // Same for both call and put

  // Discount factors
  const discountFactor = Math.exp(-r * T);
  const dividendDiscount = Math.exp(-q * T);

  // ===== Calculate Option Price =====
  let theoreticalPrice: number;
  if (optionType === 'CALL') {
    theoreticalPrice = S * dividendDiscount * Nd1 - K * discountFactor * Nd2;
  } else {
    theoreticalPrice = K * discountFactor * NminusD2 - S * dividendDiscount * NminusD1;
  }

  // ===== Calculate Greeks =====

  // Delta
  let delta: number;
  if (optionType === 'CALL') {
    delta = dividendDiscount * Nd1;
  } else {
    delta = -dividendDiscount * NminusD1;
  }

  // Gamma (same for calls and puts)
  const gamma = (dividendDiscount * nd1) / (S * sigma * Math.sqrt(T));

  // Theta (daily decay)
  let theta: number;
  const term1 = -(S * nd1 * sigma * dividendDiscount) / (2 * Math.sqrt(T));

  if (optionType === 'CALL') {
    const term2 = -r * K * discountFactor * Nd2;
    const term3 = q * S * dividendDiscount * Nd1;
    theta = (term1 + term2 + term3) / 365; // Convert to daily
  } else {
    const term2 = r * K * discountFactor * NminusD2;
    const term3 = -q * S * dividendDiscount * NminusD1;
    theta = (term1 + term2 + term3) / 365; // Convert to daily
  }

  // Vega (per 1% change in volatility)
  const vega = (S * dividendDiscount * nd1 * Math.sqrt(T)) / 100;

  // Rho (per 1% change in interest rate)
  let rho: number;
  if (optionType === 'CALL') {
    rho = (K * T * discountFactor * Nd2) / 100;
  } else {
    rho = -(K * T * discountFactor * NminusD2) / 100;
  }

  // Calculate intrinsic and extrinsic value
  const intrinsicValue = optionType === 'CALL'
    ? Math.max(0, S - K)
    : Math.max(0, K - S);
  const extrinsicValue = Math.max(0, theoreticalPrice - intrinsicValue);

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
    theoreticalPrice: Number(theoreticalPrice.toFixed(2)),
    intrinsicValue: Number(intrinsicValue.toFixed(2)),
    extrinsicValue: Number(extrinsicValue.toFixed(2)),
  };
}

/**
 * Calculate portfolio-level Greeks by summing individual position Greeks
 *
 * @param positions - Array of positions with their Greeks
 * @returns Aggregate portfolio Greeks
 */
export function calculatePortfolioGreeks(
  positions: Array<{
    greeks: Greeks;
    quantity: number; // Number of contracts (positive for long, negative for short)
  }>
): Greeks {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;
  let totalValue = 0;
  let totalIntrinsic = 0;
  let totalExtrinsic = 0;

  for (const position of positions) {
    const { greeks, quantity } = position;
    const contractMultiplier = 100; // 1 contract = 100 shares

    totalDelta += greeks.delta * quantity * contractMultiplier;
    totalGamma += greeks.gamma * quantity * contractMultiplier;
    totalTheta += greeks.theta * quantity * contractMultiplier;
    totalVega += greeks.vega * quantity * contractMultiplier;
    totalRho += greeks.rho * quantity * contractMultiplier;
    totalValue += greeks.theoreticalPrice * quantity * contractMultiplier;
    totalIntrinsic += greeks.intrinsicValue * quantity * contractMultiplier;
    totalExtrinsic += greeks.extrinsicValue * quantity * contractMultiplier;
  }

  return {
    delta: Number(totalDelta.toFixed(2)),
    gamma: Number(totalGamma.toFixed(4)),
    theta: Number(totalTheta.toFixed(2)),
    vega: Number(totalVega.toFixed(2)),
    rho: Number(totalRho.toFixed(2)),
    theoreticalPrice: Number(totalValue.toFixed(2)),
    intrinsicValue: Number(totalIntrinsic.toFixed(2)),
    extrinsicValue: Number(totalExtrinsic.toFixed(2)),
  };
}

/**
 * Estimate implied volatility from option price using Newton-Raphson method
 *
 * Note: This is computationally expensive and should be used sparingly.
 * Prefer using IV from market data providers when available.
 *
 * @param optionPrice - Current market price of the option
 * @param input - Option parameters (without IV)
 * @param maxIterations - Maximum iterations for convergence
 * @param tolerance - Convergence tolerance
 * @returns Estimated implied volatility
 */
export function calculateImpliedVolatility(
  optionPrice: number,
  input: Omit<OptionInput, 'impliedVolatility'>,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): number {
  // Initial guess: 30% volatility
  let sigma = 0.30;

  for (let i = 0; i < maxIterations; i++) {
    const greeks = calculateGreeks({ ...input, impliedVolatility: sigma });
    const diff = greeks.theoreticalPrice - optionPrice;

    if (Math.abs(diff) < tolerance) {
      return Number(sigma.toFixed(4));
    }

    // Newton-Raphson: new_sigma = old_sigma - f(sigma) / f'(sigma)
    // f'(sigma) is vega
    if (greeks.vega === 0) break;

    sigma = sigma - diff / (greeks.vega * 100); // vega is per 1%, so multiply by 100

    // Keep sigma in reasonable bounds
    if (sigma < 0.01) sigma = 0.01;
    if (sigma > 5.0) sigma = 5.0;
  }

  return Number(sigma.toFixed(4));
}

/**
 * Calculate the probability of profit for an option position
 * Based on delta approximation (simple method)
 *
 * @param greeks - Option Greeks
 * @param optionType - CALL or PUT
 * @returns Probability of profit (0 to 1)
 */
export function calculateProbabilityOfProfit(
  greeks: Greeks,
  optionType: 'CALL' | 'PUT'
): number {
  // Delta approximation: Delta represents approximate probability ITM at expiration
  const delta = Math.abs(greeks.delta);

  if (optionType === 'CALL') {
    // For long calls, profit when stock goes up (delta positive)
    return greeks.delta > 0 ? delta : 1 - delta;
  } else {
    // For long puts, profit when stock goes down (delta negative)
    return greeks.delta < 0 ? delta : 1 - delta;
  }
}
