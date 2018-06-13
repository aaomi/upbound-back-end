import _get from 'lodash/get'
import _pick from 'lodash/pick'
import _find from 'lodash/find'

import jwt from 'jsonwebtoken'
import router from 'router'

import ApiError, { STATUS_NOT_FOUND, STATUS_UNAUTHORIZED } from 'responses/error'
import ApiSuccess, { STATUS_OK, STATUS_CREATED } from 'responses/success'

function createAuthorizationToken (user) {
  return {
    token: jwt.sign(_pick(user, 'email'), process.env.HMAC_SECRET, {
      issuer: process.env.TOKEN_SIGNATURE_ISSUER,
      audience: process.env.TOKEN_SIGNATURE_AUDIENCE,
      expiresIn: 60 * 60 // expires in one hour
    })
  }
}

export const authenticateUser = async (ctx, next) => {
  if (!ctx.headers.authorization) throw new ApiError('No Authorization header present', STATUS_UNAUTHORIZED)

  const splitAuthorizationHeader = ctx.headers.authorization.split('Bearer ')

  if (splitAuthorizationHeader.length !== 2) throw new ApiError('Invalid Authorization header format (Should match: "Bearer <token>")', STATUS_UNAUTHORIZED)

  const authToken = splitAuthorizationHeader[1]

  let tokenPayload

  try {
    tokenPayload = jwt.verify(authToken, process.env.HMAC_SECRET)
  } catch (error) {
    // TODO: move string to a constant
    if (_get(error, 'name') === 'TokenExpiredError') {
      throw new ApiError('Authorization token expired', STATUS_UNAUTHORIZED)
    }

    throw new ApiError('Invalid Authorization token', STATUS_UNAUTHORIZED)
  }

  console.log(tokenPayload)

  // TODO: Replace with postgres query
  const user = _find(users, {
    email: tokenPayload.email
  })

  if (!user) {
    throw new ApiError('Invalid Authorization token', STATUS_UNAUTHORIZED)
  }

  if (user.authTokens.indexOf(authToken) === -1) {
    throw new ApiError('Invalid Authorization token', STATUS_UNAUTHORIZED)
  }

  return next()
}

// TODO: Replace with postgres query
const users = [
  {
    id: 1,
    username: 'jimbob',
    email: 'jimbob@gmail.org',
    password: 'password',
    authTokens: [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImppbWJvYkBnbWFpbC5vcmciLCJpYXQiOjE1Mjg5MjEzMDYsImV4cCI6MTUyODkyNDkwNiwiYXVkIjoidXBib3VuZC1mcm9udC1lbmQiLCJpc3MiOiJ1cGJvdW5kLWJhY2stZW5kIn0.BXCobQm6vGmf8MKdstV6FsCrz06a09Jky8nkvqI49XQ'
    ]
  }
]

// Authenticate for any user change routes
router.use(['/users/:id'], authenticateUser)

router
  .post('/users', async (ctx, next) => {
    return new ApiSuccess(createAuthorizationToken(ctx.request.body), STATUS_CREATED)
  })
  .post('/sessions/create', async (ctx, next) => {
    // TODO: validate request

    // TODO: Replace with postgres query
    const user = _find(users, {
      [ctx.request.body.username.match('@') ? 'email' : 'username']: ctx.request.body.username,
      password: ctx.request.body.password
    })

    if (!user) {
      // TODO: localize text
      throw new ApiError('Username and password combination not found', STATUS_NOT_FOUND)
    }

    return new ApiSuccess(createAuthorizationToken(user))
  })
  .put('/users/:id', async (ctx, next) => {
    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'User updated')
  })
  .del('/users/:id', async (ctx, next) => {
    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'User deleted')
  })
  .all('/users/:id', async (ctx, next) => {
    await authenticateUser(ctx)
  })
