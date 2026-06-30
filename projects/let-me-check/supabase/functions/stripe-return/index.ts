// Public https redirect target for Stripe Connect account_links.
//
// Stripe REJECTS custom app schemes (lmc://) as account_link return_url/refresh_url
// ("not a valid URL") — they must be https. This function is a valid https URL
// Stripe accepts, which immediately bounces the Scout back into the app via the
// lmc:// deep link. Deployed PUBLIC (--no-verify-jwt) because Stripe's browser
// redirect carries no Supabase apikey/JWT.
//
// ?status=onboarded → lmc://scout/payout?onboarded=1   (finished onboarding)
// ?status=refresh   → lmc://scout/payout?refresh=1     (link expired, retry)

Deno.serve((req: Request) => {
  const status = new URL(req.url).searchParams.get("status");
  const deepLink = status === "refresh"
    ? "lmc://scout/payout?refresh=1"
    : "lmc://scout/payout?onboarded=1";

  const safe = JSON.stringify(deepLink);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${deepLink}" />
    <title>Returning to Let Me Check…</title>
    <script>window.location.replace(${safe});</script>
    <style>
      body{font-family:-apple-system,system-ui,sans-serif;background:#fff;color:#0A0A0A;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100vh;margin:0;text-align:center;padding:24px}
      a{color:#DA251D;font-weight:700;text-decoration:none;margin-top:16px}
    </style>
  </head>
  <body>
    <p>Returning you to Let Me Check…</p>
    <a href="${deepLink}">Tap here if it doesn't open automatically</a>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});
