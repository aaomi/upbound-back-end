import _isFunction from 'lodash/isFunction'

export const STATUS_BAD_REQUEST = 400
export const STATUS_UNAUTHORIZED = 401
export const STATUS_FORBIDDEN = 403
export const STATUS_NOT_FOUND = 404
export const STATUS_METHOD_NOT_ALLOWED = 405
export const STATUS_GONE = 410
export const STATUS_UNSUPPORTED_MEDIA_TYPE = 415
export const STATUS_UNPROCESSABLE_ENTITY = 422
export const STATUS_TOO_MANY_REQUESTS = 429
export const STATUS_INTERNAL_SERVER_ERROR = 500

const ERROR_CODE_DEFAULT_MESSAGES = {
  [STATUS_BAD_REQUEST]: 'Bad Request', // The request is malformed, such as if the body does not parse
  [STATUS_UNAUTHORIZED]: 'Unauthorized', // When no or invalid authentication details are provided. Also useful to trigger an auth popup if the API is used from a browser
  [STATUS_FORBIDDEN]: 'Forbidden', // When authentication succeeded but authenticated user doesn't have access to the resource
  [STATUS_NOT_FOUND]: 'Not Found', // When a non-existent resource is requested
  [STATUS_METHOD_NOT_ALLOWED]: 'Method Not Allowed', // When an HTTP method is being requested that isn't allowed for the authenticated user
  [STATUS_GONE]: 'Gone', // Indicates that the resource at this end point is no longer available. Useful as a blanket response for old API versions
  [STATUS_UNSUPPORTED_MEDIA_TYPE]: 'Unsupported Media Type', // If incorrect content type was provided as part of the request
  [STATUS_UNPROCESSABLE_ENTITY]: 'Unprocessable Entity', // Used for validation errors
  [STATUS_TOO_MANY_REQUESTS]: 'Too Many Requests', // When a request is rejected due to rate limiting
  [STATUS_INTERNAL_SERVER_ERROR]: 'Internal Server Error' // When a request is rejected due to rate limiting
}

class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.message = message

    // TODO: This is for backwards compatibility? - not needed on node?
    if (_isFunction(Error.captureStackTrace)) {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }
}

// TODO: return better description in response
export default class APIError extends ExtendableError {
  constructor (message, errorCode = STATUS_INTERNAL_SERVER_ERROR, errorList) {
    if (!message) message = ERROR_CODE_DEFAULT_MESSAGES[errorCode]
    super(message)
    this.status = errorCode
    this.errors = errorList
  }
}
