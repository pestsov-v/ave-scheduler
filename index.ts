import http from 'http'
import Scheduler from "./src";
import {SchedulerKind} from "./types/scheduler";

const server = http.createServer()
server.listen()

const scheduler = new Scheduler()

const fn = (a: number) => {
    const prom = new Promise(resolve => {
        return resolve(a * 2)
    })
    return prom.then(result => {
        return result
    })
}

scheduler.set('qwqsw', {
    job: fn,
    args: [12],
    time: {kind: SchedulerKind.MINUTELY, time: {seconds: 10}}
})

scheduler.on('success', (a, b) => {
    console.log('success', a, b)
})


scheduler.on('error', (a, b) => {
    console.log('error', a, b)
})