const google = require('./src/google')
const http = require('./src/http')
const {
  GOOGLE_SHEETS_SHEET_ID,
  GOOGLE_SHEETS_SHEET_RANGE,
} = require('./src/settings')

exports.handler = http.function(async () => {
  const result = await google.sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_SHEET_ID,
    range: GOOGLE_SHEETS_SHEET_RANGE,
  })
  const [columns, ...rowsOfCells] = result.data.values
  return {
    body: rowsOfCells
  }
})