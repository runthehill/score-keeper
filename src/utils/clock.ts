export interface ClockState {
  clock_running: number;   // 0 | 1
  clock_base_ms: number;
  clock_anchor: string | null;
  clock_active: number;    // 0 | 1
}

// `type` (not `interface`) so it is assignable to updateClock's Record<string, unknown> param.
export type ClockPatch = {
  clock_running?: number;
  clock_base_ms?: number;
  clock_anchor?: string | null;
  clock_active?: number;
  current_period?: number;
  current_period_label?: string | null;
};

export function clockElapsedMs(state: ClockState, now: number): number {
  const live = state.clock_running && state.clock_anchor ? now - Date.parse(state.clock_anchor) : 0;
  return Math.max(0, state.clock_base_ms + live);
}

export function clockSeconds(state: ClockState, now: number): number {
  return Math.floor(clockElapsedMs(state, now) / 1000);
}

export function periodStartMs(period: number, lengthMin: number | null, periodCount: number): number {
  if (lengthMin && period <= periodCount) return (period - 1) * lengthMin * 60_000;
  return 0;
}

export function periodEndSeconds(period: number, lengthMin: number | null, periodCount: number): number | null {
  if (lengthMin && period <= periodCount) return period * lengthMin * 60;
  return null;
}

export function isOvertime(state: ClockState, now: number, period: number, lengthMin: number | null, periodCount: number): boolean {
  const end = periodEndSeconds(period, lengthMin, periodCount);
  return end != null && clockSeconds(state, now) > end;
}

export function computeStart(state: ClockState, now: number): ClockPatch {
  if (state.clock_running) return {};
  return { clock_running: 1, clock_anchor: new Date(now).toISOString(), clock_active: 1 };
}

export function computePause(state: ClockState, now: number): ClockPatch {
  if (!state.clock_running) return {};
  return { clock_running: 0, clock_anchor: null, clock_base_ms: clockElapsedMs(state, now) };
}

export function computeToggle(state: ClockState, now: number): ClockPatch {
  return state.clock_running ? computePause(state, now) : computeStart(state, now);
}

export function computeSetTime(state: ClockState, seconds: number, now: number): ClockPatch {
  const patch: ClockPatch = { clock_base_ms: Math.max(0, Math.floor(seconds)) * 1000, clock_active: 1 };
  if (state.clock_running) patch.clock_anchor = new Date(now).toISOString();
  return patch;
}

export function computeNextPeriod(newPeriod: number, lengthMin: number | null, periodCount: number, label: string | null): ClockPatch {
  return {
    current_period: newPeriod,
    current_period_label: label ?? null,
    clock_running: 0,
    clock_anchor: null,
    clock_base_ms: periodStartMs(newPeriod, lengthMin, periodCount),
  };
}
