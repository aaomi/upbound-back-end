exports.up = function (knex, Promise) {
  const createQuery = `CREATE TABLE job_seeker_guardians(
    id SERIAL PRIMARY KEY NOT NULL,
    job_seeker_id INTEGER REFERENCES job_seekers(id),
    guardian_user_id INTEGER REFERENCES users(id)
  )`
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `DROP TABLE job_seeker_guardians`
  return knex.raw(dropQuery)
}
