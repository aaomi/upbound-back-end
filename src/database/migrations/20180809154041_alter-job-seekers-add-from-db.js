exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE job_seekers
    ADD COLUMN from_db BOOL
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE job_seekers
    DROP COLUMN from_db BOOL
  `
  return knex.raw(dropQuery)
}
