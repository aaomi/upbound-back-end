import _isObject from 'lodash/isObject'
import _pick from 'lodash/pick'

import http from 'http'
import https from 'https'

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import logger from 'koa-logger'

import pg from 'pg'

import filesize from 'filesize'

import fs from 'fs'
// import path from 'path'
import rfs from 'rotating-file-stream'

import { DIRECTORY_PATH_LOG_FOLDER } from 'constants/directories'
import { LOG_FILE_PATH_ACCESS_LOG } from 'constants/logs'
import { NUMBER_OF_SPACES_PER_TAB } from 'constants/responses'
import { PORT_NUMBER_DEV_HTTP, PORT_NUMBER_DEV_HTTPS, POSTGRES_URL_DEV } from 'constants/hosting'

import { STATUS_INTERNAL_SERVER_ERROR } from 'responses/error'
import { STATUS_OK } from 'responses/success'

// initialize Koa app

export const app = new Koa()
const APP_NAME = 'upbound'
app.name = APP_NAME

app.context.db = new pg.Client(POSTGRES_URL_DEV)

const __DEV__ = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
const __PROD__ = process.env.NODE_ENV === 'production'

// logger

// ensure log directory exists
fs.existsSync(DIRECTORY_PATH_LOG_FOLDER) || fs.mkdirSync(DIRECTORY_PATH_LOG_FOLDER)

// ensure access log file exists
fs.existsSync(LOG_FILE_PATH_ACCESS_LOG) || fs.writeFileSync(LOG_FILE_PATH_ACCESS_LOG)

let logFileStream

if (__PROD__) {
  // create a rotating write stream
  logFileStream = rfs(LOG_FILE_PATH_ACCESS_LOG, {
    interval: '1d', // rotate daily
    path: DIRECTORY_PATH_LOG_FOLDER
  })
}

if (__DEV__) {
  app.use(logger())
}

// x-response-time

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}ms`)

  if (logFileStream) {
    logFileStream.write(`${ctx.request.ip} ${ctx.request.origin} ${ctx.req.method} ${ctx.req.url} ${ctx.response.status} ${ms}ms ${filesize(ctx.response.length)}\n`)
  }
})

app.use(bodyParser())

// response

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    const err = error || {}

    let errorCode = err.status || STATUS_INTERNAL_SERVER_ERROR

    // TODO: Add description in response to help determine issue
    ctx.body = Object.assign({ status: errorCode }, _pick(err, ['message', 'errors', 'description']))
    ctx.status = errorCode

    // TODO: Add default message?

    // TODO: Make methods of these checks
    // TODO: Make prettier
    if (String(ctx.status)[0] === '5') console.error(err.stack)
  }
})

app.use(async (ctx, next) => {
  let result = {}

  // Handle route
  // result = await tableController.run.call(tableController, ctx, whereParam, preAuth)

  ctx.body = result.body || result
  ctx.status = result.status || STATUS_OK
})

app.use(async ctx => {
  if (_isObject(ctx.body)) {
    if (__DEV__) {
      ctx.body = JSON.stringify(ctx.body, null, NUMBER_OF_SPACES_PER_TAB)
      return
    }
    ctx.body = JSON.stringify(ctx.body)
  }
})

// Connect db before starting server
app.context.db.connect((err) => {
  if (err) return console.error('Could not connect to postgres', err)

  http.createServer(app.callback()).listen(PORT_NUMBER_DEV_HTTP)
  https.createServer(app.callback()).listen(PORT_NUMBER_DEV_HTTPS)
})