"use client";

import { useMemo } from "react";
import type { SimulationParams, SimulationResult } from "@/lib/types";

type Props = {
  params: SimulationParams;
  result: SimulationResult;
  ethPrice: number;
};

export function ScenarioAnalysis({ params, result, ethPrice }: Props) {
  const stats = useMemo(
    () => computeStats(result, ethPrice),
    [result, ethPrice]
  );

  const buckets = useMemo(
    () => ({
      setup: setupBucket(params),
      outcome: outcomeBucket(result.depegProbability),
    }),
    [params, result.depegProbability]
  );

  const liqPrice = ethPrice * (params.liquidationThreshold / params.collateralRatio);
  const buffer =
    ((params.collateralRatio - params.liquidationThreshold) /
      params.collateralRatio) *
    100;

  return (
    <section className="rounded-xl border border-stroke bg-surface/40 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Scenario analysis
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          live
        </span>
      </div>

      <div className="space-y-6">
        <Section
          title="What you're simulating"
          animKey={buckets.setup}
        >
          {renderSetup(params, ethPrice, liqPrice, buffer)}
        </Section>

        <Section
          title="What happened"
          animKey={buckets.outcome}
        >
          {renderOutcome(params, result, stats, ethPrice, liqPrice, buffer)}
          {(result.recoveryModeCount ?? 0) > 0 && (
            <p>
              <HiAccent tone="warn">Recovery Mode</HiAccent> activated in{" "}
              <Hi>
                {(
                  ((result.recoveryModeCount ?? 0) / result.paths.length) *
                  100
                ).toFixed(1)}
                %
              </Hi>{" "}
              of paths, on average around{" "}
              <Hi>day {(result.recoveryModeAvgDay ?? 0).toFixed(1)}</Hi>. Once
              system CR drops below 150%, every position below 150% becomes
              liquidatable — LUSD&apos;s safety valve that protects the
              protocol by shedding weak positions during stress.
            </p>
          )}
        </Section>

        {result.depegProbability > 0 && (
          <Section
            title="What would change the outcome"
            animKey={`${buckets.setup}|${buckets.outcome}`}
          >
            {renderSuggestions(params, result, buffer)}
          </Section>
        )}

        <Section title="Real-world context" animKey="static">
          <p>
            This simulation uses geometric Brownian motion with{" "}
            <Hi>normally distributed returns</Hi>. Real markets have fat tails
            — extreme crashes happen more often than the normal distribution
            predicts. Actual depeg risk may be higher than shown.
          </p>
          <p className="mt-2">
            The model does not simulate <Hi>liquidation cascades</Hi> (where
            one liquidation drives price down and triggers more), oracle
            delays, or network congestion — all of which worsened real events
            like Black Thursday.
          </p>
        </Section>
      </div>
    </section>
  );
}

function Section({
  title,
  animKey,
  children,
}: {
  title: string;
  animKey: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {title}
      </h3>
      <div
        key={animKey}
        className="animate-scene-fade space-y-3 text-sm leading-relaxed text-cream/75"
      >
        {children}
      </div>
    </div>
  );
}

function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono font-medium text-cream transition-colors duration-200">
      {children}
    </span>
  );
}

