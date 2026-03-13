const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("[*] গিটহাব অ্যাকশনস থেকে হাই-কোয়ালিটি পোস্টার তৈরি হচ্ছে...");

        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--font-render-hinting=none'
            ]
        });

        const page = await browser.newPage();
        // ক্যানভাস সাইজ একটু লম্বা করা হলো (1080x1350 - Instagram 4:5 Portrait সাইজ) 
        // যাতে সব লেখা সুন্দরভাবে ফিট হয়।
        await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:ital,wght@0,600;0,800;1,900&display=swap" rel="stylesheet">
            <style>
                :root {
                    --team1-color: #f39c12;
                    --team2-color: #e74c3c;
                    --bg-dark: #0f172a;
                    --accent-blue: #38bdf8;
                }
                body {
                    margin: 0; padding: 0;
                    width: 1080px; height: 1350px;
                    background: var(--bg-dark);
                    font-family: 'Montserrat', sans-serif;
                    overflow: hidden;
                    position: relative;
                    color: white;
                }
                .bg-pattern {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.03) 2px, transparent 2px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 2px, transparent 2px);
                    background-size: 60px 60px;
                    z-index: 1;
                }
                .glow-top {
                    position: absolute; top: -300px; left: -200px; width: 1000px; height: 1000px;
                    background: radial-gradient(circle, rgba(243,156,18,0.3) 0%, transparent 60%);
                    z-index: 2; filter: blur(40px);
                }
                .glow-bottom {
                    position: absolute; bottom: 0px; right: -200px; width: 1000px; height: 1000px;
                    background: radial-gradient(circle, rgba(231,76,60,0.3) 0%, transparent 60%);
                    z-index: 2; filter: blur(40px);
                }
                
                .content {
                    position: relative; z-index: 10;
                    width: 100%; height: 100%;
                    display: flex; flex-direction: column; justify-content: space-between;
                    padding: 60px; box-sizing: border-box;
                }

                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;}
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
                .dot { width: 16px; height: 16px; background: white; border-radius: 50%; animation: blink 1.5s infinite; }
                @keyframes blink { 0%, 100% {opacity: 1;} 50% {opacity: 0.3;} }

                .match-container {
                    flex-grow: 1; display: flex; flex-direction: column;
                    justify-content: center; align-items: center; text-align: center;
                }
                .team-name {
                    font-family: 'Bebas Neue', cursive;
                    font-size: 150px; line-height: 0.9;
                    text-transform: uppercase; letter-spacing: 2px;
                    text-shadow: 8px 8px 0px #000, 20px 20px 40px rgba(0,0,0,0.8);
                    width: 100%;
                }
                .team-1 { color: #ffffff; margin-bottom: 10px; }
                .team-1 .highlight { color: var(--team1-color); }
                
                .team-2 { color: #ffffff; margin-top: 10px; }
                .team-2 .highlight { color: var(--team2-color); }

                .vs-wrapper {
                    position: relative; width: 100%; display: flex; justify-content: center; align-items: center;
                    margin: 30px 0; z-index: 15;
                }
                .line { height: 3px; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); }
                .vs-badge {
                    background: #0f172a; border: 4px solid #334155;
                    color: white; font-size: 50px; font-weight: 900; font-style: italic;
                    width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;
                    border-radius: 50%; margin: 0 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                }

                /* নতুন ফুটার ডিজাইন (সুন্দর করে সাজানো) */
                .footer-card {
                    background: rgba(15, 23, 42, 0.8);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 35px;
                    display: flex;
                    flex-direction: column;
                    gap: 25px;
                    backdrop-filter: blur(15px);
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                }

                .footer-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .footer-text-block {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .footer-title {
                    font-size: 22px;
                    color: #94a3b8;
                    font-weight: 800;
                    letter-spacing: 1px;
                }

                .footer-link {
                    font-size: 26px;
                    color: var(--accent-blue);
                    font-weight: 900;
                    letter-spacing: 0.5px;
                }

                .playlist-info {
                    font-size: 24px;
                    color: white;
                    font-weight: 600;
                }

                .branding {
                    background: rgba(255,255,255,0.1); 
                    border: 2px solid rgba(255,255,255,0.2);
                    padding: 15px 30px; font-size: 28px; font-weight: 900;
                    color: #fff; letter-spacing: 3px; border-radius: 12px;
                }
                .branding span { color: var(--accent-blue); }
                
                .divider {
                    height: 2px; background: rgba(255,255,255,0.1); width: 100%;
                }
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

                <div class="footer-card">
                    <div class="footer-text-block">
                        <div class="playlist-info">Watch on our playlists. To find playlist visit:</div>
                        <div class="footer-link">https://github.com/srhady/bingstream</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="footer-row">
                        <div class="footer-text-block">
                            <div class="footer-title">JOIN OUR TELEGRAM CHANNEL</div>
                            <div class="footer-link">https://t.me/livesportsplay</div>
                        </div>
                        <div class="branding">© <span>HADY</span></div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

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
