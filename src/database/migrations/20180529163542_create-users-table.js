exports.up = function (knex, Promise) {
  const createQuery = `CREATE TABLE users(
    id SERIAL PRIMARY KEY NOT NULL,
    username TEXT,
    token TEXT,
    password_digest TEXT,
    created_at TIMESTAMP
  )`
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `DROP TABLE users`
  return knex.raw(dropQuery)
}
