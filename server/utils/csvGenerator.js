const { Parser } = require('json2csv');

/**
 * Generates CSV content for a saved trip itinerary.
 * @param {Object} savedTrip - Mongoose document of SavedTrip.
 * @returns {string} CSV string.
 */
function generateTripCSV(savedTrip) {
  const { itinerary = [], destination = 'trip' } = savedTrip;
  // Ensure itinerary is an array of objects with day, content, metadata
  const rows = itinerary.map(section => ({
    Day: section.day,
    Content: typeof section.content === 'string' ? section.content : JSON.stringify(section.content),
    Metadata: section.metadata || ''
  }));
  const fields = ['Day', 'Content', 'Metadata'];
  const parser = new Parser({ fields });
  return parser.parse(rows);
}

module.exports = { generateTripCSV };
