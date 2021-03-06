import _get from 'lodash/get'
import _pick from 'lodash/pick'
import _isEmpty from 'lodash/isEmpty'
import _mapKeys from 'lodash/mapKeys'
import _isString from 'lodash/isString'
import _isArray from 'lodash/isArray'
import _isUndefined from 'lodash/isUndefined'

import router from 'router'

import { authenticateUser } from 'models/users'

import ApiError, { STATUS_NOT_FOUND, STATUS_UNAUTHORIZED, STATUS_BAD_REQUEST } from 'responses/error'
import ApiSuccess, { STATUS_OK, STATUS_CREATED } from 'responses/success'

import { ROUTE_JOB_SEEKERS, ROUTE_JOB_SEEKERS_ID } from 'constants/routes/jobSeekers'

import { DB_TABLE_NAME_USERS } from 'constants/database/users/users'
import { DB_TABLE_NAME_JOB_SEEKERS } from 'constants/database/jobSeekers/jobSeekers'
import { DB_TABLE_NAME_JOB_SEEKER_GUARDIANS } from 'constants/database/jobSeekers/guardians'
import { DB_TABLE_NAME_JOB_SEEKER_PLACEMENTS } from 'constants/database/jobSeekers/placements'

// Authenticate for any user change routes
router.use([`/${ROUTE_JOB_SEEKERS}/:${ROUTE_JOB_SEEKERS_ID}`], authenticateUser)
router.get(`/${ROUTE_JOB_SEEKERS}`, authenticateUser)

function ensureUsername (userBody) {
  let firstName = userBody['first_name']
  let lastName = userBody['last_name']

  if (firstName) {
    firstName = firstName.replace(/\s/gi, '_').replace(/[^\w]/gi, '')
  }
  if (lastName) {
    lastName = lastName.replace(/\s/gi, '_').replace(/[^\w]/gi, '')
  }

  if (!firstName && !lastName) {
    if (userBody['email'] && userBody['email'].match('@')) {
      return Object.assign({
        username: userBody['email'].split('@')[0].toLowerCase()
      }, userBody)
    }
  }

  if (!firstName || !lastName) {
    return Object.assign({
      username: (firstName || lastName).toLowerCase()
    }, userBody)
  }

  return Object.assign({
    username: (`${firstName}.${lastName}`).toLowerCase()
  }, userBody)
}

function typeCastJobSeekerIntakeBoolean (value) {
  if (!_isString(value)) {
    return value
  }

  const lowerCaseString = value.toLowerCase()
  if (lowerCaseString[0] === 'n') {
    return false
  }
  if (lowerCaseString[0] === 'y') {
    return true
  }
  if (lowerCaseString === 'no') {
    return false
  }
  if (lowerCaseString === 'yes') {
    return true
  }

  return value
}

