import {WorkerPoolOptions} from "workerpool";

export const enum EventName {
    SET = 'set',
    SUCCESS = 'success',
    ERROR = 'error',
    DELETE = 'delete',
    NEXT_EXECUTE = 'next',
    FIRST_EXECUTE = 'first',
}

export interface IScheduler<K, V extends SchedulerPayload> {
    on(event: 'first', listener: (key: K, val: TimePayload) => void): void
    on(event: 'next', listener: (key: K, val: TimePayload) => void): void
    on<T = unknown>(event: 'success', listener: (key: K, val?: OnSuccess<T>) => void): void;
    on<T = unknown>(event: 'error', listener: (key: K, val?: OnError<T>) => void): void;
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
    workers?: WorkerPoolOptions
    periodicity?: number
}

export const enum SchedulerKind {
    MINUTELY = 'MIN',
    HOURLY = 'HOU',
    DAILY = 'DAY',
    WEEKLY = 'WEE',
    MONTHLY = 'MON',
    YEARLY = 'YEA',
    INTERVAL = 'INT',
    DISPOSABLE = 'DIS'
}

type SchedulerDate = {
    seconds: number,
    minutes: number,
    hours: number,
    days: number,
    month: number
}

export type CurrentDate = {
    eSeconds: number
    eMinutes: number,
    eHours: number,
    eDays: number,
    eWeekDay: number
    eMonth: number
    eYear: number,

}

type MinutelyPayload =Pick<SchedulerDate, 'seconds'>
type HourlyPayload = Pick<SchedulerDate, 'seconds' | 'minutes'>
type DailyPayload = Pick<SchedulerDate, 'seconds' | 'minutes' | 'hours'>
export type WeeklyPayload = Pick<SchedulerDate, 'seconds' | 'minutes' | 'hours'> & {weeklyDay: number}
type MonthPayload = Omit<SchedulerDate, 'month'>

interface ISchedulerKind {
    kind: SchedulerKind
}

interface MinutelyKind extends ISchedulerKind {
    kind: SchedulerKind.MINUTELY
    time: MinutelyPayload
}

interface HourlyKind extends ISchedulerKind {
    kind: SchedulerKind.HOURLY
    time: HourlyPayload
}

interface DailyKind extends ISchedulerKind {
    kind: SchedulerKind.DAILY
    time: DailyPayload
}

interface WeeklyKind extends ISchedulerKind {
    kind: SchedulerKind.WEEKLY
    time: WeeklyPayload
}

interface MonthlyKind extends ISchedulerKind {
    kind: SchedulerKind.MONTHLY
    time: MonthPayload
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
    args?: any
    job: (...args: any[]) => any
    time: TimeKind
}

export type TimePayload = {
    timestamp: number
    date: Date
    kind: SchedulerKind
}

export type OnError<T> = {
    task: SchedulerPayload;
    time: Date;
    message: T;
}

export type OnSuccess<T> = {
    task: SchedulerPayload;
    time: Date;
    result: T;
}