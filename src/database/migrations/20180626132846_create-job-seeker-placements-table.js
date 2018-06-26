exports.up = function (knex, Promise) {
  const createQuery = `CREATE TABLE job_seeker_placements(
    id SERIAL PRIMARY KEY NOT NULL,
    job_seeker_id INTEGER REFERENCES job_seekers(id),
    through_aaom BOOL,
    status TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    time_to_start_date INTEGER,
    company_name TEXT,
    industry TEXT,
    salary_info TEXT,
    hourly_rate TEXT,
    status_flsa TEXT,
    fte REAL
  )`
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `DROP TABLE job_seeker_placements`
  return knex.raw(dropQuery)
}
