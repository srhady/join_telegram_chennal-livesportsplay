import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime
import concurrent.futures

BASE_URL = "https://fibwatch.art"

def process_movie(base_name, watch_link, quality, scraper, group_title):
    try:
        res = scraper.get(watch_link, timeout=15)
        watch_soup = BeautifulSoup(res.text, 'html.parser')
        
        actual_link = None
        
        for a in watch_soup.find_all('a', href=True):
            href = a['href']
            
            # ১. আগে চেক করবে এটা শর্টলিংক কি না!
            if 'urlshortlink.top' in href and 'url=' in href:
                match = re.search(r'url=(.*)', href)
                if match:
                    # হাবিজাবি অংশ কেটে শুধু মেইন লিংকটা বের করা
                    decoded = match.group(1).replace('%3A', ':').replace('%2F', '/')
                    if '.mkv' in decoded or '.mp4' in decoded:
                        actual_link = decoded
                        break
            
            # ২. যদি শর্টলিংক না হয়ে সরাসরি ডাইরেক্ট লিংক হয়
            elif ('.mkv' in href or '.mp4' in href) and 'urlshortlink.top' not in href:
                actual_link = href
                if actual_link.startswith('/'):
                    actual_link = f"{BASE_URL}{actual_link}"
                break
        
        if not actual_link:
            return None
            
        poster_tag = watch_soup.find('meta', property='og:image')
        poster = poster_tag['content'] if poster_tag else ""
        
        file_name = actual_link.split('/')[-1]
        file_name = re.sub(r'\[Fibwatch\.Com\]', '', file_name, flags=re.IGNORECASE)
        file_name = re.sub(r'\.mkv|\.mp4', '', file_name, flags=re.IGNORECASE)
        file_name = file_name.replace('.', ' ').strip()
        
        # শুধু group-title টা ডায়নামিক করা হয়েছে
        m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="{group_title}", {file_name}\n{actual_link}\n'
        return m3u_entry
        
    except Exception as e:
        return None

def run_scraper(cat_id, playlist_file, group_title):
    print(f"🚀 Starting SUPER FAST & BULLETPROOF Scraper (30 Threads) for {group_title}...")
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})
    
    best_qualities = {}
    best_links = {}
    
    page = 1
    while True:
        print(f"⏳ Scanning Page {page}...")
        url = f"{BASE_URL}/videos/category/{cat_id}?page_id={page}"
        try:
            response = scraper.get(url, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
        except Exception:
            break
            
        links = soup.find_all('a', href=True)
        watch_links = [link['href'] for link in links if '/watch/' in link['href'] and link['href'].endswith('.html')]
        
        if not watch_links:
            print(f"✅ Reached the end. No more movies on page {page}.")
            break
            
        for link in set(watch_links):
            full_link = link if link.startswith('http') else f"{BASE_URL}{link}"
            
            base_name_match = re.search(r'/watch/(.*?)(?:-\d{3,4}p_|_)', full_link)
            base_name = base_name_match.group(1) if base_name_match else full_link.split('/')[-1]
            
            quality_match = re.search(r'(\d{3,4})p', full_link)
            quality = int(quality_match.group(1)) if quality_match else 0
            
            current_best = best_qualities.get(base_name, 0)
            
            if quality > current_best:
                best_qualities[base_name] = quality
                best_links[base_name] = full_link
                
        page += 1

    print(f"\n🎬 Found {len(best_links)} UNIQUE movies. Starting extraction with 30 THREADS...")
    
    results = []
    
    # আপনার নির্দেশ মতো ৩০টা থ্রেড! রকেটের বেগে ডেটা আনবে!
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        future_to_movie = {
            executor.submit(process_movie, b_name, w_link, best_qualities[b_name], scraper, group_title): b_name 
            for b_name, w_link in best_links.items()
        }
        
        for future in concurrent.futures.as_completed(future_to_movie):
            b_name = future_to_movie[future]
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"   ⚡ Pure Link Extracted: {b_name}")
                else:
                    print(f"   ⚠️ Skipped (No valid link): {b_name}")
            except Exception:
                pass

    print(f"\n💾 Writing perfectly clean data to {playlist_file}...")
    with open(playlist_file, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by Livesportsplay Automation\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for entry in results:
            f.write(entry)

    print(f"🎉 Done! Pure M3U Playlist generated without shortlinks for {group_title}.\n")

def main():
    # প্রথম রাউন্ড: আপনার আগের ক্যাটাগরি (852)
    run_scraper(cat_id="852", playlist_file="playlist.m3u", group_title="Bengali Dubbed")
    
    # দ্বিতীয় রাউন্ড: নতুন ক্যাটাগরি (1)
    run_scraper(cat_id="1", playlist_file="bangla.m3u", group_title="Bangla Movie")

if __name__ == "__main__":
    main()
