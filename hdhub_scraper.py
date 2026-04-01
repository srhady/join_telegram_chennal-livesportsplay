from curl_cffi import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import concurrent.futures

BASE_URL = "https://new5.hdhub4u.fo"
START_CATEGORY_URL = f"{BASE_URL}/category/south-hindi-movies/page/"
PLAYLIST_FILE = "hdhub_playlist.m3u"

def unpack(p, a, c, k):
    def baseN(num, b):
        chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        if num == 0: return "0"
        res = ""
        while num > 0:
            res = chars[num % b] + res
            num //= b
        return res

    for i in range(c - 1, -1, -1):
        if k[i]:
            word = baseN(i, a)
            p = re.sub(r'\b' + word + r'\b', k[i], p)
    return p

def process_movie(movie_data):
    title, url, poster = movie_data
    try:
        # curl_cffi দিয়ে রিয়েল ক্রোমের ভান করে ঢোকা
        session = requests.Session(impersonate="chrome110", timeout=15)
        res = session.get(url)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        content = soup.find('div', class_='entry-content') or soup
        links = content.find_all('a', href=True)
        
        watch_link = None
        for a in links:
            href = a['href']
            text = a.get_text(strip=True).lower()
            if re.search(r'(watch|play|stream|online|player)', text) or re.search(r'(watch|play|stream|online|player)', href):
                if href != "#":
                    watch_link = href
                    break
        
        if not watch_link:
            return None
            
        watch_res = session.get(watch_link)
        html = watch_res.text
        
        match = re.search(r"return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('\|'\)", html, re.DOTALL)
        
        if match:
            p = match.group(1).replace("\\'", "'").replace("\\\\", "\\")
            a = int(match.group(2))
            c = int(match.group(3))
            k = match.group(4).split('|')

            unpacked = unpack(p, a, c, k)
            
            video_links = re.findall(r'https?://[^\s\'"<>\,\[\]\(\)]+?\.(?:m3u8|mp4)[^\s\'"<>\,\[\]\(\)]*', unpacked)
            sub_links = re.findall(r'https?://[^\s\'"<>\,\[\]\(\)]+?\.(?:vtt|srt)[^\s\'"<>\,\[\]\(\)]*', unpacked)
            
            if video_links:
                stream_url = video_links[0]
                sub_url = sub_links[0] if sub_links else None
                
                m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="South Hindi Dubbed", {title}\n'
                if sub_url:
                    m3u_entry += f'#EXTVLCOPT:sub-file="{sub_url}"\n'
                m3u_entry += f'{stream_url}\n'
                
                return m3u_entry
        return None
        
    except Exception:
        return None

def main():
    print("🚀 Starting Next-Gen M3U Scraper (Bypassing Cloudflare with curl_cffi)...")
    
    # Session তৈরি করা
    session = requests.Session(impersonate="chrome110", timeout=15)
    
    all_movies = []
    page = 1
    
    while True:
        print(f"⏳ Scanning Page {page}...")
        try:
            res = session.get(f"{START_CATEGORY_URL}{page}/")
            soup = BeautifulSoup(res.text, 'html.parser')
            
            movies = soup.find_all('li', class_='thumb')
            if not movies:
                print(f"✅ Reached the end. Total pages scanned: {page - 1}")
                break
                
            for movie in movies:
                title = movie.find('p').text.strip() if movie.find('p') else "Unknown Title"
                a_tag = movie.find('a')
                img_tag = movie.find('img')
                
                if a_tag and img_tag:
                    link = a_tag['href']
                    if link.startswith('/'):
                        link = f"{BASE_URL}{link}"
                    poster = img_tag.get('src', '')
                    all_movies.append((title, link, poster))
            
            # প্রথম ২ পেজ স্ক্যান করেই টেস্ট করুন (প্রয়োজনে এটি মুছে দেবেন সব পেজ স্ক্যান করতে)
            if page >= 2: 
                break
                
            page += 1
        except Exception as e:
            print(f"⚠️ Error scanning page {page}: {e}")
            break

    print(f"\n🎬 Found {len(all_movies)} movies. Starting Vault Cracking with 30 THREADS...")
    
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        future_to_movie = {executor.submit(process_movie, movie): movie for movie in all_movies}
        
        for future in concurrent.futures.as_completed(future_to_movie):
            movie = future_to_movie[future]
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"   ⚡ Success: {movie[0]}")
                else:
                    print(f"   ⚠️ Skipped: {movie[0]}")
            except Exception:
                pass

    print("\n💾 Generating hdhub_playlist.m3u...")
    with open(PLAYLIST_FILE, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by HDHub4u Scraper\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for entry in results:
            f.write(entry)

    print("🎉 Done! Pure M3U Playlist generated successfully with Subtitles!")

if __name__ == "__main__":
    main()
