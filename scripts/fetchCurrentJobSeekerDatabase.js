const fs = require('fs')
const readline = require('readline')
const {google} = require('googleapis')
const axios = require('axios')
const _get = require('lodash/get')
const _isArray = require('lodash/isArray')
const _isString = require('lodash/isString')
const _isEmpty = require('lodash/isEmpty')

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const TOKEN_PATH = '.aaom_google_credentials/credentials.json'

const AAOM_JOB_SEEKER_INTAKE_DATABASE_SPREADSHEET_ID = '1wR120HYUTBwVfKSH-pNwinTNnrNFdogV565sgmAMdec'
const AAOM_JOB_SEEKER_INTAKE_DATABASE_SPREADSHEET_CANDIDATE_TAB_NAME = 'Candidates'

// Load client secrets from a local file.
fs.readFile('.aaom_google_credentials/client_id.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err)
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), fetchJobSeekers)
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials, callback) {
  const clientSecret = credentials.web['client_secret']
  const clientId = credentials.web['client_id']
  const redirectUris = credentials.web['redirect_uris']

  const oAuth2Client = new google.auth.OAuth2(
    clientId, clientSecret, redirectUris[0])

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    callback(oAuth2Client)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken (oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })
  console.log('Authorize this app by visiting this url:', authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err)
      oAuth2Client.setCredentials(token)
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err)
        console.log('Token stored to', TOKEN_PATH)
      })
      callback(oAuth2Client)
    })
  })
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function fetchJobSeekers (auth) {
  const sheets = google.sheets({version: 'v4', auth})
  sheets.spreadsheets.values.get({
    spreadsheetId: AAOM_JOB_SEEKER_INTAKE_DATABASE_SPREADSHEET_ID,
    range: `${AAOM_JOB_SEEKER_INTAKE_DATABASE_SPREADSHEET_CANDIDATE_TAB_NAME}`
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err + err.stack + JSON.stringify(data))
    const rows = data.values
    if (rows.length) {
      fs.readFile('data/job_seeker_db_key_map.json', (err, content) => {
        if (err) return console.log('Error loading key map file:', err)

        const keyMap = JSON.parse(content)
        const errorLogs = []
        const promises = []

        let numberOfSuccesses = 0
        let numberTotal = 0

        rows.forEach((row, index) => {
          if (index === 0) return // TODO: this should just validate a few key fields instead
          const jobSeeker = {}
          row.forEach((value, index) => {
            let editedValue = value
            if (_isString(value)) {
              editedValue = editedValue.trim()
              if (editedValue.length === 0) {
                return
              }
            }

            if (!keyMap[index].key.length) return

            if (_isArray(keyMap[index].key)) {
              keyMap[index].key.forEach((key) => {
                jobSeeker[key] = editedValue
              })
            } else {
              jobSeeker[keyMap[index].key] = editedValue
            }
          })

          // Special case for empty rows
          if (_isEmpty(jobSeeker)) {
            return
          }

          // Special case for color legend rows
          if (jobSeeker['email'] && jobSeeker['email'][jobSeeker['email'].length - 1] === ':') {
            return
          }

          jobSeeker['from_db'] = true

          promises.push(axios.post('http://localhost:3000/job_seekers', jobSeeker).then(() => {
            numberOfSuccesses = numberOfSuccesses + 1
          }).catch((error) => {
            if (_get(error, 'response.data.message') === 'A job seeker is already associated with this user') {
              return
            }

            errorLogs.push({
              errorMessage: _get(error, 'response.data.message') || JSON.stringify(_get(error, 'response')),
              jobSeeker,
              index
            })
          }).finally(() => {
            numberTotal = numberTotal + 1
          }))
        })

        axios.all(promises).finally(() => {
          console.log(`${numberOfSuccesses}/${numberTotal} submitted successfully`)

          if (!errorLogs.length) {
            return
          }

          const fileContent = JSON.stringify(errorLogs, null, 2)

          const filePath = `data/jobSeekerImportErrorLog_${(new Date()).toJSON()}.json`

          fs.writeFile(filePath, fileContent, (err) => {
            if (err) console.error(err)
            console.log('Logged errors to', filePath)
          })
        })
      })
    } else {
      console.log('No data found.')
    }
  })
}
