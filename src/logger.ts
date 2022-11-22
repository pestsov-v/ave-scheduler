import {ILogger} from "../types/logger";

class Logger implements ILogger {
    private readonly _NOW: string
    private readonly _TITLE: string
    private readonly _LEVEL: Record<string, string>
    private readonly _COLOR: Record<string, string>

    constructor() {
        const dirtyDate = new Date()
        const hours = dirtyDate.getHours()
        const minutes = dirtyDate.getMinutes()
        const seconds = dirtyDate.getSeconds()

        this._NOW = `${hours}:${minutes}:${seconds}`
        this._TITLE = `~ ENV-READER`
        this._LEVEL = {
            INFO: '[INFO]',
            ERROR: '[ERROR]',
            WARN: '[WARNING]'
        }
        this._COLOR = {
            RED: "\x1b[31m%s\x1b[0m",
            GREEN: "\x1b[32m%s\x1b[0m",
            YELLOW: "\x1b[33m%s\x1b[0m"
        }
    }

    public error(text: string): void {
        console.error(`${this._COLOR.RED}`, `${this._TITLE} ${this._LEVEL.ERROR} ${this._NOW} ${text}`)
    }
}

export default new Logger()