import cloudscraper
from bs4 import BeautifulSoup
import re
import os
from datetime import datetime, timedelta
import concurrent.futures
from urllib.parse import urlparse

# --- Configuration ---
BASE_URL = "https://fibwatch.art"
FILE_NAME = "latest_movies.m3u"
GROUP_NAME = "Fibwatch Latest"
IMAGE_PROXY = "https://srhady-live-stream.hf.space/image?url="

def get_resolution(text):
    """Extracts resolution from the link to prioritize higher quality."""
    match = re.search(r'(\d{3,4})p', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    if '4k' in text.lower():
        return 2160
    return 0

def get_domain(url):
    """Extracts the main domain (e.g., https://xyujkk.b-cdn.net) from a full URL."""
    parsed_uri = urlparse(url)
    return '{uri.scheme}://{uri.netloc}'.format(uri=parsed_uri)

def process_movie(base_name, watch_link, scraper):
    """Extracts the raw video link and poster for a single movie."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        res = scraper.get(watch_link, headers=headers, timeout=15)
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
        if poster:
            poster = f"{IMAGE_PROXY}{poster}"
        
        file_name = actual_link.split('/')[-1]
        file_name = re.sub(r'\[Fibwatch\.Com\]|\.mkv|\.mp4', '', file_name, flags=re.IGNORECASE).replace('.', ' ').strip()
        final_video_link = f"{actual_link}|Referer={BASE_URL}/"
        
        m3u_entry = f'#EXTINF:-1 tvg-logo="{poster}" group-title="{GROUP_NAME}", {file_name}\n{final_video_link}\n'
        return m3u_entry, get_domain(actual_link)
        
    except Exception as e:
        return None

def main():
    print("🚀 Starting Smart Homepage Scraper...")
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'ios', 'mobile': True})
    
    # 1. Read existing playlist data
    old_entries = []
    old_domain = None
    if os.path.exists(FILE_NAME):
        with open(FILE_NAME, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            # Filter out the old header lines
            old_entries = [line for line in lines if not line.startswith('#EXTM3U') and not line.startswith('# Playlist') and not line.startswith('# Last')]
            
            # Identify the old CDN domain from the existing entries
            for line in old_entries:
                if '.mkv' in line or '.mp4' in line:
                    old_domain = get_domain(line.split('|')[0])
                    break
        print(f"📁 Loaded existing playlist. Old CDN Domain: {old_domain}")

    # 2. Scan only the Homepage (Base URL)
    print("⏳ Scanning homepage (Base URL)...")
    new_movies_links = {}
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        response = scraper.get(BASE_URL, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        watch_links = [link['href'] for link in soup.find_all('a', href=True) if '/watch/' in link['href'] and link['href'].endswith('.html')]
        
        for link in set(watch_links):
            full_link = link if link.startswith('http') else f"{BASE_URL}{link}"
            filename = full_link.split('/')[-1]
            base_name = re.sub(r'[-_]?\d{3,4}p.*\.html$', '', filename, flags=re.IGNORECASE)
            
            current_res = get_resolution(full_link)
            if base_name in new_movies_links:
                existing_link = new_movies_links[base_name]
                if current_res > get_resolution(existing_link):
                    new_movies_links[base_name] = full_link
            else:
                new_movies_links[base_name] = full_link
        print(f"📄 Found {len(new_movies_links)} unique titles on homepage.")
    except Exception as e:
        print(f"⚠️ Homepage scan error: {e}")

    # 3. Extract new movies and identify the current active CDN domain
    print("🎬 Extracting new items...")
    new_entries = []
    new_domain = None
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(process_movie, b_name, w_link, scraper) for b_name, w_link in new_movies_links.items()]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                entry, domain = result
                # Check if the entry already exists in the old file to avoid duplicates
                if not any(entry.split('\n')[0] in old_line for old_line in old_entries):
                    new_entries.append(entry)
                    if not new_domain:
                        new_domain = domain
                        print(f"🌐 Discovered New/Current CDN Domain: {new_domain}")

    # 4. Replace old domain with the new domain in existing links (if changed)
    if old_domain and new_domain and old_domain != new_domain:
        print(f"🔄 Updating old links from {old_domain} to {new_domain}...")
        old_entries_text = "".join(old_entries)
        old_entries_text = old_entries_text.replace(old_domain, new_domain)
        old_entries = [old_entries_text]

    # 5. Save the updated file with the clean header
    print(f"💾 Saving {len(new_entries)} new movies and updating {FILE_NAME}...")
    bd_time = datetime.utcnow() + timedelta(hours=6)
    now = bd_time.strftime("%Y-%m-%d %I:%M:%S %p (BD Time)")
    
    with open(FILE_NAME, "w", encoding="utf-8") as f:
        f.write('#EXTM3U\n') 
        f.write('# Playlist Generated Automatically by Smart Incremental Automation\n')
        f.write(f'# Last Updated: {now}\n\n')
        
        # Append new movies first
        for entry in new_entries:
            f.write(entry)
            
        # Append updated old movies
        f.write("".join(old_entries))

    print("🎉 All done! Playlist updated successfully.")

if __name__ == "__main__":
    main()
