import _get from 'lodash/get'
import _pick from 'lodash/pick'
import _isUndefined from 'lodash/isUndefined'

import jwt from 'jsonwebtoken'
import router from 'router'

import crypto from 'crypto'

import ApiError, { STATUS_NOT_FOUND, STATUS_UNAUTHORIZED, STATUS_BAD_REQUEST } from 'responses/error'
import ApiSuccess, { STATUS_OK, STATUS_CREATED } from 'responses/success'

import { ROUTE_USERS, ROUTE_USERS_USER_ID, ROUTE_SESSIONS, ROUTE_SESSIONS_CREATE } from 'constants/routes/users'

import { DB_TABLE_NAME_USERS } from 'constants/database/users/users'

function createAuthorizationToken (user) {
  // TODO: launch background task to delete expired tokens?
  return jwt.sign(_pick(user, 'id'), process.env.HMAC_SECRET, {
    issuer: process.env.TOKEN_SIGNATURE_ISSUER,
    audience: process.env.TOKEN_SIGNATURE_AUDIENCE,
    expiresIn: 60 * 60 * 5 // expires in (5) hour(s)
  })
}

export const authenticateUser = async (ctx, next) => {
  if (!ctx.headers.authorization) throw new ApiError('No Authorization header present', STATUS_UNAUTHORIZED)

  const splitAuthorizationHeader = (ctx.headers.authorization || '').split('Bearer ')

  if (splitAuthorizationHeader.length !== 2) {
    throw new ApiError(`Invalid Authorization header format (Should match: 'Bearer <token>')`, STATUS_UNAUTHORIZED)
  }

  const token = splitAuthorizationHeader[1]

  let tokenPayload

  try {
    tokenPayload = jwt.verify(token, process.env.HMAC_SECRET)
  } catch (error) {
    // TODO: move string to a constant
    if (_get(error, 'name') === 'TokenExpiredError') {
      // TODO: remove expired token(s) from user in table?
      throw new ApiError('Authorization token expired', STATUS_UNAUTHORIZED)
    }

    throw new ApiError('Invalid Authorization token', STATUS_UNAUTHORIZED)
  }

  // TODO: validate token payload with ajv
  if (!tokenPayload.id) {
    throw new ApiError('Invalid Authorization token payload', STATUS_UNAUTHORIZED)
  }

  const matchedUsers = await ctx.knex(DB_TABLE_NAME_USERS).where({
    id: tokenPayload.id
  }).whereRaw(`'${token}' = ANY (tokens)`)

  if (!matchedUsers.length) {
    throw new ApiError('Invalid Authorization token', STATUS_UNAUTHORIZED)
  }

  if (matchedUsers.length !== 1) {
    // TODO: localize text
    // TODO: don't share this info?
    throw new ApiError('More than one account found with this token')
  }

  ctx.user = matchedUsers[0]

  return next()
}

// Authenticate for any user change routes
router.use([`/${ROUTE_USERS}/:${ROUTE_USERS_USER_ID}`], authenticateUser)

