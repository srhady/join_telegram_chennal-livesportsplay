import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime
import concurrent.futures

BASE_URL = "https://fibwatch.art"
MAX_PAGES_TO_SCAN = 3000  # লেটেস্ট ক্যাটাগরির ৩০০০ পেজ

# আপনার অরিজিনাল লিংক ভাঙার ফাংশন (একদম হুবহু)
def process_movie(base_name, watch_link, quality, scraper, group_name):
    try:
        res = scraper.get(watch_link, timeout=15)
        watch_soup = BeautifulSoup(res.text, 'html.parser')
        
        actual_link = None
        
        for a in watch_soup.find_all('a', href=True):
            href = a['href']
            
            if 'urlshortlink.top' in href and 'url=' in href:
                match = re.search(r'url=(.*)', href)
                if match:
                    decoded = match.group(1).replace('%3A', ':').replace('%2F', '/')
                    if '.mkv' in decoded or '.mp4' in decoded:
                        actual_link = decoded
                        break
            
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
        
        m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="{group_name}", {file_name}\n{actual_link}\n'
        return m3u_entry
        
    except Exception as e:
        return None

# "Latest" পেজ স্ক্যান করার ফাংশন
def scan_single_page_latest(page_num, scraper):
    url = f"{BASE_URL}/videos/latest?page_id={page_num}"
    found_movies = []
    try:
        response = scraper.get(url, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = soup.find_all('a', href=True)
        watch_links = [link['href'] for link in links if '/watch/' in link['href'] and link['href'].endswith('.html')]
        
        if not watch_links:
            return []
            
        for link in set(watch_links):
            full_link = link if link.startswith('http') else f"{BASE_URL}{link}"
            base_name_match = re.search(r'/watch/(.*?)(?:-\d{3,4}p_|_)', full_link)
            base_name = base_name_match.group(1) if base_name_match else full_link.split('/')[-1]
            quality_match = re.search(r'(\d{3,4})p', full_link)
            quality = int(quality_match.group(1)) if quality_match else 0
            
            found_movies.append((base_name, full_link, quality))
        return found_movies
    except Exception:
        return []

def run_latest_scraper(file_name, group_name):
    print(f"\n🚀 Starting ULTRA-FAST Scraper (Double 30 Threads) for {group_name}...")
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})
    
    best_qualities = {}
    best_links = {}
    
    print(f"⏳ Scanning up to {MAX_PAGES_TO_SCAN} pages CONCURRENTLY... Please wait!")
    
    # 💥 স্টেজ ১: পেজ স্ক্যানিংয়ে মাল্টি-থ্রেডিং 💥
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        future_to_page = {executor.submit(scan_single_page_latest, p, scraper): p for p in range(1, MAX_PAGES_TO_SCAN + 1)}
        
        for count, future in enumerate(concurrent.futures.as_completed(future_to_page), 1):
            movies = future.result()
            for base_name, full_link, quality in movies:
                current_best = best_qualities.get(base_name, 0)
                if quality > current_best:
                    best_qualities[base_name] = quality
                    best_links[base_name] = full_link
            
            if count % 100 == 0:
                print(f"   [+] Scanned {count}/{MAX_PAGES_TO_SCAN} pages...")

    print(f"✅ Page scanning complete! Found {len(best_links)} UNIQUE movies.")
    print("🎬 Starting extraction with 30 THREADS...")
    
    results = []
    
    # 💥 স্টেজ ২: মুভি লিংক ভাঙার মাল্টি-থ্রেডিং 💥
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        future_to_movie = {
            executor.submit(process_movie, b_name, w_link, best_qualities[b_name], scraper, group_name): b_name 
            for b_name, w_link in best_links.items()
        }
        
        for future in concurrent.futures.as_completed(future_to_movie):
            b_name = future_to_movie[future]
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"   ⚡ Pure Link Extracted: {b_name[:40]}...")
            except Exception:
                pass

    print(f"\n💾 Writing perfectly clean data to {file_name}...")
    with open(file_name, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by Double-Threaded Automation\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for entry in results:
            f.write(entry)

    print(f"🎉 Done! Pure M3U Playlist generated without shortlinks for {group_name}.")

def main():
    # লেটেস্ট ক্যাটাগরি স্ক্যান করবে
    run_latest_scraper(file_name="latest_movies.m3u", group_name="Fibwatch Latest")

if __name__ == "__main__":
    main()
