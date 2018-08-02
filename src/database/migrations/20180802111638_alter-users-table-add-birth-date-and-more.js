exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE users
    ADD COLUMN birth_date DATE
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE users
    DROP COLUMN birth_date DATE
  `
  return knex.raw(dropQuery)
}
