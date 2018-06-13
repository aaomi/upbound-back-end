require('babel-polyfill')

require('babel-core/register', {
  ignore: false
})

require('dotenv').config()

require('./src/app')
