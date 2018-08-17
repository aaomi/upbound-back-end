// NOTE: this didn't work locally, had to run manually

exports.up = function (knex, Promise) {
  return knex.raw(`
    CREATE EXTENSION pg_trgm;
  `)
}

exports.down = function (knex, Promise) {
  return knex.raw(`
    DROP EXTENSION pg_trgm;
  `)
}
