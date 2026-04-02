import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimer', () => {
  it('starts at 0', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.seconds).toBe(0);
    expect(result.current.running).toBe(false);
  });

  it('counts up when started', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    expect(result.current.running).toBe(true);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(3);
  });

  it('pauses when toggled again', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    const frozenTime = result.current.seconds;
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(frozenTime);
  });

  it('resets to 0', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.reset());
    expect(result.current.seconds).toBe(0);
    expect(result.current.running).toBe(false);
  });
});
