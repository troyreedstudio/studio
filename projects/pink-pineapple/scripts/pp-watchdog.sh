#!/usr/bin/env bash
# Pink Pineapple uptime watchdog.
# Runs from root's crontab on the Hostinger VPS every 5 minutes:
#   */5 * * * * /root/pp-watchdog.sh >/dev/null 2>&1
# Checks the public API + dashboard. If the local node processes are dead it
# attempts one `pm2 resurrect` self-heal, then alerts Troy by email via the
# same Brevo SMTP credentials the backend already uses (read from its .env —
# no secrets stored in this script). Alerts fire on state change only, with a
# re-alert every 6 hours while still down, and a recovery email when back up.
# Usage: pp-watchdog.sh [--test-email]
set -u

ENV_FILE=/var/www/troyreed1725-backend/.env
STATE=/root/.pp-watchdog-state
TO="troydiartreed@gmail.com"
REALERT_SECS=21600

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"\r' ; }
SMTP_HOST=$(get SMTP_HOST); SMTP_PORT=$(get SMTP_PORT)
SMTP_USER=$(get SMTP_USER); SMTP_PASS=$(get SMTP_PASS)
FROM_RAW=$(get EMAIL_FROM); [ -z "$FROM_RAW" ] && FROM_RAW=$(get EMAIL)
FROM=$(printf '%s' "$FROM_RAW" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -1)
# Port 465 = implicit TLS (smtps), 587 = STARTTLS (smtp + --ssl-reqd)
PROTO="smtp"; [ "${SMTP_PORT:-587}" = "465" ] && PROTO="smtps"

send() { # send <subject> <body>
  printf 'From: Pink Pineapple Watchdog <%s>\r\nTo: %s\r\nSubject: %s\r\n\r\n%s\r\n' \
    "$FROM" "$TO" "$1" "$2" |
  curl -sS --ssl-reqd --mail-from "$FROM" --mail-rcpt "$TO" \
    --user "$SMTP_USER:$SMTP_PASS" -T - "$PROTO://$SMTP_HOST:${SMTP_PORT:-587}" >/dev/null 2>&1
}

if [ "${1:-}" = "--test-email" ]; then
  send "Pink Pineapple watchdog installed" "This is a one-time test. The watchdog now checks api.pinkpineapple.app and dashboard.pinkpineapple.app every 5 minutes from the VPS and will email this address if the app goes down or recovers. $(date -u)"
  exit 0
fi

check() { curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$1" ; }
healthy() { # sets $api/$dash, returns 0 when both look alive
  api=$(check https://api.pinkpineapple.app/api/v1/health)
  dash=$(check https://dashboard.pinkpineapple.app)
  [ "$api" = "200" ] || return 1
  case "$dash" in 2*|3*) return 0 ;; *) return 1 ;; esac
}

l5020="-"; l3000="-"; healed="no"
if ! healthy; then
  l5020=$(check http://127.0.0.1:5020/); l3000=$(check http://127.0.0.1:3000/)
  if [ "$l5020" = "000" ] || [ "$l3000" = "000" ]; then
    pm2 resurrect >/dev/null 2>&1 && healed="attempted"
    sleep 15
  fi
  healthy && healed="recovered-by-resurrect"
fi

now=$(date +%s)
prev=$(cat "$STATE" 2>/dev/null || echo "up")
if healthy; then
  if [ "${prev%%:*}" = "down" ]; then
    send "RESOLVED: Pink Pineapple is back up" "API=$api dashboard=$dash self-heal=$healed. $(date -u)"
  fi
  echo "up" > "$STATE"
else
  last=${prev#down:}; [ "$last" = "$prev" ] && last=0
  if [ "${prev%%:*}" != "down" ] || [ $((now - last)) -gt $REALERT_SECS ]; then
    send "ALERT: Pink Pineapple is DOWN" "Public checks failing: API=$api dashboard=$dash. Local ports: 5020=$l5020 3000=$l3000. Self-heal=$healed. SSH: ssh root@145.79.6.151 then 'pm2 ls'. $(date -u)"
    echo "down:$now" > "$STATE"
  fi
fi
