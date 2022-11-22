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

    public set<FN, ARGS>(key: K, value: V): this {
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
            console.log('now', new Date(now))
            console.log('exe', new Date(execTime))
            const task = this.get(key)
            if (!task) {
                return
            }

            if (now >= execTime) {
                try {
                    const result = await task.job(task.args)
                    this._scheduler.set(key, this._getNextExecTime(execTime, task.time.kind, key))

                    console.log('result', result)
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
        const currentDate = new Date()

        let executeSeconds = currentDate.getSeconds()
        let executeMinutes = currentDate.getMinutes()
        let executeHours = currentDate.getHours()
        let executeDay = currentDate.getDate()
        let executeWeeklyDay = currentDate.getDay()
        let executeMonth = currentDate.getMonth()
        let executeYear = currentDate.getFullYear()

        switch (timer.kind) {
            case SchedulerKind.MINUTELY:
                if (executeSeconds > timer.time.seconds) executeMinutes += 1
                executeSeconds = timer.time.seconds
                break
            case SchedulerKind.HOURLY:
                if (executeMinutes > timer.time.minutes) executeHours += 1;
                executeMinutes = timer.time.minutes;
                executeSeconds = timer.time.seconds;
                break;
            case SchedulerKind.DAILY:
                if (executeHours > timer.time.hours) executeDay += 1;
                executeHours = timer.time.hours;
                executeMinutes = timer.time.minutes;
                executeSeconds = timer.time.seconds;
                break;
            case SchedulerKind.WEEKLY:
                executeSeconds = timer.time.seconds;
                executeMinutes = timer.time.minutes;
                executeHours = timer.time.hours;
                break;
            case SchedulerKind.YEARLY:
                if (executeMonth > timer.time.month) executeYear += 1;
                executeMonth = timer.time.month;
                executeDay = timer.time.days;
                executeHours = timer.time.hours;
                executeMinutes = timer.time.minutes;
                executeSeconds = timer.time.seconds;
                break;
            case SchedulerKind.DISPOSABLE:
                executeMonth = timer.time.month;
                executeDay = timer.time.days;
                executeHours = timer.time.hours;
                executeMinutes = timer.time.minutes;
                executeSeconds = timer.time.seconds;
                break;
            case SchedulerKind.INTERVAL:
                return timer.time.seconds;
            default:
                return new Date(3000, 0 ,1).getTime()
        }

        const executeDate = new Date(executeYear, executeMonth, executeDay, executeHours, executeMinutes, executeSeconds)

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


}

export default Scheduler

// private _getWeeklyDiff(date: WeeklyKind) {
//
// }

// private getWeeklyDiff(date: WeeklyPayload) {
//     const currentDate = new Date();
//
//     const executeYear = getYear(currentDate);
//     const executeMonth = getMonth(currentDate);
//     const executeHours = getHours(currentDate);
//     const executeMinutes = getMinutes(currentDate);
//     const executeSeconds = getSeconds(currentDate);
//
//     const currentWeeklyDay = getDay(
//         new Date(executeYear, executeMonth, getDate(currentDate))
//     );
//     const executeWeeklyDay = getDay(
//         new Date(executeYear, executeMonth, date.weeklyDay - 1)
//     );
//
//     const currentTime = milliseconds({
//         years: executeYear,
//         months: executeMonth,
//         days: currentWeeklyDay,
//         hours: executeHours,
//         minutes: executeMinutes,
//         seconds: executeSeconds,
//     });
//
//     const executeTime = milliseconds({
//         years: executeYear,
//         months: executeMonth,
//         days: executeWeeklyDay,
//         hours: date.hours,
//         minutes: date.minutes,
//         seconds: date.seconds,
//     });
//
//     let weeklyDiff = 1;
//     if (currentTime > executeTime) {
//         weeklyDiff = 7 - (currentWeeklyDay - executeWeeklyDay);
//     } else {
//         weeklyDiff *= executeWeeklyDay - currentWeeklyDay;
//     }
//
//     return weeklyDiff;
// }