router
  .get(`/${ROUTE_JOB_SEEKERS}`, async (ctx, next) => {
    // TODO: authorize the logged in user
    if (_get(ctx, `request.query.${'region_aaom_mi'}`) &&
      !_isArray(ctx.request.query['region_aaom_mi'])
    ) {
      ctx.request.query['region_aaom_mi'] = [ctx.request.query['region_aaom_mi']]
    }

    let whereStatements = []

    if (_get(ctx, `request.query.${'name'}`)) {
      const nameStatements = [
        `${'first_name'} % '${ctx.request.query['name']}'`,
        `${'last_name'} % '${ctx.request.query['name']}'`,
        `${'first_name'} LIKE '${ctx.request.query['name']}%'`,
        `${'last_name'} LIKE '${ctx.request.query['name']}%'`
      ]

      whereStatements.push(`(${nameStatements.join('\nOR\n')})`)
    }

    if (_get(ctx, `request.query.${'region_aaom_mi'}`)) {
      const regionStatements = ctx.request.query['region_aaom_mi'].map(
        (region) => `${'region_aaom_mi'} LIKE '${region}%'`)

      whereStatements.push(`(${regionStatements.join('\nOR\n')})`)
    }

    const matchedJobSeekers = await ctx.knex(DB_TABLE_NAME_USERS)
      .join(DB_TABLE_NAME_JOB_SEEKERS, `${DB_TABLE_NAME_USERS}.${'id'}`, '=', `${DB_TABLE_NAME_JOB_SEEKERS}.${'user_id'}`)
      .whereRaw(whereStatements.join('\nAND\n'))

    return new ApiSuccess(matchedJobSeekers, STATUS_OK)
  })
  .post(`/${ROUTE_JOB_SEEKERS}`, async (ctx, next) => {
    // TODO: validate request (more)
    if (!ctx.request.body['first_name'] && !ctx.request.body['last_name']) {
      throw new ApiError('No first name or last name provided')
    }

    const jobSeekerId = await ctx.knex.transaction(async (trx) => {
      // Order of events: create users, create job seeker, create guardians, create job placements
      const jobSeekerUserInfo = ensureUsername(Object.assign({
        created_at: new Date()
      }, _pick(ctx.request.body, [
        'username',
        'first_name',
        'last_name',
        'birth_date',
        'created_at',
        'email',
        'phone',
        'address_line_one',
        'address_line_two',
        'address_city',
        'address_zip_postal',
        'address_state_province',
        'address_country'
      ])))

      let jobSeekerUserId
      let matchedJobSeekerUsers

      if (jobSeekerUserInfo['birth_date']) {
        jobSeekerUserInfo['birth_date'] = new Date(jobSeekerUserInfo['birth_date'])
      }
      if (jobSeekerUserInfo['email']) {
        jobSeekerUserInfo['email'] = jobSeekerUserInfo['email'].toLowerCase()

        matchedJobSeekerUsers = await trx(DB_TABLE_NAME_USERS).where({
          email: jobSeekerUserInfo['email']
        })
      }
      if (!matchedJobSeekerUsers || !matchedJobSeekerUsers.length) {
        matchedJobSeekerUsers = await trx(DB_TABLE_NAME_USERS).where({
          username: jobSeekerUserInfo['username']
        })
      }

      if (matchedJobSeekerUsers && matchedJobSeekerUsers.length) {
        jobSeekerUserId = matchedJobSeekerUsers[0].id
      } else {
        jobSeekerUserId = (await trx.insert(jobSeekerUserInfo).returning('id').into(DB_TABLE_NAME_USERS))[0]
      }

      if ((await trx(DB_TABLE_NAME_JOB_SEEKERS).where({ user_id: jobSeekerUserId })).length) {
        throw new ApiError('A job seeker is already associated with this user', STATUS_BAD_REQUEST)
      }

      const jobSeekerInfo = Object.assign(_pick(ctx.request.body, [
        'last_contacted',
        'education_highest_completed',
        'education_highest_school',
        'education_highest_degree_program',
        'health_vision_difficulties',
        'health_hearing_difficulties',
        'health_restrictions_physical',
        'health_restrictions_mental',
        'health_assistive_devices',
        'health_additional_info',
        'state_support_programs',
        'family_support',
        'job_income',
        'job_income_details',
        'residential_info',
        'support_social',
        'transportation_drivers_license',
        'transportation_has_vehicle',
        'transportation_additional_info',
        'work_skills',
        'extracurriculars',
        'emergency_contact_first_name',
        'emergency_contact_last_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'referred_by',
        'computer_skills_languages',
        'interests',
        'region_aaom_mi',
        'resume_present',
        'resume_edit',
        'assessment_ichat',
        'assessment_objective_status',
        'assessment_summary',
        'assessment_achenbach',
        'notes_follow_up',
        'notes_general',
        'phone_screen_status',
        'meet_n_greet_status',
        'interview_prep',
        'disclosure_willing',
        'status_job_ready',
        'status_candidate_stage',
        'status_job_current',
        'job_coaching',
        'job_consideration',
        'from_db'
      ]), {
        user_id: jobSeekerUserId
      })

      jobSeekerInfo['transportation_drivers_license'] = typeCastJobSeekerIntakeBoolean(jobSeekerInfo['transportation_drivers_license'])
      jobSeekerInfo['transportation_has_vehicle'] = typeCastJobSeekerIntakeBoolean(jobSeekerInfo['transportation_has_vehicle'])
      jobSeekerInfo['resume_present'] = typeCastJobSeekerIntakeBoolean(jobSeekerInfo['resume_present'])

      const jobSeekerId = (await trx.insert(jobSeekerInfo).returning('id').into(DB_TABLE_NAME_JOB_SEEKERS))[0]

      if (ctx.request.body['guardian_email']) {
        const jobSeekerGuardianUserInfo = ensureUsername(_mapKeys(Object.assign({
          created_at: new Date()
        }, _pick(ctx.request.body, [
          'guardian_first_name',
          'guardian_last_name',
          'guardian_email',
          'guardian_phone'
        ])), (value, key) => key.replace('guardian_', '')))

        let matchedGuardianUsers
        if (jobSeekerGuardianUserInfo['email']) {
          jobSeekerGuardianUserInfo['email'] = jobSeekerGuardianUserInfo['email'].toLowerCase()

          matchedGuardianUsers = await trx(DB_TABLE_NAME_USERS).where({
            email: jobSeekerGuardianUserInfo['email']
          })
        }

        if (!matchedGuardianUsers || !matchedGuardianUsers.length) {
          matchedGuardianUsers = await trx(DB_TABLE_NAME_USERS).where({
            username: jobSeekerGuardianUserInfo['username']
          })
        }

        let jobSeekerGuardianUserId
        if (matchedGuardianUsers && matchedGuardianUsers.length) {
          jobSeekerGuardianUserId = matchedGuardianUsers[0].id
        } else {
          jobSeekerGuardianUserId = (await trx.insert(jobSeekerGuardianUserInfo).returning('id').into(DB_TABLE_NAME_USERS))[0]
        }

        await trx.insert({
          guardian_user_id: jobSeekerGuardianUserId,
          job_seeker_id: jobSeekerId
        }).into(DB_TABLE_NAME_JOB_SEEKER_GUARDIANS)
      }

      const jobPlacementInfo = _mapKeys(_pick(ctx.request.body, [
        'job_placement_through_aaom',
        'job_placement_status',
        'job_placement_start_date',
        'job_placement_end_date',
        'job_placement_time_to_start_date',
        'job_placement_company_name',
        'job_placement_industry',
        'job_placement_salary_info',
        'job_placement_hourly_rate',
        'job_placement_status_flsa',
        'job_placement_fte'
      ]), (value, key) => key.replace('job_placement_', ''))

      if (jobPlacementInfo['start_date']) {
        jobPlacementInfo['start_date'] = new Date(jobPlacementInfo['start_date'])
      }
      if (jobPlacementInfo['end_date']) {
        jobPlacementInfo['end_date'] = new Date(jobPlacementInfo['end_date'])
      }
      if (jobPlacementInfo['through_aaom']) {
        jobPlacementInfo['through_aaom'] = typeCastJobSeekerIntakeBoolean(jobPlacementInfo['through_aaom'])
      }

      if (!_isEmpty(jobPlacementInfo)) {
        await trx.insert(Object.assign(jobPlacementInfo, {
          job_seeker_id: jobSeekerId
        })).into(DB_TABLE_NAME_JOB_SEEKER_PLACEMENTS)
      }

      const secondaryJobPlacementInfo = _mapKeys(_pick(ctx.request.body, [
        'secondary_job_placement_through_aaom',
        'secondary_job_placement_status',
        'secondary_job_placement_start_date',
        'secondary_job_placement_end_date',
        'secondary_job_placement_time_to_start_date',
        'secondary_job_placement_company_name',
        'secondary_job_placement_industry',
        'secondary_job_placement_salary_info',
        'secondary_job_placement_hourly_rate',
        'secondary_job_placement_status_flsa',
        'secondary_job_placement_fte'
      ]), (value, key) => key.replace('secondary_job_placement_', ''))

      if (secondaryJobPlacementInfo['start_date']) {
        secondaryJobPlacementInfo['start_date'] = new Date(secondaryJobPlacementInfo['start_date'])
      }
      if (secondaryJobPlacementInfo['end_date']) {
        secondaryJobPlacementInfo['end_date'] = new Date(secondaryJobPlacementInfo['end_date'])
      }
      if (secondaryJobPlacementInfo['through_aaom']) {
        secondaryJobPlacementInfo['through_aaom'] = typeCastJobSeekerIntakeBoolean(secondaryJobPlacementInfo['through_aaom'])
      }

      if (!_isEmpty(secondaryJobPlacementInfo)) {
        await trx.insert(Object.assign(secondaryJobPlacementInfo, {
          job_seeker_id: jobSeekerId
        })).into(DB_TABLE_NAME_JOB_SEEKER_PLACEMENTS)
      }

      const tertiaryJobPlacementInfo = _mapKeys(_pick(ctx.request.body, [
        'tertiary_job_placement_through_aaom',
        'tertiary_job_placement_status',
        'tertiary_job_placement_start_date',
        'tertiary_job_placement_end_date',
        'tertiary_job_placement_time_to_start_date',
        'tertiary_job_placement_company_name',
        'tertiary_job_placement_industry',
        'tertiary_job_placement_salary_info',
        'tertiary_job_placement_hourly_rate',
        'tertiary_job_placement_status_flsa',
        'tertiary_job_placement_fte'
      ]), (value, key) => key.replace('tertiary_job_placement_', ''))

      if (tertiaryJobPlacementInfo['start_date']) {
        tertiaryJobPlacementInfo['start_date'] = new Date(tertiaryJobPlacementInfo['start_date'])
      }
      if (tertiaryJobPlacementInfo['end_date']) {
        tertiaryJobPlacementInfo['end_date'] = new Date(tertiaryJobPlacementInfo['end_date'])
      }
      if (tertiaryJobPlacementInfo['through_aaom']) {
        tertiaryJobPlacementInfo['through_aaom'] = typeCastJobSeekerIntakeBoolean(tertiaryJobPlacementInfo['through_aaom'])
      }

      if (!_isEmpty(tertiaryJobPlacementInfo)) {
        await trx.insert(Object.assign(tertiaryJobPlacementInfo, {
          job_seeker_id: jobSeekerId
        })).into(DB_TABLE_NAME_JOB_SEEKER_PLACEMENTS)
      }

      return jobSeekerId
    })

    return new ApiSuccess({
      id: jobSeekerId
    }, STATUS_CREATED, 'Job seeker created')
  })
  .put(`/${ROUTE_JOB_SEEKERS}/:${ROUTE_JOB_SEEKERS_ID}`, async (ctx, next) => {
    // TODO: validate request
    if (_isUndefined(ctx.params.id)) {
      throw new ApiError('ID is required', STATUS_BAD_REQUEST)
    }

    const matchedJobSeekers = await ctx.knex(DB_TABLE_NAME_JOB_SEEKERS).where({
      id: ctx.params.id
    })

    if (!matchedJobSeekers.length) {
      // TODO: localize text
      throw new ApiError(`No user found with id equal to '${ctx.params.id}'`, STATUS_NOT_FOUND)
    }

    // Authorization
    // TODO: move?

    const matchedGuardians = await ctx.knex(DB_TABLE_NAME_JOB_SEEKER_GUARDIANS).where({
      guardian_user_id: ctx.user.id,
      job_seeker_id: matchedJobSeekers[0].id
    })

    if (!matchedGuardians.length || matchedJobSeekers[0].user_id !== ctx.user.id) {
      throw new ApiError('Unauthorized to update job seeker', STATUS_UNAUTHORIZED)
    }

    await ctx.knex(DB_TABLE_NAME_JOB_SEEKERS).where({
      id: ctx.params.id
    }).update(ctx.request.body)

    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'Job seeker updated')
  })
  .del(`/${ROUTE_JOB_SEEKERS}/:${ROUTE_JOB_SEEKERS_ID}`, async (ctx, next) => {
    // TODO: validate request
    if (_isUndefined(ctx.params.id)) {
      throw new ApiError('ID is required', STATUS_BAD_REQUEST)
    }

    const matchedJobSeekers = await ctx.knex(DB_TABLE_NAME_JOB_SEEKERS).where({
      id: ctx.params.id
    })

    if (!matchedJobSeekers.length) {
      // TODO: localize text
      throw new ApiError(`No user found with id equal to '${ctx.params.id}'`, STATUS_NOT_FOUND)
    }

    // Authorization
    // TODO: move?

    const matchedGuardians = await ctx.knex(DB_TABLE_NAME_JOB_SEEKER_GUARDIANS).where({
      guardian_user_id: ctx.user.id,
      job_seeker_id: matchedJobSeekers[0].id
    })

    if (!matchedGuardians.length || matchedJobSeekers[0].user_id !== ctx.user.id) {
      throw new ApiError('Unauthorized to delete job seeker', STATUS_UNAUTHORIZED)
    }

    await ctx.knex(DB_TABLE_NAME_JOB_SEEKERS).where({
      id: ctx.params.id
    }).del()

    // TODO: localize text
    return new ApiSuccess(undefined, STATUS_OK, 'Job seeker deleted')
  })
