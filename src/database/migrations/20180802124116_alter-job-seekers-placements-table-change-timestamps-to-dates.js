exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE job_seeker_placements
    ALTER COLUMN start_date SET DATA TYPE DATE,
    ALTER COLUMN end_date SET DATA TYPE DATE
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE job_seeker_placements
    ALTER COLUMN start_date SET DATA TYPE DATE,
    ALTER COLUMN end_date SET DATA TYPE DATE
  `
  return knex.raw(dropQuery)
}
