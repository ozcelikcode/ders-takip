import { z } from 'zod';

export const pomodoroPhaseSchema = z.enum(['work', 'short_break', 'long_break']);
export type PomodoroPhase = z.infer<typeof pomodoroPhaseSchema>;
export interface PomodoroClockState {
  phase: PomodoroPhase;
  cycle: number;
  remainingMilliseconds: number;
  deadlineAt: string | null;
  autoStartBreaks: boolean;
  completedWorkCycles: number;
}
export const pomodoroCommandSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  command: z.enum(['resume', 'pause', 'reset', 'complete', 'configure']),
  autoStartBreaks: z.boolean().optional(),
}).strict().refine(value => value.command === 'configure' ? value.autoStartBreaks !== undefined : value.autoStartBreaks === undefined);
export type PomodoroCommand = z.infer<typeof pomodoroCommandSchema>;
export const defaultPomodoroSettings = { workDuration: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4 };
export function phaseMilliseconds(phase: PomodoroPhase, settings: typeof defaultPomodoroSettings): number {
  return (phase === 'work' ? settings.workDuration : phase === 'short_break' ? settings.shortBreak : settings.longBreak) * 60_000;
}
export function pomodoroRemaining(clock: PomodoroClockState, now: number): number {
  return clock.deadlineAt === null ? clock.remainingMilliseconds : Math.max(0, Math.min(clock.remainingMilliseconds, Date.parse(clock.deadlineAt) - now));
}
