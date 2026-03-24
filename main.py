from playwright.sync_api import sync_playwright
from playwright_stealth import stealth  # <--- ইমপোর্ট আপডেট করা হয়েছে

def get_telegram_link_only():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, 
            args=[
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-blink-features=AutomationControlled'
            ]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        # স্ক্রিপ্টকে মানুষের মতো প্রমাণ করতে স্টিলথ মোড অন
        stealth(page) # <--- আপডেট করা হয়েছে

        try:
            print("১. সাইটে প্রবেশ করছি...")
            page.goto("https://new5.hdhub4u.fo/", timeout=60000)
            
            print(f"-> বর্তমান পেজের টাইটেল: {page.title()}")
            
            # ক্লাউডফ্লেয়ারের ক্যাপচা বা চেকিং পার হওয়ার জন্য সময় দেওয়া হলো
            print("-> ক্লাউডফ্লেয়ার চেকিংয়ের জন্য ৮ সেকেন্ড অপেক্ষা করছি...")
            page.wait_for_timeout(8000)
            print(f"-> ৮ সেকেন্ড পর পেজের টাইটেল: {page.title()}")

            print("২. লেটেস্ট মুভি খুঁজছি...")
            first_movie_selector = 'ul.recent-movies li.thumb figure a'  
            page.wait_for_selector(first_movie_selector, timeout=15000)
            
            with context.expect_page() as movie_page_info:
                page.locator(first_movie_selector).first.click()
            movie_page = movie_page_info.value
            movie_page.wait_for_load_state()

            print("৩. 720p HEVC লিংকে ক্লিক করছি...")
            hevc_selector = 'text="720p HEVC"'
            movie_page.wait_for_selector(hevc_selector, timeout=15000)
            
            with context.expect_page() as hubcloud_page_info:
                movie_page.click(hevc_selector)
            hubcloud_page = hubcloud_page_info.value
            hubcloud_page.wait_for_load_state()

            print("৪. HubCloud এবং ভেরিফিকেশন পার করছি...")
            hubcloud_page.wait_for_selector('text="Generate Direct Download Link"', timeout=15000)
            hubcloud_page.click('text="Generate Direct Download Link"')

            hubcloud_page.wait_for_selector('text="Click to verify"', timeout=20000)
            hubcloud_page.click('text="Click to verify"')

            print("টাইমারের জন্য অপেক্ষা করছি...")
            hubcloud_page.wait_for_timeout(6000)

            hubcloud_page.wait_for_selector('text="Continue"', timeout=15000)
            hubcloud_page.click('text="Continue"')

            print("৫. টেলিগ্রাম লিংকের জন্য অপেক্ষা করছি...")
            hubcloud_page.wait_for_url('**/*t.me*', timeout=30000)
            tg_link = hubcloud_page.url
            
            print(f"\n✅ [SUCCESS] ফাইনাল টেলিগ্রাম লিংক: {tg_link}")
            return tg_link

        except Exception as e:
            print(f"\n❌ [ERROR] স্ক্র্যাপ করতে ফেইল করেছে: {e}")
            return None
        finally:
            browser.close()

if __name__ == "__main__":
    get_telegram_link_only()
