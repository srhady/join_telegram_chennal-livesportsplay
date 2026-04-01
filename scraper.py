import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime
import concurrent.futures

PLAYLIST_FILE = "playlist.m3u"
BASE_URL = "https://fibwatch.art"

def process_movie(base_name, watch_link, quality, scraper):
    try:
        res = scraper.get(watch_link, timeout=15)
        watch_soup = BeautifulSoup(res.text, 'html.parser')
        
        actual_link = None
        
        # লিংকের ভেতর কড়া ছাঁকনি!
        for a in watch_soup.find_all('a', href=True):
            href = a['href']
            
            # সরাসরি .mkv বা .mp4 লিংক হলে
            if '.mkv' in href or '.mp4' in href:
                actual_link = href
                if actual_link.startswith('/'):
                    actual_link = f"{BASE_URL}{actual_link}"
                break
                
            # শর্টলিংক হলে ডিকোড করে চেক করবে ভেতরে .mkv/.mp4 আছে কিনা!
            if 'urlshortlink.top' in href:
                match = re.search(r'url=(.*)', href)
                if match:
                    decoded = match.group(1).replace('%3A', ':').replace('%2F', '/')
                    # যদি শর্টলিংকের ভেতর .html থাকে (ফেক লিংক), তাহলে ইগনোর করবে!
                    if '.mkv' in decoded or '.mp4' in decoded:
                        actual_link = decoded
                        break
        
        # যদি কোনো আসল ভিডিও লিংক না পায়, তবে বাতিল!
        if not actual_link:
            return None
            
        # পোস্টার বের করা
        poster_tag = watch_soup.find('meta', property='og:image')
        poster = poster_tag['content'] if poster_tag else ""
        
        # নামটাকে সুন্দর করে সাজানো
        file_name = actual_link.split('/')[-1]
        file_name = re.sub(r'\[Fibwatch\.Com\]', '', file_name, flags=re.IGNORECASE)
        file_name = re.sub(r'\.mkv|\.mp4', '', file_name, flags=re.IGNORECASE)
        file_name = file_name.replace('.', ' ').strip()
        
        # নিখুঁত M3U ফরম্যাট
        m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="Bengali Dubbed", {file_name}\n{actual_link}\n'
        return m3u_entry
        
    except Exception as e:
        return None

def main():
    print("🚀 Starting BULLETPROOF & FAST Scraper...")
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})
    
    best_qualities = {}
    best_links = {}
    
    page = 1
    while True:
        print(f"⏳ Scanning Page {page}...")
        url = f"{BASE_URL}/videos/category/852?page_id={page}"
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
            
            # 1080p ফিল্টার 
            if quality > current_best:
                best_qualities[base_name] = quality
                best_links[base_name] = full_link
                
        page += 1

    print(f"\n🎬 Found {len(best_links)} UNIQUE movies. Extracting real .mkv/.mp4 links using 15 Threads...")
    
    results = []
    
    # ১৫টা থ্রেড দিয়ে একসাথে কাজ করানো হচ্ছে
    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        future_to_movie = {
            executor.submit(process_movie, b_name, w_link, best_qualities[b_name], scraper): b_name 
            for b_name, w_link in best_links.items()
        }
        
        for future in concurrent.futures.as_completed(future_to_movie):
            b_name = future_to_movie[future]
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"   ⚡ Extracted Real Link: {b_name}")
                else:
                    print(f"   ⚠️ Skipped (No valid .mkv/.mp4 found): {b_name}")
            except Exception:
                pass

    print("\n💾 Writing pure data to playlist.m3u...")
    with open(PLAYLIST_FILE, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by Livesportsplay Automation\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for entry in results:
            f.write(entry)

    print("🎉 Boom! Pure and perfect M3U Playlist generated.")

if __name__ == "__main__":
    main()
