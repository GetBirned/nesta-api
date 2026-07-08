const featured = require('./featured.js');

exports.handler = async (event, context) => {
  event.queryStringParameters = { ...(event.queryStringParameters || {}), limit: event.queryStringParameters?.limit || '50' };
  return featured.handler(event, context);
};
