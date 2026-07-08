# NESTA API

Netlify Functions that safely call the Acuity API and return upcoming NESTA classes for Squarespace.

## Environment variables

Set these in Netlify:

- `ACUITY_USER_ID`
- `ACUITY_API_KEY`
- Optional: `ACUITY_SCHEDULING_URL` such as `https://nestanh.as.me/`

Regenerate your Acuity API key if it has ever been pasted into chat, email, screenshots, GitHub, or Squarespace.

## Endpoints

Featured classes for homepage:

```txt
/.netlify/functions/featured?limit=4
```

Calendar list:

```txt
/.netlify/functions/calendar?limit=50
```

## Squarespace usage

Use a Code Block and fetch the Netlify endpoint from client-side JavaScript. Never put the Acuity API key in Squarespace.
