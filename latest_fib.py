import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime
import concurrent.futures
import requests

BASE_URL = "https://fibwatch.art"
MAX_PAGES_TO_SCAN = 3000  # আপনার টার্গেট ৩০০০ পেজ

def process_movie(base_name, watch_link, quality, scraper, group_name):
    try:
        res = scraper.get(watch_link, timeout=10)
        watch_soup = BeautifulSoup(res.text, 'html.parser')
        
        actual_link = None
        
        for a in watch_soup.find_all('a', href=True):
            href = a['href']
            
            # শর্টলিংক বাইপাস লজিক
            if 'urlshortlink.top' in href and 'url=' in href:
                match = re.search(r'url=(.*)', href)
                if match:
                    decoded = match.group(1).replace('%3A', ':').replace('%2F', '/')
                    if '.mkv' in decoded or '.mp4' in decoded:
                        actual_link = decoded
                        break
            
            # ডিরেক্ট লিংক লজিক
            elif ('.mkv' in href or '.mp4' in href) and 'urlshortlink.top' not in href:
                actual_link = href
                if actual_link.startswith('/'):
                    actual_link = f"{BASE_URL}{actual_link}"
                break
        
        if not actual_link:
            return None
            
        poster_tag = watch_soup.find('meta', property='og:image')
        poster = poster_tag['content'] if poster_tag else ""
        
        # ফাইলের নাম সুন্দর করা
        file_name = actual_link.split('/')[-1]
        file_name = re.sub(r'\[Fibwatch\.Com\]', '', file_name, flags=re.IGNORECASE)
        file_name = re.sub(r'\.mkv|\.mp4', '', file_name, flags=re.IGNORECASE)
        file_name = file_name.replace('.', ' ').strip()
        
        m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="{group_name}", {file_name}\n{actual_link}\n'
        return m3u_entry
        
    except Exception:
        return None

def scan_single_page_latest(page_num, scraper):
    url = f"{BASE_URL}/videos/latest?page_id={page_num}"
    found_movies = []
    try:
        response = scraper.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = soup.find_all('a', href=True)
        watch_links = [link['href'] for link in links if '/watch/' in link['href'] and link['href'].endswith('.html')]
        
        if not watch_links:
            return []
            
        for link in set(watch_links):
            full_link = link if link.startswith('http') else f"{BASE_URL}{link}"
            
            # বেস নাম এবং কোয়ালিটি বের করা
            base_name_match = re.search(r'/watch/(.*?)(?:-\d{3,4}p_|_)', full_link)
            base_name = base_name_match.group(1) if base_name_match else full_link.split('/')[-1]
            quality_match = re.search(r'(\d{3,4})p', full_link)
            quality = int(quality_match.group(1)) if quality_match else 0
            
            found_movies.append((base_name, full_link, quality))
        return found_movies
    except Exception:
        return []

def run_latest_scraper():
    file_name = "latest_movies.m3u"
    group_name = "Fibwatch Latest"
    
    print(f"\n🚀 Starting Fast Scraper for 'Latest' category (Up to {MAX_PAGES_TO_SCAN} pages)...")
    
    # Cloudscraper তৈরি এবং Connection Pool বাড়ানো (গিটহাবের জন্য সেফ)
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})
    adapter = requests.adapters.HTTPAdapter(pool_connections=150, pool_maxsize=150, max_retries=1)
    scraper.mount('http://', adapter)
    scraper.mount('https://', adapter)
    
    best_qualities = {}
    best_links = {}
    
    print("💥 STAGE 1: Scanning pages with 100 THREADS! 💥")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        future_to_page = {executor.submit(scan_single_page_latest, p, scraper): p for p in range(1, MAX_PAGES_TO_SCAN + 1)}
        
        for count, future in enumerate(concurrent.futures.as_completed(future_to_page), 1):
            movies = future.result()
            for base_name, full_link, quality in movies:
                current_best = best_qualities.get(base_name, 0)
                if quality > current_best:
                    best_qualities[base_name] = quality
                    best_links[base_name] = full_link
            
            # প্রোগ্রেস ট্র্যাকিং
            if count % 100 == 0:
                print(f"   [+] Scanned {count}/{MAX_PAGES_TO_SCAN} pages...")

    print(f"\n✅ Scan complete! Found {len(best_links)} UNIQUE movies.")
    print("💥 STAGE 2: Extracting M3U8/MP4 links with 50 THREADS! 💥")
    
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        future_to_movie = {
            executor.submit(process_movie, b_name, w_link, best_qualities[b_name], scraper, group_name): b_name 
            for b_name, w_link in best_links.items()
        }
        
        for count, future in enumerate(concurrent.futures.as_completed(future_to_movie), 1):
            try:
                data = future.result()
                if data:
                    results.append(data)
                    if count % 50 == 0:
                        print(f"   [⚡] Extracted {count}/{len(best_links)} links...")
            except Exception:
                pass

    print(f"\n💾 Writing playlist to {file_name}...")
    with open(file_name, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by Auto-Scraper\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for entry in results:
            f.write(entry)

    print(f"🎉 Done! Extraction finished! {len(results)} movies saved to {file_name}.")

if __name__ == "__main__":
    run_latest_scraper()
