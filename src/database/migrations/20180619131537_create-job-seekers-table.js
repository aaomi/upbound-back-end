exports.up = function (knex, Promise) {
  const createQuery = `CREATE TABLE job_seekers(
    id SERIAL PRIMARY KEY NOT NULL,
    user_id INTEGER REFERENCES users(id),
    last_contacted TIMESTAMP,
    education_highest_completed TEXT,
    education_highest_school TEXT,
    education_highest_degree_program TEXT,
    health_vision_difficulties TEXT,
    health_hearing_difficulties TEXT,
    health_restrictions_physical TEXT,
    health_restrictions_mental TEXT,
    health_assistive_devices TEXT,
    health_additional_info TEXT,
    family_support TEXT,
    job_income TEXT,
    job_income_details TEXT,
    residential_info TEXT,
    support_social TEXT,
    transportation_drivers_license BOOL,
    transportation_has_vehicle BOOL,
    transportation_additional_info TEXT,
    work_skills TEXT,
    extracurriculars TEXT,
    emergency_contact_first_name TEXT,
    emergency_contact_last_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    referred_by TEXT,
    computer_skills_languages TEXT,
    region_aaom_mi TEXT,
    resume_present BOOL,
    resume_edit TEXT,
    assessment_ichat char[1],
    assessment_objective_status TEXT,
    assessment_summary TEXT,
    assessment_achenbach TEXT,
    notes_follow_up TEXT,
    notes_general TEXT,
    phone_screen_status TEXT,
    meet_n_greet_status TEXT,
    interview_prep TEXT,
    disclosure_willing TEXT,
    status_job_ready TEXT,
    status_candidate_stage TEXT,
    job_coaching TEXT,
    job_consideration TEXT
  )`
  return knex.raw(createQuery)
}

exports.down = function (knex, Promise) {
  const dropQuery = `DROP TABLE job_seekers`
  return knex.raw(dropQuery)
}
