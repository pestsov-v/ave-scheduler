export const enum EventName {
    SET = 'set',
    SUCCESS = 'success',
    ERROR = 'error',
    TIMEOUT = 'timeout',
    DELETE = 'delete',
    NEXT_EXECUTE = 'next',
    FIRST_EXECUTE = 'first',
}

export interface IScheduler<K, V> {
    on(event: 'first', listener: (key: K, val: TimePayload) => void): void
    on(event: 'next', listener: (key: K, val: TimePayload) => void): void
    on(event: 'success', listener: (key: K, val?: V) => void): void;
    on(event: 'delete', listener: (key: K) => void): void;
    on(event: string | symbol, listener: (...args: any[]) => void): void

    once(event: string | symbol, listener: (...args: any[]) => void): void
    removeListener(event: string | symbol, listener: (...args: any[]) => void): void

    set(key: K, value: V): this
    get(key: K): V | undefined
    delete(key: K): boolean
    destroy(): void
}

export type Options = {
    periodicity?: number
}

export const enum SchedulerKind {
    MINUTELY = 'M',
    HOURLY = 'H',
    DAILY = 'D',
    WEEKLY = 'W',
    MONTHLY = 'M',
    YEARLY = 'Y',
    INTERVAL = 'I',
    DISPOSABLE = 'P'
}

type SchedulerDate = {
    seconds: number,
    minutes: number,
    hours: number,
    days: number,
    month: number
}

interface ISchedulerKind {
    kind: SchedulerKind
}

interface MinutelyKind extends ISchedulerKind {
    kind: SchedulerKind.MINUTELY
    time: Pick<SchedulerDate, 'seconds'>
}

interface HourlyKind extends ISchedulerKind {
    kind: SchedulerKind.HOURLY
    time: Pick<SchedulerDate, 'seconds' | 'minutes'>
}

interface DailyKind extends ISchedulerKind {
    kind: SchedulerKind.DAILY
    time: Pick<SchedulerDate, 'seconds' | 'minutes' | 'hours'>
}

interface WeeklyKind extends ISchedulerKind {
    kind: SchedulerKind.WEEKLY
    time: Pick<SchedulerDate, 'seconds' | 'minutes' | 'hours'> & { weeklyDay: number }
}

interface MonthlyKind extends ISchedulerKind {
    kind: SchedulerKind.MONTHLY
    time: Pick<SchedulerDate, 'seconds' | 'minutes' | 'hours' | 'days'>
}

interface YearlyKind extends ISchedulerKind {
    kind: SchedulerKind.YEARLY
    time: SchedulerDate
}

interface IntervalKind extends ISchedulerKind {
    kind: SchedulerKind.INTERVAL
    time: Pick<SchedulerDate, 'seconds'>
}

interface DisposableKind extends ISchedulerKind {
    kind: SchedulerKind.DISPOSABLE
    time: SchedulerDate
}

type TimeKind =
    | MinutelyKind
    | HourlyKind
    | DailyKind
    | WeeklyKind
    | MonthlyKind
    | YearlyKind
    | IntervalKind
    | DisposableKind

export type SchedulerPayload = {
    args?: Record<string, unknown>
    job: (...args: any) => any
    time: TimeKind
    [key: string]: any
}

export type TimePayload = {
    timestamp: number
    date: Date
    kind: SchedulerKind
}