const ACUITY_BASE = 'https://acuityscheduling.com/api/v1';
const DEFAULT_SCHEDULING_URL = process.env.ACUITY_SCHEDULING_URL || 'https://nesta.as.me/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120, s-maxage=300'
};

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function getAuthHeader() {
  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Missing ACUITY_USER_ID or ACUITY_API_KEY environment variables.');
  }

  return `Basic ${Buffer.from(`${userId}:${apiKey}`).toString('base64')}`;
}

async function acuityFetch(path) {
  const response = await fetch(`${ACUITY_BASE}${path}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json'
    }
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Acuity API error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonth(date) {
  return date ? date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
}

function formatDay(date) {
  return date ? date.toLocaleDateString('en-US', { day: '2-digit' }) : '';
}

function formatTimeRange(date, minutes) {
  if (!date) return '';
  const end = new Date(date.getTime() + (Number(minutes || 0) * 60000));
  const opts = { hour: 'numeric', minute: '2-digit' };
  const startLabel = date.toLocaleTimeString('en-US', opts);
  const endLabel = end.toLocaleTimeString('en-US', opts);
  return minutes ? `${startLabel} – ${endLabel}` : startLabel;
}

function normalizeClass(item, apptTypeById = {}) {
  const appointmentTypeID = item.appointmentTypeID || item.appointmentTypeId || item.appointmentType || item.typeID;
  const type = apptTypeById[String(appointmentTypeID)] || {};
  const date = normalizeDate(item.time || item.datetime || item.calendarDateTime || item.date);
  const max = item.max || item.maxAttendees || type.max || type.maxAttendees || null;
  const taken = item.taken || item.slotsTaken || item.currentParticipants || 0;
  const slotsAvailable = item.slotsAvailable ?? item.spotsAvailable ?? item.available ?? (max ? Math.max(Number(max) - Number(taken || 0), 0) : null);

  return {
    id: item.id || `${appointmentTypeID || 'class'}-${item.time || item.date}`,
    appointmentTypeID,
    name: item.name || item.appointmentTypeName || type.name || 'Training Class',
    description: type.description || item.description || '',
    month: formatMonth(date),
    day: formatDay(date),
    dateISO: date ? date.toISOString() : null,
    time: formatTimeRange(date, item.duration || type.duration),
    durationMinutes: item.duration || type.duration || null,
    location: item.calendar || item.calendarName || item.location || type.location || 'Belmont, NH',
    price: item.price || type.price ? `$${item.price || type.price}` : '',
    spotsLeft: slotsAvailable,
    registerUrl: item.schedulingUrl || type.schedulingUrl || `${DEFAULT_SCHEDULING_URL}?appointmentType=${appointmentTypeID || ''}`
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const limit = Number(event.queryStringParameters?.limit || 4);

    const [appointmentTypes, classes] = await Promise.all([
      acuityFetch('/appointment-types'),
      acuityFetch('/availability/classes')
    ]);

    const apptTypeById = Object.fromEntries(
      appointmentTypes.map((type) => [String(type.id), type])
    );

    const upcoming = classes
      .map((item) => normalizeClass(item, apptTypeById))
      .filter((item) => item.dateISO)
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO))
      .slice(0, limit);

    return json(200, { classes: upcoming });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
