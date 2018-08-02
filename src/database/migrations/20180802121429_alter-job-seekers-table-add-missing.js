exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE job_seekers
    ADD COLUMN state_support_programs TEXT,
    ADD COLUMN interests TEXT,
    ADD COLUMN status_job_current TEXT
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE job_seekers
    DROP COLUMN state_support_programs TEXT,
    DROP COLUMN interests TEXT,
    DROP COLUMN status_job_current TEXT
  `
  return knex.raw(dropQuery)
}
