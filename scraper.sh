import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime

PLAYLIST_FILE = "playlist.m3u"
BASE_URL = "https://fibwatch.art"

def main():
    print("🚀 Starting Cloudflare-Bypass Scraper...")
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
        except Exception as e:
            print(f"❌ Error fetching page {page}: {e}")
            break
            
        links = soup.find_all('a', href=True)
        watch_links = [link['href'] for link in links if '/watch/' in link['href'] and link['href'].endswith('.html')]
        
        if not watch_links:
            print(f"✅ Reached the end. No more movies on page {page}.")
            break
            
        for link in set(watch_links):
            full_link = link if link.startswith('http') else f"{BASE_URL}{link}"
            
            # বেস নাম ও কোয়ালিটি বের করা
            base_name_match = re.search(r'/watch/(.*?)(?:-\d{3,4}p_|_)', full_link)
            base_name = base_name_match.group(1) if base_name_match else full_link.split('/')[-1]
            
            quality_match = re.search(r'(\d{3,4})p', full_link)
            quality = int(quality_match.group(1)) if quality_match else 0
            
            current_best = best_qualities.get(base_name, 0)
            
            # বেস্ট কোয়ালিটি বাছাই (1080p > 720p)
            if quality > current_best:
                best_qualities[base_name] = quality
                best_links[base_name] = full_link
                
        page += 1

    print(f"🎬 Found {len(best_links)} UNIQUE movies. Extracting media links...")
    
    with open(PLAYLIST_FILE, "w", encoding="utf-8") as f:
        f.write('#EXTM3U x-tvg-url=""\n')
        f.write('# Playlist Generated Automatically by Livesportsplay Automation\n')
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f'# Last Updated: {now}\n\n')
        
        for base_name, watch_link in best_links.items():
            print(f"➡️ Processing: {base_name} ({best_qualities[base_name]}p)")
            try:
                res = scraper.get(watch_link, timeout=15)
                watch_soup = BeautifulSoup(res.text, 'html.parser')
                
                # ডিরেক্ট লিংক বা শর্টলিংক খোঁজা
                raw_link = None
                for a in watch_soup.find_all('a', href=True):
                    href = a['href']
                    if '.mkv' in href or '.mp4' in href or 'urlshortlink.top' in href:
                        raw_link = href
                        break
                
                if not raw_link:
                    continue
                    
                # শর্টলিংক ডিকোড করা
                if "urlshortlink.top" in raw_link:
                    match = re.search(r'url=(.*)', raw_link)
                    if match:
                        actual_link = match.group(1).replace('%3A', ':').replace('%2F', '/')
                    else:
                        continue
                else:
                    actual_link = raw_link
                    
                # পোস্টার বের করা
                poster_tag = watch_soup.find('meta', property='og:image')
                poster = poster_tag['content'] if poster_tag else ""
                
                # ফাইলের নাম পরিষ্কার করা
                file_name = actual_link.split('/')[-1]
                file_name = re.sub(r'\[Fibwatch\.Com\]', '', file_name, flags=re.IGNORECASE)
                file_name = re.sub(r'\.mkv|\.mp4', '', file_name, flags=re.IGNORECASE)
                file_name = file_name.replace('.', ' ').strip()
                
                # প্লেলিস্টে লেখা
                f.write(f'#EXTINF:-1 tvg-logo="{poster}" group-title="Bengali Dubbed", {file_name}\n')
                f.write(f'{actual_link}\n')
                
            except Exception as e:
                print(f"Error processing {base_name}: {e}")

    print("🎉 Success! M3U Playlist perfectly generated.")

if __name__ == "__main__":
    main()
