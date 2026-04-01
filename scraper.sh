#!/bin/bash

OUTPUT_FILE="bongo_free_data.json"
echo "[" > $OUTPUT_FILE

OFFSET=0
LIMIT=100
FIRST_ITEM=true

# আপনার দেওয়া টোকেন
AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJDVUtWUkdUMFp3VEp3VEFfMDVPVXBwV1NwTzN6bzE5aUphVHJwdk9MTkpjIn0.eyJleHAiOjE3NzUwMTI2NzIsImlhdCI6MTc3NTAwOTA3MiwianRpIjoib25ydGNjOjVhMmExYTQwLWI5NDQtMzA5ZC05NzdkLWE3YzExZWY4MDhlMiIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuYm9uZ29iZC5jb20vcmVhbG1zL2JvbmdvIiwic3ViIjoiYzY0ZTA3MjgtNjNjMy00OGFkLWIxOTAtZjM0MzhkOTVjYzI0IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYW5vbnltb3VzIiwic2lkIjoiNTI2ZDg2ZWItYTE5NC00OTUyLWI2OGYtYTI3ZDAyYmQ5YzVlIiwic2NvcGUiOiIiLCJjb3VudHJ5X2NvZGUiOiIiLCJ1c2VyX3R5cGUiOiJhbm9ueW1vdXMiLCJjbGllbnRIb3N0IjoiMTAzLjE3NC4xOTIuNTciLCJwbGF0Zm9ybV9pZCI6ImFiZmVhNDYyLWY2NGQtNDkxZS05Y2Q5LTc1ZWUwMDFmNDViMCIsImJvbmdvX2lkIjoiMjM4ZTdlNjMtN2UwNS00OGM0LThjM2YtMWE5NmM5ZmUzMzgyIiwiY2xpZW50QWRkcmVzcyI6IjEwMy4xNzQuMTkyLjU3IiwiY2xpZW50X2lkIjoiYW5vbnltb3VzIiwidXNlcm5hbWUiOiJhbm9ueW1vdXMifQ.fZAsFWOC7vft_nliYuZqkoqcBp-cyRks2Yahk3FrndrC2XXO0w5Hj1zCT-6jcgHRIUzbv_LnqK-dq_weaBxskSKSkr5nfrl_Mw9nLWH9TmK8YDSZ3hQBsZuao8gwqNowwZRjL0FCHFOnzhXZgO1Yie7ecXTGFxM-lsWjsX1mncPWBhHI7EZL27Pn8V6zgPraRanW1FCLqUHIZ2AfojZakKKtBTYwf0NIIzrfV37w4O1RWpBvuuBqpVJlX40Hq_9hMnSAydxtWXweUwXpj_mmlxD5tGPUHRQJgmmWW_YiMp5R5nFIw1ngMAppqs_zSqFwiRI0gaz6IWZJI5Y7y0DAy2zcG_QtOr3xxCSanV9Tx1P8f_g7jWD__wsEY76Yk4sF6Iux3fRPVenWf0AfbtYwUhg_xZxvAbIDNXqB6hHknoHHSBCV_5mHO0DtXZKTP_AHu8si-hJkr8zxwt3r-CfEj2I_S7PiKZ3knqmas-zblWYMwIJc7ppmDna0K_hxFYpmRPWHtzclH7aPFPcTplXQqzY7kteKRngHypdU0svsRoGVcihTF-PtXr7Boom6XUj3kdEsN97Ymo4_nkQjBOZAHp7Z4xU8A7agCquoVu3O8UaTOLnAq0XT_mk-CiAYSNrRtBgPzSQviYsQsWtNRxjJ2R9U4k8qP8cbiFZicgbOFOk"

echo "🚀 Starting GitHub Actions Scraper..."

while true; do
  echo "⏳ Fetching video list at offset $OFFSET..."
  
  API_RESPONSE=$(curl -s -L -X GET "https://api.bongo-solutions.com/ironman/api/v2/widget/watch-free?limit=$LIMIT&offset=$OFFSET" \
    -H "authorization: Bearer $AUTH_TOKEN" \
    -H "country-code: QkQ%3D" \
    -H "platform-id: abfea462-f64d-491e-9cd9-75ee001f45b0")
    
  ERROR_CHECK=$(echo "$API_RESPONSE" | jq -r '.detail // empty')
  if [ -n "$ERROR_CHECK" ]; then
    echo "🚨 API ERROR: $ERROR_CHECK"
    break
  fi

  IDS=$(echo "$API_RESPONSE" | jq -r '.items[]? | .firstEpisode // .id')

  if [ -z "$IDS" ]; then
    echo "✅ No more videos found. Ending loop."
    break
  fi

  for id in $IDS; do
    echo "➡️ Extracting details for ID: $id"
    DETAIL=$(curl -s -L -X GET "https://api.bongo-solutions.com/ironman/api/v1/content/detail/$id" \
      -H "authorization: Bearer $AUTH_TOKEN" \
      -H "country-code: QkQ%3D" \
      -H "platform-id: abfea462-f64d-491e-9cd9-75ee001f45b0")

    if [ "$FIRST_ITEM" = true ]; then
      FIRST_ITEM=false
    else
      echo "," >> $OUTPUT_FILE
    fi
    
    echo "$DETAIL" >> $OUTPUT_FILE
    sleep 1
  done

  OFFSET=$((OFFSET + LIMIT))
done

echo "]" >> $OUTPUT_FILE
echo "🎉 Success! All data perfectly saved in $OUTPUT_FILE"
