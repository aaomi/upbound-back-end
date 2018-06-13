exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE users
    ADD CONSTRAINT unique_email UNIQUE (email),
    ADD CONSTRAINT unique_username UNIQUE (username)
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE users
    DROP CONSTRAINT unique_email,
    DROP CONSTRAINT unique_username
  `
  return knex.raw(dropQuery)
}
