import events from 'events'
import {
    Options,
    OnError,
    OnSuccess,
    EventName,
    TimeKind,
    TimePayload,
    IScheduler,
    SchedulerKind,
    SchedulerPayload,
    WeeklyPayload,
    CurrentDate,
} from "../types/scheduler";

class Scheduler<K, V extends SchedulerPayload> extends Map<K, V> implements IScheduler<K, V> {
    private readonly _PERIODICITY: number

    private readonly _interval: NodeJS.Timeout
    private readonly _emitter: NodeJS.EventEmitter
    private readonly _scheduler: Map<K, number>

    constructor(options?: Options) {
        super()
        this._PERIODICITY = options?.periodicity ?? 1000
        this._interval = setInterval(() => this._execute(), this._PERIODICITY)
        this._emitter = new events.EventEmitter()
        this._scheduler = new Map()

        this._interval.unref()
    }

    public on(event: 'first', listener: (key: K, val: TimePayload) => void): void
    public on(event: 'next', listener: (key: K, val: TimePayload) => void): void
    public on<T = unknown>(event: 'success', listener: (key: K, val: OnSuccess<T>) => void): void;
    public on<T = unknown>(event: 'error', listener: (key: K, val: OnError<T>) => void): void;
    public on(event: 'delete', listener: (key: K) => void): void;
    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener);
    }

    public once(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.once(event, listener);
    }

    public removeListener(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.removeListener(event, listener);
    }

    public set(key: K, value: V): this {
        this._emitter.emit(EventName.SET, key, value)
        this._scheduler.set(key, this._getExecTime(value.time, key))
        return super.set(key, value)
    }

    public get(key: K): V | undefined {
        return super.get(key)
    }

    public delete(key: K): boolean {
        this._emitter.emit(EventName.DELETE, key)
        this._scheduler.delete(key)
        return super.delete(key)
    }

    public destroy(): void {
        clearInterval(this._interval)
        this.clear()
    }

    private async _execute(): Promise<void> {
        const now = Date.now()

        for (const [key, execTime] of this._scheduler) {
            const task = this.get(key)
            if (!task) {
                throw new Error(`Task "${key}" not found`)
            }

            if (now >= execTime) {
                try {
                    let result = await task.job(task.args)
                    if (result === undefined) result = null
                    this._scheduler.set(key, this._getNextExecTime(execTime, task.time.kind, key))

                    this._emitter.emit(EventName.SUCCESS, key, {
                        task,
                        result,
                        time: new Date()
                    })
                } catch (e) {
                    this._emitter.emit(EventName.ERROR, key, {
                        task,
                        time: new Date(),
                        message: e
                    })
                }
                this._scheduler.delete(key)
            }
        }
    }

    private _getExecTime(timer: TimeKind, key: K): number {
        let {eSeconds, eMinutes, eHours, eDays, eWeekDay, eMonth, eYear} = this._getCurrentDate()


        if (timer.kind === SchedulerKind.WEEKLY) {
            const weeklyDiff = this._getWeeklyDiff(timer.time)
            eWeekDay = eDays + weeklyDiff
        }

        switch (timer.kind) {
            case SchedulerKind.MINUTELY:
                if (eSeconds > timer.time.seconds) eMinutes += 1
                eSeconds = timer.time.seconds
                break
            case SchedulerKind.HOURLY:
                if (eMinutes > timer.time.minutes) eHours += 1;
                eMinutes = timer.time.minutes;
                eSeconds = timer.time.seconds;
                break;
            case SchedulerKind.DAILY:
                if (eHours > timer.time.hours) eDays += 1;
                eHours = timer.time.hours;
                eMinutes = timer.time.minutes;
                eSeconds = timer.time.seconds;
                break;
            case SchedulerKind.WEEKLY:
                eSeconds = timer.time.seconds;
                eMinutes = timer.time.minutes;
                eHours = timer.time.hours;
                eDays = new Date(eYear, eMonth, eWeekDay).getDate()
                break;
            case SchedulerKind.YEARLY:
                if (eMonth > timer.time.month) eYear += 1;
                eMonth = timer.time.month;
                eDays = timer.time.days;
                eHours = timer.time.hours;
                eMinutes = timer.time.minutes;
                eSeconds = timer.time.seconds;
                break;
            case SchedulerKind.DISPOSABLE:
                eMonth = timer.time.month;
                eDays = timer.time.days;
                eHours = timer.time.hours;
                eMinutes = timer.time.minutes;
                eSeconds = timer.time.seconds;
                break;
            case SchedulerKind.INTERVAL:
                return timer.time.seconds;
            default:
                return new Date(3000, 0 ,1).getTime()
        }

        const executeDate = new Date(eYear, eMonth, eDays, eHours, eMinutes, eSeconds)

        this._emitter.emit(EventName.FIRST_EXECUTE, key, {
            date: new Date(executeDate),
            kind: timer.kind
        })

        return executeDate.getTime()
    }

    private _getNextExecTime(timestamp: number, kind: SchedulerKind, key: K): number {
        let nextTime = 1000;
        const currentDate = new Date();

        const monthIndex = new Date(currentDate).getMonth()

        // test
        const lastDayOfMonth = new Date(0)
        lastDayOfMonth.setFullYear(currentDate.getFullYear(), monthIndex + 1, 0)
        lastDayOfMonth.setHours(0, 0, 0, 0)
        const getDayIsMonth = lastDayOfMonth.getDate()

        // test
        const dayIsYear = new Date(0) ? 366 : 365;

        switch (kind) {
            case SchedulerKind.MINUTELY:
                nextTime = timestamp + nextTime * 60;
                break;
            case SchedulerKind.HOURLY:
                nextTime = timestamp + nextTime * 60 * 60;
                break;
            case SchedulerKind.DAILY:
                nextTime = timestamp + nextTime * 60 * 60 * 24;
                break;
            case SchedulerKind.WEEKLY:
                nextTime = timestamp + nextTime * 60 * 60 * 24 * 7;
                break;
            case SchedulerKind.MONTHLY:
                nextTime = timestamp + nextTime * 60 * 60 * 24 * getDayIsMonth;
                break;
            case SchedulerKind.YEARLY:
                nextTime = timestamp + nextTime * 60 * 60 * 24 * dayIsYear;
                break;
        }

        this._emitter.emit(EventName.NEXT_EXECUTE, key, {
            date: new Date(nextTime),
            kind
        })
        return nextTime;
    }

    private _getWeeklyDiff(date: WeeklyPayload): number {
        const {eYear, eMonth, eHours, eMinutes, eSeconds, eDays} = this._getCurrentDate()

        const cWeeklyDay = new Date(eYear, eMonth, eDays).getDay()
        const eWeeklyDay = new Date(eYear, eMonth, date.weeklyDay - 1).getDay()

        const cTime = new Date(eYear, eMonth, cWeeklyDay, eHours, eMinutes, eSeconds)
        const eTime = new Date(eYear, eMonth, eWeeklyDay, date.hours, date.minutes, date.seconds)

        return cTime > eTime ? (7 - (cWeeklyDay - eWeeklyDay)) : (eWeeklyDay - cWeeklyDay)
    }

    private _getCurrentDate(): CurrentDate  {
        const currentDate = new Date()

        return {
            eSeconds:  currentDate.getSeconds(),
            eMinutes: currentDate.getMinutes(),
            eHours: currentDate.getHours(),
            eDays: currentDate.getDate(),
            eWeekDay: currentDate.getDay(),
            eMonth: currentDate.getMonth(),
            eYear: currentDate.getFullYear(),
        }
    }
}

export default Scheduler
