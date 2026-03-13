const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("[*] গিটহাব অ্যাকশনস থেকে হাই-কোয়ালিটি পোস্টার তৈরি হচ্ছে...");

        // গিটহাবে কোনো ঝামেলা ছাড়াই সরাসরি পাপেটিয়ার লঞ্চ হবে
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--font-render-hinting=none' // ফন্ট একদম স্মুথ রেন্ডার করার জন্য
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:ital,wght@0,700;0,900;1,900&display=swap" rel="stylesheet">
            <style>
                :root {
                    --team1-color: #f39c12; /* Brisbane Roar Orange */
                    --team2-color: #e74c3c; /* WSW Red */
                    --bg-dark: #0f172a;     /* প্রফেশনাল স্লেট ডার্ক */
                    --accent-blue: #38bdf8;
                }
                body {
                    margin: 0; padding: 0;
                    width: 1080px; height: 1080px;
                    background: var(--bg-dark);
                    font-family: 'Montserrat', sans-serif;
                    overflow: hidden;
                    position: relative;
                    color: white;
                }
                /* ডাইনামিক স্পোর্টস গ্রিড ব্যাকগ্রাউন্ড */
                .bg-pattern {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.03) 2px, transparent 2px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 2px, transparent 2px);
                    background-size: 60px 60px;
                    z-index: 1;
                }
                /* সিনেমাটিক স্পটলাইট ইফেক্ট */
                .glow-top {
                    position: absolute; top: -300px; left: -200px; width: 1000px; height: 1000px;
                    background: radial-gradient(circle, rgba(243,156,18,0.3) 0%, transparent 60%);
                    z-index: 2; filter: blur(40px);
                }
                .glow-bottom {
                    position: absolute; bottom: -300px; right: -200px; width: 1000px; height: 1000px;
                    background: radial-gradient(circle, rgba(231,76,60,0.3) 0%, transparent 60%);
                    z-index: 2; filter: blur(40px);
                }
                
                .content {
                    position: relative; z-index: 10;
                    width: 100%; height: 100%;
                    display: flex; flex-direction: column; justify-content: space-between;
                    padding: 70px; box-sizing: border-box;
                }

                /* হেডার: লিগ এবং লাইভ ব্যাজ */
                .header { display: flex; justify-content: space-between; align-items: flex-start; }
                .league-badge {
                    background: white; color: #0f172a;
                    padding: 12px 35px; font-size: 38px;
                    font-family: 'Bebas Neue', cursive;
                    letter-spacing: 4px; transform: skewX(-15deg);
                    box-shadow: 12px 12px 0px rgba(255,255,255,0.1);
                    border-left: 8px solid var(--team1-color);
                }
                .league-badge span { display: block; transform: skewX(15deg); }
                
                .live-btn {
                    background: #ff004c; color: white;
                    padding: 12px 35px; font-size: 28px; font-weight: 900;
                    border-radius: 50px; display: flex; align-items: center; gap: 15px;
                    box-shadow: 0 0 35px rgba(255,0,76,0.6);
                    text-transform: uppercase; letter-spacing: 1px;
                }
                .dot { width: 16px; height: 16px; background: white; border-radius: 50%; }

                /* মেইন ম্যাচ এরিয়া */
                .match-container {
                    flex-grow: 1; display: flex; flex-direction: column;
                    justify-content: center; align-items: center; text-align: center;
                    margin-top: -30px;
                }
                .team-name {
                    font-family: 'Bebas Neue', cursive;
                    font-size: 160px; line-height: 0.85;
                    text-transform: uppercase; letter-spacing: 2px;
                    text-shadow: 8px 8px 0px #000, 20px 20px 40px rgba(0,0,0,0.8);
                    width: 100%; position: relative;
                }
                .team-1 { color: #ffffff; margin-bottom: 20px; }
                .team-1 .highlight { color: var(--team1-color); }
                
                .team-2 { color: #ffffff; margin-top: 20px; }
                .team-2 .highlight { color: var(--team2-color); }

                /* প্রিমিয়াম VS ডিজাইন */
                .vs-wrapper {
                    position: relative; width: 100%; display: flex; justify-content: center; align-items: center;
                    margin: 40px 0; z-index: 15;
                }
                .line { height: 3px; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); }
                .vs-badge {
                    background: #0f172a; border: 4px solid #334155;
                    color: white; font-size: 55px; font-weight: 900; font-style: italic;
                    width: 110px; height: 110px; display: flex; justify-content: center; align-items: center;
                    border-radius: 50%; margin: 0 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                }

                /* ফুটার: ব্যবহারকারীর নতুন টেক্সট এবং লিঙ্ক */
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-top: 2px solid rgba(255,255,255,0.1);
                    padding-top: 25px;
                    margin-top: 20px;
                }

                .footer-links {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 70%;
                    text-align: left;
                }

                .link-item {
                    font-size: 20px;
                    color: #94a3b8;
                    display: flex;
                    gap: 5px;
                }
                .link-label { font-weight: bold; }
                .link-text { color: white; }

                .info-paragraph {
                    font-size: 18px;
                    color: #94a3b8;
                    line-height: 1.4;
                }
                .link-url { color: var(--accent-blue); text-decoration: underline; }

                .telegram-call {
                    font-size: 18px;
                    color: white;
                    text-align: left;
                }
                .telegram-label { font-weight: bold; margin-bottom: 3px; }
                .telegram-url { color: var(--accent-blue); }

                /* টিমের নাম এবং VS ব্যাজের মধ্যে স্পেসিং কমানো */
                .team-1 { margin-bottom: 10px; }
                .team-2 { margin-top: 10px; }
                .vs-wrapper { margin: 20px 0; }

                /* branding স্টাইল বজায় রাখা */
                .branding {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.1);
                    padding: 10px 20px;
                    font-size: 20px;
                    font-weight: 900;
                    color: #fff;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                    margin-bottom: 10px;
                }
                .branding span { color: var(--accent-blue); }
            </style>
        </head>
        <body>
            <div class="bg-pattern"></div>
            <div class="glow-top"></div>
            <div class="glow-bottom"></div>
            
            <div class="content">
                <div class="header">
                    <div class="league-badge"><span>A-LEAGUE</span></div>
                    <div class="live-btn"><div class="dot"></div> LIVE MATCH</div>
                </div>

                <div class="match-container">
                    <div class="team-name team-1">
                        BRISBANE<br><span class="highlight">ROAR</span>
                    </div>
                    
                    <div class="vs-wrapper">
                        <div class="line"></div>
                        <div class="vs-badge">VS</div>
                        <div class="line"></div>
                    </div>

                    <div class="team-name team-2">
                        WESTERN SYDNEY<br><span class="highlight">WANDERERS</span>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-links">
                        <div class="link-item">
                            <span class="link-label">STREAM SOURCE:</span>
                            <span class="link-text">BINGSTREAM.INFO</span>
                        </div>
                        <div class="info-paragraph">
                            <p>Watch on our playlists.</p>
                            <p>To find playlist visit: <span class="link-url">https://github.com/srhady/bingstream</span></p>
                        </div>
                        <div class="telegram-call">
                            <p class="telegram-label">JOIN OUR TELEGRAM CHANNEL</p>
                            <p class="telegram-url">https://t.me/livesportsplay</p>
                        </div>
                    </div>
                    <div class="branding">© <span>HADY</span></div>
                </div>
            </div>
        </body>
        </html>
        `;

        // ফন্ট যাতে ১০০% লোড হয়, সেজন্য networkidle0 ব্যবহার করা হয়েছে
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const filename = 'social_match_poster.png';
        await page.screenshot({ path: filename, type: 'png' });
        await browser.close();

        console.log(`\n[+] গিটহাবে প্রফেশনাল পোস্টার সেভ হয়েছে: ${filename}`);
        
    } catch (e) {
        console.error("\n❌ গিটহাব স্ক্রিপ্টে এরর:", e.message);
        process.exit(1);
    }
})();
