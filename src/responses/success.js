export const STATUS_OK = 200
export const STATUS_CREATED = 201
export const STATUS_NO_CONTENT = 204
export const STATUS_NOT_MODIFIED = 304

const SUCCESS_DEFAULT_MESSAGES = {
  [STATUS_OK]: 'OK', // Response to a successful GET, PUT, PATCH or DELETE. Can also be used for a POST that doesn't result in a creation.
  [STATUS_CREATED]: 'Created', // Response to a POST that results in a creation. Should be combined with a Location header pointing to the location of the new resource
  [STATUS_NO_CONTENT]: 'No Content', // Response to a successful request that won't be returning a body (like a DELETE request)
  [STATUS_NOT_MODIFIED]: 'Not Modified' // Used when HTTP caching headers are in play
}

export default class ApiSuccess {
  constructor (data, successCode = STATUS_OK, message) {
    if (!message) message = SUCCESS_DEFAULT_MESSAGES[successCode]
    this.message = message
    this.status = successCode
    this.data = data
  }
}
