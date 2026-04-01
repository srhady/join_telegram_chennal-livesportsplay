#!/bin/bash

PLAYLIST="playlist.m3u"

# প্লেলিস্টের একদম শুরুতে প্রয়োজনীয় ইনফো এবং হেডার বসানো
echo "#EXTM3U x-tvg-url=\"\"" > $PLAYLIST
echo "# Playlist Generated Automatically by Livesportsplay Automation" >> $PLAYLIST
echo "# Last Updated: $(date '+%Y-%m-%d %H:%M:%S')" >> $PLAYLIST
echo "" >> $PLAYLIST

# ডুপ্লিকেট রিমুভ এবং বেস্ট কোয়ালিটি বাছাই করার জন্য ডিকশনারি
declare -A BEST_LINKS
declare -A BEST_QUALITIES

PAGE=1
echo "🔍 Scanning all pages to find the best quality movies..."

while true; do
  echo "⏳ Scanning Page $PAGE..."
  HTML=$(curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://fibwatch.art/videos/category/852?page_id=$PAGE")
  
  # পেজ থেকে সব watch লিংক বের করা
  LINKS=$(echo "$HTML" | grep -o 'href="[^"]*"' | grep '/watch/' | grep '\.html"' | cut -d'"' -f2 | sort -u)

  if [ -z "$LINKS" ]; then
    echo "✅ Reached the end. No more movies found on page $PAGE."
    break
  fi

  for LINK in $LINKS; do
    # মুভির বেস নাম বের করা (যাতে ডুপ্লিকেট ধরা যায়)
    BASE_NAME=$(echo "$LINK" | sed -E 's/-[0-9]{3,4}p_.*//' | sed -E 's/.*\/watch\///')
    
    # রেজল্যুশন বের করা (যেমন: 1080, 720, 480)
    QUALITY=$(echo "$LINK" | grep -oE '[0-9]{3,4}p' | head -n 1 | sed 's/p//')
    if [ -z "$QUALITY" ]; then QUALITY=0; fi

    CURRENT_BEST=${BEST_QUALITIES[$BASE_NAME]:-0}

    # যদি নতুন লিংকটার কোয়ালিটি আগেরটার চেয়ে ভালো হয়, তবে সেটা সেভ করবে (1080p > 720p)
    if [ "$QUALITY" -gt "$CURRENT_BEST" ]; then
      BEST_QUALITIES[$BASE_NAME]=$QUALITY
      if [[ "$LINK" == /* ]]; then
        BEST_LINKS[$BASE_NAME]="https://fibwatch.art$LINK"
      else
        BEST_LINKS[$BASE_NAME]="$LINK"
      fi
    fi
  done
  
  PAGE=$((PAGE + 1))
  sleep 1
done

echo "🎬 Found ${#BEST_LINKS[@]} UNIQUE movies. Extracting exact media links..."

for BASE_NAME in "${!BEST_LINKS[@]}"; do
  WATCH_LINK="${BEST_LINKS[$BASE_NAME]}"
  echo "➡️ Processing: $BASE_NAME (${BEST_QUALITIES[$BASE_NAME]}p)"

  WATCH_HTML=$(curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "$WATCH_LINK")
  
  # ডিরেক্ট .mkv/.mp4 বা urlshortlink বের করা
  RAW_LINK=$(echo "$WATCH_HTML" | grep -o -iE 'href="[^"]*"' | cut -d'"' -f2 | grep -iE '\.mkv|\.mp4|urlshortlink\.top.*url=' | head -n 1)

  # শর্টলিংক ডিকোড করা
  if [[ "$RAW_LINK" == *"urlshortlink.top"* ]]; then
    ACTUAL_LINK=$(echo "$RAW_LINK" | sed 's/.*url=//' | sed 's/%3A/:/g' | sed 's/%2F/\//g')
  else
    ACTUAL_LINK="$RAW_LINK"
  fi
  
  if [ -z "$ACTUAL_LINK" ]; then continue; fi

  # পোস্টার ইমেজ বের করা
  POSTER=$(echo "$WATCH_HTML" | grep -o 'property="og:image"[^>]*content="[^"]*"' | grep -o 'content="[^"]*"' | cut -d'"' -f2 | head -n 1)
  
  # মুভির নাম পরিষ্কার করা
  FILE_NAME=$(basename "$ACTUAL_LINK" | sed -E 's/\[Fibwatch\.Com\]//gi' | sed -E 's/\.mkv|\.mp4//gi' | tr '.' ' ')

  # প্লেলিস্টে ফরম্যাট অনুযায়ী বসানো
  echo "#EXTINF:-1 tvg-logo=\"$POSTER\" group-title=\"Bengali Dubbed\", $FILE_NAME" >> $PLAYLIST
  echo "$ACTUAL_LINK" >> $PLAYLIST
  
  sleep 1
done

echo "🎉 Success! M3U Playlist perfectly generated."
