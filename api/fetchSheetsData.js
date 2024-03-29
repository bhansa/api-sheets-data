/*
 * prerequisites
 */
if (!process.env.NETLIFY) {
  // get local env vars if not in CI
  // if in CI i expect its already set via the Netlify UI
  require('dotenv').config();
}
// required env vars
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  throw new Error('no GOOGLE_SERVICE_ACCOUNT_EMAIL env var set');
if (!process.env.GOOGLE_PRIVATE_KEY)
  throw new Error('no GOOGLE_PRIVATE_KEY env var set');
if (!process.env.GOOGLE_SPREADSHEET_ID_FROM_URL)
  // spreadsheet key is the long id in the sheets URL
  throw new Error('no GOOGLE_SPREADSHEET_ID_FROM_URL env var set');

/*
 * ok real work
 *
 * GET /.netlify/functions/google-spreadsheet-fn
 * GET /.netlify/functions/google-spreadsheet-fn/1
 * PUT /.netlify/functions/google-spreadsheet-fn/1
 * POST /.netlify/functions/google-spreadsheet-fn
 * DELETE /.netlify/functions/google-spreadsheet-fn/1
 *
 * the library also allows working just with cells,
 * but this example only shows CRUD on rows since thats more common
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  const UserIP = event.headers['x-nf-client-connection-ip'] || '6.9.6.9'; // not required, i just feel like using this info
  const { queryStringParameters } = event;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTION'
  };

  // Set default values of sheetId and sheetIndex
  var sheetId = process.env.GOOGLE_SPREADSHEET_ID_FROM_URL;
  var sheetIndex = 0;

  // Check if the sheetId parameter is provided in the URL
  if (queryStringParameters && queryStringParameters.sheetId) {
    // Extract the sheetId from the URL query parameters
    var { sheetId } = event.queryStringParameters;
  }

  // Check if the sheetIndex parameter is provided in the URL
  if (queryStringParameters && queryStringParameters.sheetIndex) {
    // Extract the sheetIndex from the URL query parameters
    var { sheetIndex } = event.queryStringParameters;
  }

  const doc = new GoogleSpreadsheet(sheetId);

  // https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });

  try {
    await doc.loadInfo(); // loads document properties and worksheets. required.
  }
  catch (err) {
    console.error('error ocurred in loading the sheet ', event);
    console.error(err);
    // Occurs when the sheetId or SheetIndex or both are invalid.
    return {
      statusCode: 404,
      body: err.toString()
    };
  }

  const sheet = doc.sheetsByIndex[sheetIndex]; // you may want to customize this if you have more than 1 sheet
  if (!sheet) {
    // If the sheet does not exist, return a 404 Not Found response
    return {
      statusCode: 404,
      headers,
      body: 'Sheet not found'
    };
  }

  // console.log('accessing', sheet.title, 'it has ', sheet.rowCount, ' rows');
  const path = event.path.replace(/\.netlify\/functions\/[^/]+/, '');
  const segments = path.split('/').filter((e) => e);

  try {
    switch (event.httpMethod) {
      case 'GET':
        /* GET /.netlify/functions/google-spreadsheet-fn */
        if (segments.length === 0) {
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          const serializedRows = rows.map(serializeRow);
          return {
            statusCode: 200,
            headers,
            // body: JSON.stringify(rows) // dont do this - has circular references
            body: JSON.stringify(serializedRows) // better
          };
        }
        /* GET /.netlify/functions/google-spreadsheet-fn/123456 */
        if (segments.length === 1) {
          const rowId = segments[0];
          const rows = await sheet.getRows(); // can pass in { limit, offset }
          const srow = serializeRow(rows[rowId]);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(srow) // just sends less data over the wire
          };
        } else {
          throw new Error(
            'too many segments in GET request - you should only call somehting like /.netlify/functions/google-spreadsheet-fn/123456 not /.netlify/functions/google-spreadsheet-fn/123456/789/101112'
          );
        }
      /* Fallthrough case */
      default:
        return {
          statusCode: 500,
          body: 'unrecognized HTTP Method, must be one of GET/POST/PUT/DELETE'
        };
    }
  } catch (err) {
    console.error('error ocurred in processing ', event);
    console.error(err);
    return {
      statusCode: 500,
      body: err.toString()
    };
  }

  /*
   * utils
   */
  function serializeRow(row) {
    let temp = {};
    sheet.headerValues.map((header) => {
      temp[header] = row[header];
    });
    return temp;
  }
};