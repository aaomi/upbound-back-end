exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE job_seekers
    ALTER COLUMN assessment_ichat SET DATA TYPE TEXT
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE job_seekers
    ALTER COLUMN assessment_ichat SET DATA TYPE char[1]
  `
  return knex.raw(dropQuery)
}