function HiAccent({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "warn" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : "text-red-400";
  return (
    <span
      className={`font-mono font-semibold transition-colors duration-200 ${cls}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — setup
// ---------------------------------------------------------------------------

function setupBucket(p: SimulationParams): string {
  const crash = p.initialCrash <= -0.2 ? crashBucket(p.initialCrash) : "none";
  const vol = p.volatility > 0.08 ? "high" : "normal";
  const cr = p.collateralRatio < 1.3 ? "aggressive" : "standard";
  return `${crash}|${vol}|${cr}`;
}

function crashBucket(crash: number): string {
  if (crash > -0.3) return "may2021";
  if (crash > -0.4) return "covid";
  if (crash > -0.5) return "blackthursday";
  return "unprecedented";
}

function crashComparison(crash: number): string {
  if (crash > -0.3) return "similar to the May 2021 crash";
  if (crash > -0.4) return "similar to the COVID crash (March 2020)";
  if (crash > -0.5)
    return "similar to Black Thursday (March 2020, MakerDAO)";
  return "more severe than any single-day crash in ETH history";
}

function renderSetup(
  p: SimulationParams,
  ethPrice: number,
  liqPrice: number,
  buffer: number
) {
  const vol = p.volatility * 100;
  const cr = p.collateralRatio * 100;
  const liq = p.liquidationThreshold * 100;
  const paragraphs: React.ReactNode[] = [];

  const isBaseline =
    p.initialCrash === 0 && p.volatility >= 0.03 && p.volatility <= 0.055;

  if (isBaseline) {
    paragraphs.push(
      <p key="baseline">
        You&apos;re simulating <Hi>normal market conditions</Hi> over{" "}
        <Hi>{p.days} days</Hi>. ETH starts at{" "}
        <Hi>{formatUsd(ethPrice)}</Hi> with near-historical-average
        volatility (<Hi>{vol.toFixed(1)}%</Hi> daily). The protocol requires{" "}
        <Hi>{cr.toFixed(0)}%</Hi> collateralization with liquidation at{" "}
        <Hi>{liq.toFixed(0)}%</Hi>. That gives ETH a buffer of{" "}
        <Hi>{buffer.toFixed(1)}%</Hi> — it would need to fall to{" "}
        <Hi>{formatUsd(liqPrice)}</Hi> before liquidations begin.
      </p>
    );
  } else {
    paragraphs.push(
      <p key="generic">
        You&apos;re simulating a <Hi>{p.days}-day</Hi> window. ETH starts at{" "}
        <Hi>{formatUsd(ethPrice)}</Hi> with{" "}
        <Hi>{vol.toFixed(1)}%</Hi> daily volatility. The protocol requires{" "}
        <Hi>{cr.toFixed(0)}%</Hi> collateralization with liquidation at{" "}
        <Hi>{liq.toFixed(0)}%</Hi>, leaving a{" "}
        <Hi>{buffer.toFixed(1)}%</Hi> price-buffer before breach —
        liquidation triggers at <Hi>{formatUsd(liqPrice)}</Hi>.
      </p>
    );
  }

  const isUsde =
    p.fundingRateVol !== undefined ||
    p.reserveFund !== undefined ||
    p.fundingRateShock !== undefined;
  if (isUsde) {
    const reserve = p.reserveFund ?? 50_000_000;
    const shock = p.fundingRateShock ?? 0;
    const vol = (p.fundingRateVol ?? 0.02) * 100;
    paragraphs.push(
      <p key="usde-1">
        Unlike overcollateralized stablecoins, USDe&apos;s risk is <Hi>not</Hi>{" "}
        about collateral price drops. Ethena holds equal long spot and short
        perps positions, so price moves cancel out.
      </p>
    );
    paragraphs.push(
      <p key="usde-2">
        The risk is <Hi>funding rates going negative</Hi>. When the market
        turns bearish, short positions PAY instead of earning. Ethena&apos;s{" "}
        <Hi>${(reserve / 1_000_000).toFixed(0)}M</Hi> reserve fund absorbs
        these costs at <Hi>{vol.toFixed(1)}%</Hi> daily funding-rate vol
        {shock < 0 ? (
          <>
            {" "}
            with a forced day-1 shock of{" "}
            <HiAccent tone="bad">{(shock * 100).toFixed(0)}% APR</HiAccent>.
          </>
        ) : (
          <>.</>
        )}
      </p>
    );
    return paragraphs;
  }

  const corr = p.correlation;
  if (corr !== undefined) {
    if (corr <= 0.3) {
      paragraphs.push(
        <p key="gho-lowcorr">
          At <HiAccent tone="good">{corr.toFixed(1)}</HiAccent> correlation,
          GHO benefits from real <Hi>diversification</Hi>. Even if ETH
          crashes, BTC and LINK may hold, supporting the collateral basket
          (50% ETH / 30% BTC / 20% LINK).
        </p>
      );
    } else if (corr >= 0.7) {
      paragraphs.push(
        <p key="gho-hicorr">
          At <HiAccent tone="bad">{corr.toFixed(1)}</HiAccent> correlation, a{" "}
          <Hi>market-wide crash</Hi> hits all three collateral legs
          simultaneously. Diversification provides minimal protection — the
          basket moves nearly as one asset.
        </p>
      );
    } else {
      paragraphs.push(
        <p key="gho-midcorr">
          Correlation of <Hi>{corr.toFixed(1)}</Hi> is typical of normal crypto
          markets — some shared beta, some idiosyncratic moves. Diversification
          helps at the margin but won&apos;t save the basket in a systemic
          crash.
        </p>
      );
    }
  }

  const isLusd = p.userCR !== undefined || p.systemCR !== undefined;
  if (isLusd) {
    const userCR = (p.userCR ?? 1.5) * 100;
    const systemCR = (p.systemCR ?? 2.5) * 100;
    if ((p.systemCR ?? 2.5) >= 1.5) {
      paragraphs.push(
        <p key="lusd-normal">
          The system is in <HiAccent tone="good">Normal Mode</HiAccent> at{" "}
          <Hi>{systemCR.toFixed(0)}%</Hi> system CR. Your position is only at
          risk if your personal CR (<Hi>{userCR.toFixed(0)}%</Hi>) drops below{" "}
          <Hi>110%</Hi>.
        </p>
      );
    } else {
      paragraphs.push(
        <p key="lusd-recov">
          System CR of <HiAccent tone="bad">{systemCR.toFixed(0)}%</HiAccent>{" "}
          starts already in <Hi>Recovery Mode</Hi>: any position below{" "}
          <Hi>150%</Hi> is immediately liquidatable. At{" "}
          <Hi>{userCR.toFixed(0)}%</Hi>, you&apos;re{" "}
          {userCR < 150 ? "already in the liquidation set." : "just above the cut-off."}
        </p>
      );
    }
  }

  const shock = p.usdcShock ?? 0;
  if (shock < 0) {
    const usdcPrice = 1 + shock;
    paragraphs.push(
      <p key="usdc">
        You&apos;re simulating USDC dropping to{" "}
        <HiAccent tone="bad">${usdcPrice.toFixed(2)}</HiAccent> on day 1. Since
        ~<Hi>35%</Hi> of DAI&apos;s backing sits in the USDC Peg Stability
        Module, this directly reduces DAI&apos;s effective collateral even if
        ETH price is unaffected — the mechanism that transmitted the{" "}
        <Hi>SVB contagion</Hi> to DAI in March 2023.
      </p>
    );
  }

  if (p.initialCrash <= -0.2) {
    const crashPct = p.initialCrash * 100;
    const postCrashPrice = ethPrice * (1 + p.initialCrash);
    paragraphs.push(
      <p key="crash">
        You&apos;ve forced a{" "}
        <HiAccent tone="bad">{crashPct.toFixed(0)}%</HiAccent> crash on day 1
        — ETH drops from <Hi>{formatUsd(ethPrice)}</Hi> to{" "}
        <Hi>{formatUsd(postCrashPrice)}</Hi>. That&apos;s{" "}
        <Hi>{crashComparison(p.initialCrash)}</Hi>. After the initial shock,
        the simulation continues with <Hi>{vol.toFixed(1)}%</Hi> daily
        volatility for the remaining <Hi>{p.days - 1} days</Hi>.
      </p>
    );
  }

  if (p.volatility > 0.08) {
    const mult = p.volatility / 0.04;
    paragraphs.push(
      <p key="vol">
        You&apos;ve set volatility to{" "}
        <HiAccent tone="warn">{vol.toFixed(1)}%</HiAccent>, which is{" "}
        <Hi>{mult.toFixed(1)}×</Hi> the historical average. This level of
        sustained daily vol has only been seen during major crises like the
        Terra collapse or FTX implosion.
      </p>
    );
  }

  if (p.collateralRatio < 1.3) {
    paragraphs.push(
      <p key="cr">
        The <HiAccent tone="warn">{cr.toFixed(0)}%</HiAccent> collateralization
        ratio is aggressive. For reference, MakerDAO uses{" "}
        <Hi>150%</Hi> for ETH vaults and LUSD uses <Hi>110%</Hi>. Lower
        ratios are more capital-efficient but leave less buffer against
        crashes.
      </p>
    );
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Section 2 — outcome
// ---------------------------------------------------------------------------

function outcomeBucket(prob: number): string {
  if (prob === 0) return "none";
  if (prob >= 1) return "certain";
  if (prob < 0.05) return "low";
  if (prob < 0.25) return "moderate";
  if (prob < 0.75) return "high";
  return "severe";
}

function renderOutcome(
  p: SimulationParams,
  result: SimulationResult,
  stats: Stats,
  ethPrice: number,
  liqPrice: number,
  buffer: number
) {
  const isFiatOutcome =
    p.eventProbability !== undefined ||
    p.baseLiquidity !== undefined ||
    p.redemptionSeverity !== undefined;
  if (isFiatOutcome) {
    const total = result.paths.length;
    const count = result.depegCount;
    const pct = result.depegProbability * 100;
    let minPeg = Infinity;
    for (const path of result.paths) {
      for (const v of path) if (v < minPeg) minPeg = v;
    }
    if (count === 0) {
      return (
        <p>
          Across <Hi>{total.toLocaleString()}</Hi> paths, the peg{" "}
          <HiAccent tone="good">held above $0.97</HiAccent>. Deepest dip
          reached <Hi>${minPeg.toFixed(3)}</Hi>. Reserve liquidity was
          sufficient to absorb redemption pressure at these settings.
        </p>
      );
    }
    const tone = pct < 5 ? "warn" : "bad";
    return (
      <p>
        The peg <HiAccent tone={tone}>dipped below $0.97</HiAccent> in{" "}
        <Hi>{count.toLocaleString()}</Hi> of{" "}
        <Hi>{total.toLocaleString()}</Hi> paths (<Hi>{pct.toFixed(1)}%</Hi>).
        Deepest dip across all paths: <Hi>${minPeg.toFixed(3)}</Hi>. Redemption
        demand exceeded the liquid portion of reserves, forcing secondary
        markets to clear below par until the issuer could settle T-bills.
      </p>
    );
  }

  const isUsdeOutcome =
    p.fundingRateVol !== undefined ||
    p.reserveFund !== undefined ||
    p.fundingRateShock !== undefined;
  if (isUsdeOutcome) {
    const total = result.paths.length;
    const count = result.depegCount;
    const pct = result.depegProbability * 100;
    let daysSum = 0;
    let daysCount = 0;
    for (const d of result.depegDays) {
      if (d !== null) {
        daysSum += d;
        daysCount++;
      }
    }
    const avgDay = daysCount > 0 ? daysSum / daysCount : null;
    if (count === 0) {
      return (
        <p>
          Across <Hi>{total.toLocaleString()}</Hi> paths, the reserve fund{" "}
          <HiAccent tone="good">never ran out</HiAccent>. Funding-rate
          fluctuations at the current settings are absorbed by the insurance
          buffer.
        </p>
      );
    }
    const tone = pct < 5 ? "warn" : "bad";
    return (
      <p>
        The reserve fund was <HiAccent tone={tone}>depleted</HiAccent> in{" "}
        <Hi>{count.toLocaleString()}</Hi> of{" "}
        <Hi>{total.toLocaleString()}</Hi> paths (<Hi>{pct.toFixed(1)}%</Hi>),
        on average around <Hi>day {avgDay?.toFixed(1)}</Hi>. At this point
        Ethena can no longer sustain the delta-neutral hedge and USDe faces
        depeg risk.
      </p>
    );
  }

  const total = result.paths.length;
  const count = result.depegCount;
  const pct = result.depegProbability * 100;
  const bucket = outcomeBucket(result.depegProbability);

  if (bucket === "none") {
    const margin =
      liqPrice > 0
        ? ((stats.globalMinPrice - liqPrice) / liqPrice) * 100
        : 0;
    return (
      <p>
        Across all <Hi>{total.toLocaleString()}</Hi> paths,{" "}
        <HiAccent tone="good">none</HiAccent> breached the liquidation
        threshold. Under these conditions, DAI&apos;s collateral appears resilient.
        The closest any path came to liquidation was{" "}
        <Hi>{formatUsd(stats.globalMinPrice)}</Hi>, which still maintained a{" "}
        <HiAccent tone="good">{margin.toFixed(1)}%</HiAccent> cushion above
        the <Hi>{formatUsd(liqPrice)}</Hi> liquidation price.
      </p>
    );
  }

  if (bucket === "low") {
    return (
      <p>
        Out of <Hi>{total.toLocaleString()}</Hi> simulations,{" "}
        <HiAccent tone="warn">{count.toLocaleString()}</HiAccent> paths (
        <Hi>{pct.toFixed(2)}%</Hi>) triggered liquidation. This is a low but
        non-zero risk. In paths that did breach, the average time to
        liquidation was <Hi>day {stats.avgDaysToLiq!.toFixed(1)}</Hi> — the
        system held up that long before collateral erosion caught up. The
        other <Hi>{(total - count).toLocaleString()}</Hi> paths survived the
        full <Hi>{p.days}-day</Hi> window.
      </p>
    );
  }

  if (bucket === "moderate") {
    const medianDrawdown =
      ((ethPrice - stats.medianFinal) / ethPrice) * 100;
    return (
      <p>
        This is a <HiAccent tone="warn">meaningful risk</HiAccent> scenario.{" "}
        <Hi>{count.toLocaleString()}</Hi> of{" "}
        <Hi>{total.toLocaleString()}</Hi> paths (<Hi>{pct.toFixed(1)}%</Hi>)
        resulted in liquidation. The median path ended at{" "}
        <Hi>{formatUsd(stats.medianFinal)}</Hi> (a{" "}
        <Hi>
          {medianDrawdown >= 0 ? "" : "+"}
          {Math.abs(medianDrawdown).toFixed(1)}%
        </Hi>{" "}
        {medianDrawdown >= 0 ? "drawdown" : "gain"} from start), and in
        depeg scenarios, liquidation typically occurred around{" "}
        <Hi>day {stats.avgDaysToLiq!.toFixed(1)}</Hi>. A protocol designer
        would likely consider this unacceptable and either raise the
        collateralization ratio or tighten the liquidation threshold.
      </p>
    );
  }

  if (bucket === "high" || bucket === "severe") {
    return (
      <p>
        This is a <HiAccent tone="bad">high-risk</HiAccent> scenario.{" "}
        <Hi>{pct.toFixed(1)}%</Hi> of simulated futures (
        <Hi>{count.toLocaleString()}</Hi> of{" "}
        <Hi>{total.toLocaleString()}</Hi>) resulted in liquidation. The{" "}
        <Hi>{buffer.toFixed(1)}%</Hi> buffer is insufficient for the
        volatility level you&apos;ve set. In the worst 1% of paths, ETH fell to{" "}
        <HiAccent tone="bad">
          {formatUsd(stats.worst1pctAvgPrice)}
        </HiAccent>{" "}
        — a{" "}
        <Hi>{(stats.worst1pctDrawdown * 100).toFixed(1)}%</Hi> drawdown.
        Liquidations in depeg paths cluster around{" "}
        <Hi>day {stats.avgDaysToLiq!.toFixed(1)}</Hi>. A real protocol under
        these parameters would likely accumulate significant bad debt during
        a sustained downturn.
      </p>
    );
  }

  // certain (100%)
  const postCrashPrice = ethPrice * (1 + p.initialCrash);
  const crashAloneBreaches =
    p.initialCrash < 0 && postCrashPrice <= liqPrice;

  let reason: React.ReactNode;
  if (crashAloneBreaches) {
    reason = (
      <>
        The forced day-1 crash of{" "}
        <HiAccent tone="bad">
          {(p.initialCrash * 100).toFixed(0)}%
        </HiAccent>{" "}
        exceeds the <Hi>{buffer.toFixed(1)}%</Hi> buffer between current
        price and liquidation price. ETH drops from{" "}
        <Hi>{formatUsd(ethPrice)}</Hi> to{" "}
        <Hi>{formatUsd(postCrashPrice)}</Hi> on day 1, immediately breaching
        the <Hi>{formatUsd(liqPrice)}</Hi> liquidation threshold. The
        simulation never gets a chance to play out — the system is underwater
        before day 2.
      </>
    );
  } else if (p.volatility > 0.1) {
    reason = (
      <>
        At <HiAccent tone="bad">{(p.volatility * 100).toFixed(1)}%</HiAccent>{" "}
        daily volatility over <Hi>{p.days} days</Hi>, the cumulative
        probability of a <Hi>{buffer.toFixed(1)}%</Hi> drawdown approaches
        certainty. Even without a day-1 crash, sustained extreme volatility
        virtually guarantees that at least one day in the{" "}
        <Hi>{p.days}-day</Hi> window will breach the threshold.
      </>
    );
  } else if (p.collateralRatio <= 1.2) {
    reason = (
      <>
        A <HiAccent tone="bad">{(p.collateralRatio * 100).toFixed(0)}%</HiAccent>{" "}
        collateralization ratio leaves only a{" "}
        <Hi>{buffer.toFixed(1)}%</Hi> buffer. That&apos;s too thin to survive{" "}
        <Hi>{p.days} days</Hi> of{" "}
        <Hi>{(p.volatility * 100).toFixed(1)}%</Hi> volatility. Raise the CR
        toward 150% to see where probability stabilizes.
      </>
    );
  } else {
    reason = (
      <>
        The combination of{" "}
        <Hi>{(p.volatility * 100).toFixed(1)}%</Hi> volatility, a{" "}
        <Hi>{p.days}-day</Hi> horizon, and a{" "}
        <Hi>{buffer.toFixed(1)}%</Hi> buffer makes breach effectively
        certain. Any one of these, on its own, would already push probability
        near 100%.
      </>
    );
  }

  return (
    <>
      <p>
        <HiAccent tone="bad">Every</HiAccent> simulated path triggered
        liquidation. Depeg is mathematically inevitable under these
        parameters.
      </p>
      <p>{reason}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — suggestions
// ---------------------------------------------------------------------------

function renderSuggestions(
  p: SimulationParams,
  _result: SimulationResult,
  buffer: number
): React.ReactNode[] {
  const isFiat =
    p.eventProbability !== undefined ||
    p.baseLiquidity !== undefined ||
    p.redemptionSeverity !== undefined;
  if (isFiat) {
    return [
      <ul key="list" className="list-disc space-y-2 pl-5">
        <li key="liq">
          Raising <Hi>reserve liquidity</Hi> (more T-bills, fewer bank
          deposits or commercial paper) lets the issuer honor redemptions
          without selling illiquid assets at a discount.
        </li>
        <li key="sev">
          Lowering <Hi>redemption severity</Hi> — e.g. via redemption windows,
          gating, or PSM-style arb loops — spreads demand over time so the
          liquid buffer isn&apos;t overwhelmed in a single day.
        </li>
        <li key="prob">
          A lower <Hi>event probability</Hi> reflects stronger issuer
          reputation and reserve transparency — fewer banking-shock or
          regulatory scares to trigger a run in the first place.
        </li>
      </ul>,
    ];
  }
  const isUsde =
    p.fundingRateVol !== undefined ||
    p.reserveFund !== undefined ||
    p.fundingRateShock !== undefined;
  if (isUsde) {
    const reserve = p.reserveFund ?? 50_000_000;
    return [
      <ul key="list" className="list-disc space-y-2 pl-5">
        <li key="res">
          Growing the reserve fund beyond{" "}
          <Hi>${(reserve / 1_000_000).toFixed(0)}M</Hi> buys more days of
          negative funding before depletion.
        </li>
        <li key="sup">
          A smaller <Hi>USDe supply</Hi> means each basis point of negative
          funding costs less in absolute dollars.
        </li>
        <li key="vol">
          Lower funding-rate vol (tighter market regime) reduces the chance
          of extended negative stretches.
        </li>
      </ul>,
    ];
  }
  const suggestions: React.ReactNode[] = [];

  if (p.collateralRatio < 2.0) {
    const target = Math.min(2.0, p.collateralRatio + 0.2);
    const newBuffer =
      ((target - p.liquidationThreshold) / target) * 100;
    if (newBuffer > buffer + 0.5) {
      suggestions.push(
        <li key="cr">
          Raising the collateralization ratio from{" "}
          <Hi>{(p.collateralRatio * 100).toFixed(0)}%</Hi> to{" "}
          <Hi>{(target * 100).toFixed(0)}%</Hi> would widen the buffer from{" "}
          <Hi>{buffer.toFixed(1)}%</Hi> to{" "}
          <HiAccent tone="good">{newBuffer.toFixed(1)}%</HiAccent> —
          typically enough to cut depeg probability by an order of magnitude.
        </li>
      );
    }
  }

  if (p.days > 30) {
    suggestions.push(
      <li key="days">
        Shortening the horizon from <Hi>{p.days} days</Hi> to{" "}
        <Hi>30 days</Hi> would lower probability because there&apos;s less time
        for an extreme intra-path drawdown to occur.
      </li>
    );
  }

  if (p.volatility > 0.04) {
    suggestions.push(
      <li key="vol">
        Setting volatility to{" "}
        <HiAccent tone="good">4%</HiAccent> (historical average) instead of{" "}
        <Hi>{(p.volatility * 100).toFixed(1)}%</Hi> would produce a more
        realistic baseline estimate.
      </li>
    );
  }

  if (p.initialCrash < 0) {
    suggestions.push(
      <li key="crash">
        Removing the forced day-1 crash (currently{" "}
        <Hi>{(p.initialCrash * 100).toFixed(0)}%</Hi>) would remove the
        deterministic shock — probability then depends only on random walk
        dynamics.
      </li>
    );
  }

  if (suggestions.length === 0) {
    return [
      <p key="empty">
        Parameters are already near the conservative end of each slider —
        probability is dominated by the chosen volatility and horizon.
      </p>,
    ];
  }

  return [
    <ul key="list" className="list-disc space-y-2 pl-5">
      {suggestions}
    </ul>,
  ];
}

// ---------------------------------------------------------------------------
// Stats helper
// ---------------------------------------------------------------------------

type Stats = {
  medianFinal: number;
  worst1pctAvgPrice: number;
  worst1pctDrawdown: number;
  avgDaysToLiq: number | null;
  globalMinPrice: number;
};

function computeStats(result: SimulationResult, ethPrice: number): Stats {
  const n = result.paths.length;
  if (n === 0) {
    return {
      medianFinal: ethPrice,
      worst1pctAvgPrice: ethPrice,
      worst1pctDrawdown: 0,
      avgDaysToLiq: null,
      globalMinPrice: ethPrice,
    };
  }

  const finalPrices = new Array<number>(n);
  let globalMin = Infinity;
  for (let i = 0; i < n; i++) {
    const path = result.paths[i];
    finalPrices[i] = path[path.length - 1];
    for (const p of path) if (p < globalMin) globalMin = p;
  }
  const sorted = finalPrices.slice().sort((a, b) => a - b);
  const medianFinal = sorted[Math.floor(n / 2)] ?? ethPrice;

  const worstCount = Math.max(1, Math.floor(n * 0.01));
  let worstSum = 0;
  for (let i = 0; i < worstCount; i++) worstSum += sorted[i];
  const worst1pctAvgPrice = worstSum / worstCount;
  const worst1pctDrawdown = (ethPrice - worst1pctAvgPrice) / ethPrice;

  let daysSum = 0;
  let daysCount = 0;
  for (const d of result.depegDays) {
    if (d !== null) {
      daysSum += d;
      daysCount++;
    }
  }
  const avgDaysToLiq = daysCount > 0 ? daysSum / daysCount : null;

  return {
    medianFinal,
    worst1pctAvgPrice,
    worst1pctDrawdown,
    avgDaysToLiq,
    globalMinPrice: globalMin,
  };
}

function formatUsd(x: number): string {
  if (x >= 1000)
    return `$${x.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${x.toFixed(2)}`;
}
