# প্রয়োজনীয় লাইব্রেরি ইম্পোর্ট করা হচ্ছে
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# টার্গেট ওয়েবসাইটের URL
WEBSITE_URL = "https://bingsport.watch/" 

def run_diagnostics():
    """
    এই ফাংশনটি ওয়েবসাইট ভিজিট করে একটি স্ক্রিনশট এবং HTML সোর্স কোড সেভ করে।
    """
    print("Setting up Selenium Chrome driver for diagnostics...")
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # একটি সাধারণ ব্রাউজারের মতো উইন্ডো সাইজ দেওয়া হচ্ছে
    chrome_options.add_argument("--window-size=1920,1080") 
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print(f"Loading page: {WEBSITE_URL}")
        driver.get(WEBSITE_URL)
        
        # পেজটি পুরোপুরি লোড হওয়ার জন্য ৬০ সেকেন্ড অপেক্ষা করা হচ্ছে
        print("Waiting for 60 seconds for the page to load completely...")
        time.sleep(60)
        
        # --- ফাইল সেভ করা হচ্ছে ---
        screenshot_file = "screenshot.png"
        source_file = "page_source.html"

        print(f"Saving screenshot to {screenshot_file}...")
        driver.save_screenshot(screenshot_file)
        
        print(f"Saving page source to {source_file}...")
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(driver.page_source)
            
        print("Diagnostic files created successfully.")

    except Exception as e:
        print(f"An error occurred during diagnostics: {e}")

    finally:
        print("Closing the driver.")
        driver.quit()

if __name__ == "__main__":
    print("Starting diagnostic script...")
    run_diagnostics()
    print("Diagnostic script finished.")
