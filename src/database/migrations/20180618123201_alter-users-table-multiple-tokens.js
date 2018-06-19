exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE users
    DROP COLUMN token,
    ADD COLUMN tokens TEXT ARRAY
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE users
    DROP COLUMN tokens,
    ADD COLUMN token TEXT
  `
  return knex.raw(dropQuery)
}