router
  .post(`/${ROUTE_USERS}`, async (ctx, next) => {
    // TODO: validate request

    const hash = crypto.createHash('sha256')
    hash.update(ctx.request.body['password'])

    // TODO: move id into constant
    let user, token
    try {
      // TODO: convert camel case to snake case automatically
      user = (await ctx.knex.insert(Object.assign(_pick(ctx.request.body, [
        'username',
        'first_name',
        'last_name',
        'email'
      ]), {
        password_digest: hash.digest('hex'),
        created_at: new Date()
      })).returning('*').into(DB_TABLE_NAME_USERS))[0]

      token = createAuthorizationToken(user)

      await ctx.knex(DB_TABLE_NAME_USERS).where({
        id: user.id
      }).update({
        tokens: `{${token}}`
      })
    } catch (error) {
      // TODO: move constraint name to constant. Use in migrations as well
      if (_get(error, 'constraint') === 'unique_email') {
        throw new ApiError('An account with this email address already exists', STATUS_BAD_REQUEST)
      }

      // TODO: move constraint name to constant. Use in migrations as well
      if (_get(error, 'constraint') === 'unique_username') {
        throw new ApiError('An account with this username already exists', STATUS_BAD_REQUEST)
      }

      throw new ApiError('Failed to create user')
    }

    return new ApiSuccess({
      id: user.id,
      token
    }, STATUS_CREATED, 'User created')
  })
  .post(`/${ROUTE_SESSIONS}/${ROUTE_SESSIONS_CREATE}`, async (ctx, next) => {
    if (!ctx.request.body['username'] || !ctx.request.body['password']) {
      throw new ApiError('Username and password required', STATUS_BAD_REQUEST)
    }

    const usernameOrEmail = ctx.request.body['username'].match('@')
      ? 'email' : 'username'

    const hash = crypto.createHash('sha256')
    hash.update(ctx.request.body['password'])

    const matchedUsers = await ctx.knex(DB_TABLE_NAME_USERS).where({
      [usernameOrEmail]: ctx.request.body['username'],
      password_digest: hash.digest('hex')
    })

    if (!matchedUsers.length) {
      // TODO: localize text
      throw new ApiError('Username and password combination not found', STATUS_NOT_FOUND)
    }

    if (matchedUsers.length !== 1) {
      // TODO: localize text
      // TODO: don't share this info?
      throw new ApiError('More than one account found with this username/email')
    }

    const token = createAuthorizationToken(matchedUsers[0])

    await ctx.knex.raw(`
      UPDATE users SET tokens = tokens || '{${token}}'
        WHERE ${usernameOrEmail} = '${ctx.request.body['username']}'
    `)

    return new ApiSuccess({
      token
    }, STATUS_CREATED)
  })
  .put(`/${ROUTE_USERS}/:${ROUTE_USERS_USER_ID}`, async (ctx, next) => {
    // TODO: validate request
    if (_isUndefined(ctx.params.id)) {
      throw new ApiError('ID is required', STATUS_BAD_REQUEST)
    }

    const matchedUsers = await ctx.knex(DB_TABLE_NAME_USERS).where({
      id: ctx.params.id
    })

    if (!matchedUsers.length) {
      // TODO: localize text
      throw new ApiError(`No user found with id equal to '${ctx.params.id}'`, STATUS_NOT_FOUND)
    }

    // Authorization
    // TODO: move?
    if (matchedUsers[0].id !== ctx.user.id) {
      throw new ApiError('Unauthorized to update user', STATUS_UNAUTHORIZED)
    }

    await ctx.knex(DB_TABLE_NAME_USERS).where({
      id: ctx.params.id
    }).update(ctx.request.body)

    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'User updated')
  })
  .del(`/${ROUTE_USERS}/:${ROUTE_USERS_USER_ID}`, async (ctx, next) => {
    // TODO: validate request
    if (_isUndefined(ctx.params.id)) {
      throw new ApiError('ID is required', STATUS_BAD_REQUEST)
    }

    const matchedUsers = await ctx.knex(DB_TABLE_NAME_USERS).where({
      id: ctx.params.id
    })

    if (!matchedUsers.length) {
      // TODO: localize text
      throw new ApiError(`No user found with id equal to '${ctx.params.id}'`, STATUS_NOT_FOUND)
    }

    // Authorization
    // TODO: move?
    if (matchedUsers[0].id !== ctx.user.id) {
      throw new ApiError('Unauthorized to delete user', STATUS_UNAUTHORIZED)
    }

    await ctx.knex(DB_TABLE_NAME_USERS).where({
      id: ctx.params.id
    }).del()

    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'User deleted')
  })
  .all(`/${ROUTE_SESSIONS}/${ROUTE_SESSIONS_CREATE}`, async (ctx, next) => {
    return new ApiSuccess(undefined, STATUS_OK)
  })
  .all(`/${ROUTE_USERS}/:${ROUTE_USERS_USER_ID}`, async (ctx, next) => {
    return new ApiSuccess(undefined, STATUS_OK)
  })
