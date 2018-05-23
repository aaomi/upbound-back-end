const fs = require('fs')
const readline = require('readline')
const {google} = require('googleapis')

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
    if (err) return console.log('The API returned an error: ' + err)
    const rows = data.values
    if (rows.length) {
      const fileContent = rows.map((row) => {
        return row.join(',')
      }).join('\n')

      // console.log(fileContent)

      const filePath = `data/jobSeekerDatabaseDump_${(new Date()).toJSON()}.csv`

      fs.writeFile(filePath, fileContent, (err) => {
        if (err) console.error(err)
        console.log('Dumped data to', filePath)
      })
    } else {
      console.log('No data found.')
    }
  })
}
