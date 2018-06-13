require('babel-polyfill');
require('babel-core/register');

var hostingConstants = require('./src/constants/hosting');
var POSTGRES_URL_DEV = hostingConstants.POSTGRES_URL_DEV;
var POSTGRES_URL_DEV_TEST = hostingConstants.POSTGRES_URL_DEV_TEST;

module.exports = {
  development: {
    client: 'pg',
    connection: POSTGRES_URL_DEV,
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds/development'
    },
    useNullAsDefault: true
  },
  test: {
    client: 'pg',
    connection: POSTGRES_URL_DEV_TEST,
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds/test'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds/production'
    },
    useNullAsDefault: true
  }
}
