exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE users
    ADD COLUMN email TEXT,
    ADD COLUMN first_name TEXT,
    ADD COLUMN last_name TEXT
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE users
    DROP COLUMN email,
    DROP COLUMN first_name,
    DROP COLUMN last_name
  `
  return knex.raw(dropQuery)
}
