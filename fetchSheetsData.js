const google = require('./src/google')
const http = require('./src/http')
const {
    GOOGLE_SHEETS_SHEET_ID
} = require('./src/settings')

exports.handler = http.function(async () => {
    const result = await google.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_SHEET_ID
    })
    const [columns, ...rowsOfCells] = result.data.values
    return {
        body : rowsOfCells.map(toRowObject(columns))
    }
})

const toRowObject = (/** @type {string[]} */ columns) => (
    /** @type {string[]} */ cells
  ) => {
    return columns.reduce(
      (row, column, index) => ({ ...row, [column]: parseValue(cells[index]) }),
      {}
    )
  }

  const parseValue = (value) => {
    const valueAsNumber = Number(value)
    return isNaN(valueAsNumber) ? value : valueAsNumber
  }