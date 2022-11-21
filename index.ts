import http from 'http'
import Scheduler from "./src";

const server = http.createServer()
server.listen()

const scheduler = new Scheduler()