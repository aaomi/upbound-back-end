exports.up = function (knex, Promise) {
  const createQuery = `ALTER TABLE users
    ADD COLUMN phone TEXT,
    ADD COLUMN address_line_one TEXT,
    ADD COLUMN address_line_two TEXT,
    ADD COLUMN address_city TEXT,
    ADD COLUMN address_zip_postal TEXT,
    ADD COLUMN address_state_province TEXT,
    ADD COLUMN address_country TEXT
  `
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `ALTER TABLE users
    DROP COLUMN phone TEXT,
    DROP COLUMN address_line_one TEXT,
    DROP COLUMN address_line_two TEXT,
    DROP COLUMN address_city TEXT,
    DROP COLUMN address_zip_postal TEXT,
    DROP COLUMN address_state_province TEXT,
    DROP COLUMN address_country TEXT
  `
  return knex.raw(dropQuery)
}
