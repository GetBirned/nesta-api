exports.handler = async function () {
  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");

  try {
    const response = await fetch(
      "https://acuityscheduling.com/api/v1/availability/classes",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Acuity error: ${response.status}`);
    }

    const classes = await response.json();

    const upcoming = classes
      .slice(0, 4)
      .map((item) => ({
        name: item.name || item.appointmentTypeName,
        datetime: item.time || item.datetime,
        calendar: item.calendar || item.calendarName,
        spotsLeft: item.slotsAvailable || item.spotsAvailable || null,
        price: item.price ? `$${item.price}` : "",
        registerUrl: item.schedulingUrl || "https://nestanh.as.me/",
      }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upcoming),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};