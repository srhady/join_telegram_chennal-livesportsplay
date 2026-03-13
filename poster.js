const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    try {
        console.log("[*] হোমপেজ থেকে লাইভ ম্যাচ খোঁজা হচ্ছে...");
        
        // ১. Cheerio দিয়ে আপনার অরিজিনাল স্ক্র্যাপিং লজিক
        const res = await fetch('https://bingstream.info/');
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let scrapedMatches = [];
        let seen = new Set();

        $('a[href*="/live-sport/"]').each((i, el) => {
            let text = $(el).text().trim();
            
            let isLive = /\bLIVE\b/i.test(text) || /\d+\s*-\s*\d+/.test(text) || /\b(?:Half|Session)\b/i.test(text);
            let isUpcoming = /\b\d{1,2}:\d{2}\b/.test(text);
            
            if (isLive && !isUpcoming) {
                let parts = text.split('\n').map(p => p.trim()).filter(p => p !== '');
                let cleanTitle = "";
                let tournament = "";
                let team1 = "";
                let team2 = "";

                let cleanedParts = parts.filter(p => !/^(LIVE|NOW|HD|Watch|•|\d{1,2}:\d{2}|.*Half.*|.*Session.*|\d+'?)$/i.test(p));
                let sepIdx = cleanedParts.findIndex(p => /\d+\s*-\s*\d+/.test(p) || /^(vs|v)$/i.test(p));

                if (sepIdx !== -1) {
                    team1 = cleanedParts[sepIdx - 1] || "";
                    team2 = cleanedParts[sepIdx + 1] || "";
                    tournament = cleanedParts[sepIdx - 2] || ""; 
                } else {
                    if (cleanedParts.length >= 2) {
                        tournament = cleanedParts[0]; 
                        cleanTitle = cleanedParts[cleanedParts.length - 1]; 
                    } else if (cleanedParts.length === 1) {
                        cleanTitle = cleanedParts[0];
                    } else {
                        cleanTitle = parts[parts.length - 1];
                    }
                    cleanTitle = cleanTitle.replace(/\b(LIVE|NOW|HD|Live|live)\b/gi, '').replace(/•/g, '').replace(/ vs /gi, ' VS ').replace(/\s+/g, ' ').trim();
                    
                    if(cleanTitle.includes(' VS ')) {
                        let tParts = cleanTitle.split(' VS ');
                        team1 = tParts[0];
                        team2 = tParts[1];
                    } else {
                        team1 = cleanTitle;
                    }
                }

                if (tournament && /(LIVE|NOW|Half|Session|\d{1,2}:\d{2}|\d+')/i.test(tournament)) {
                    tournament = ""; 
                }

                let matchKey = `${team1}-${team2}`;
                if (team1 && team1.length > 2 && !seen.has(matchKey) && !/Menu|Hot|Fixtures/i.test(team1)) {
                    seen.add(matchKey);
                    scrapedMatches.push({
                        team1: team1.trim(),
                        team2: team2 ? team2.trim() : "",
                        tournament: tournament ? tournament.trim() : "LIVE EVENT"
                    });
                }
            }
        });

        if (scrapedMatches.length === 0) {
            console.log("[-] আপাতত কোনো লাইভ ম্যাচ নেই। পোস্টার তৈরি স্কিপ করা হলো।");
            process.exit(0);
        }

        console.log(`[+] মোট ${scrapedMatches.length} টি লাইভ ম্যাচ পাওয়া গেছে!`);
        console.log("[*] গিটহাব অ্যাকশনস থেকে হাই-কোয়ালিটি পোস্টার তৈরি হচ্ছে...");

        // ২. ডাইনামিক স্পোর্টস কালার প্যালেট (লুপের জন্য)
        const colorPalettes = [
            { c1: "#f39c12", c2: "#e74c3c" }, // Orange - Red
            { c1: "#00d2ff", c2: "#3a7bd5" }, // Neon Blue
            { c1: "#11998e", c2: "#38ef7d" }, // Cyber Green
            { c1: "#8E2DE2", c2: "#4A00E0" }, // Purple
            { c1: "#fc00ff", c2: "#00dbde" }  // Pink - Cyan
        ];

        // ৩. HTML রো (Row) জেনারেট করা
        let allMatchesHtml = '';
        scrapedMatches.forEach((match, index) => {
            let colors = colorPalettes[index % colorPalettes.length]; // কালার রিপিট হবে
            
            // টিমের নামগুলোকে ভেঙে স্টাইল করার জন্য
            let t1Words = match.team1.split(' ');
            let t1High = t1Words.length > 1 ? t1Words.pop() : "";
            let t1Base = t1Words.join(' ');

            let t2Html = '';
            if (match.team2) {
                let t2Words = match.team2.split(' ');
                let t2High = t2Words.length > 1 ? t2Words.pop() : "";
                let t2Base = t2Words.join(' ');
                t2Html = `
                    <div class="vs-badge">VS</div>
                    <div class="team team-2">
                        ${t2Base} <br>
                        <span class="highlight">${t2High}</span>
                    </div>
                `;
            }

            allMatchesHtml += `
            <div class="match-row" style="--t1-color: ${colors.c1}; --t2-color: ${colors.c2};">
                <div class="match-teams">
                    <div class="team team-1">
                        ${t1Base} <br>
                        <span class="highlight">${t1High || match.team1}</span>
                    </div>
                    ${t2Html}
                </div>
                <div class="match-details">
                    <span class="tournament">${match.tournament}</span> | 
                    <span class="time">● LIVE NOW</span>
                </div>
            </div>
            `;
        });

        // ৪. Puppeteer দিয়ে রেন্ডার করা
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
        });

        const page = await browser.newPage();
        // উচ্চতা auto অ্যাডজাস্ট হওয়ার জন্য যথেষ্ট বড় ক্যানভাস
        await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:ital,wght@0,600;0,800;1,900&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-dark: #070b14;
                    --accent-blue: #38bdf8;
                }
                body {
                    margin: 0; padding: 0;
                    width: 1080px; min-height: 1920px; height: auto;
                    background: var(--bg-dark);
                    font-family: 'Montserrat', sans-serif;
                    color: white; position: relative;
                }
                .bg-pattern {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.02) 2px, transparent 2px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 2px, transparent 2px);
                    background-size: 60px 60px; z-index: 1;
                }
                
                .content {
                    position: relative; z-index: 10;
                    display: flex; flex-direction: column;
                    padding: 60px; box-sizing: border-box; min-height: 100vh;
                }

                .main-title {
                    text-align: center; font-size: 85px; font-weight: 900; color: white;
                    text-transform: uppercase; margin: 20px 0 50px 0; letter-spacing: 3px;
                    font-family: 'Bebas Neue', cursive; 
                    text-shadow: 0 10px 20px rgba(0,0,0,0.5);
                }
                .main-title span { color: #ff004c; animation: blink 1.5s infinite;}
                @keyframes blink { 0%, 100% {opacity: 1;} 50% {opacity: 0.3;} }

                .matches-list {
                    flex-grow: 1; display: flex; flex-direction: column;
                    gap: 35px; margin-bottom: 50px;
                }

                .match-row {
                    background: rgba(15, 23, 42, 0.6);
                    border: 2px solid rgba(255,255,255,0.05);
                    border-radius: 25px; padding: 40px;
                    display: flex; flex-direction: column; gap: 20px;
                    position: relative; overflow: hidden;
                    backdrop-filter: blur(15px); box-shadow: 0 15px 40px rgba(0,0,0,0.4);
                }
                .match-row::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 8px;
                    background: linear-gradient(90deg, var(--t1-color), var(--t2-color));
                }
                .match-row::after {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, var(--t1-color) 0%, transparent 40%);
                    opacity: 0.05; z-index: -1;
                }

                .match-teams { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
                .team {
                    font-size: 80px; font-weight: 900; text-transform: uppercase; line-height: 0.95;
                    font-family: 'Bebas Neue', cursive; width: 42%; text-align: center;
                    text-shadow: 5px 5px 15px rgba(0,0,0,0.8);
                }
                .team-1 { color: #ffffff; }
                .team-1 .highlight { color: var(--t1-color); }
                .team-2 { color: #ffffff; }
                .team-2 .highlight { color: var(--t2-color); }

                .vs-badge {
                    font-size: 45px; color: #fff; font-weight: 900; font-style: italic;
                    background: rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 15px;
                    border: 2px solid rgba(255,255,255,0.1);
                    font-family: 'Montserrat', sans-serif; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                }

                .match-details { font-size: 26px; color: #94a3b8; text-align: center; font-weight: bold; margin-top: 10px; }
                .tournament { color: var(--accent-blue); text-transform: uppercase; letter-spacing: 2px;}
                .time { color: #ff004c; letter-spacing: 1px;}

                .footer-card {
                    background: rgba(15, 23, 42, 0.8);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 20px; padding: 35px; display: flex; flex-direction: column; gap: 25px;
                    backdrop-filter: blur(20px); box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
                    margin-top: auto;
                }
                .footer-row { display: flex; justify-content: space-between; align-items: center; }
                .footer-text-block { display: flex; flex-direction: column; gap: 8px; }
                .footer-title { font-size: 22px; color: #94a3b8; font-weight: 800; letter-spacing: 1px; }
                .footer-link { font-size: 26px; color: var(--accent-blue); font-weight: 900; letter-spacing: 0.5px; }
                .playlist-info { font-size: 24px; color: white; font-weight: 600; }
                .branding {
                    background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2);
                    padding: 15px 35px; font-size: 28px; font-weight: 900; color: #fff; letter-spacing: 3px; border-radius: 12px;
                }
                .branding span { color: var(--accent-blue); }
                .divider { height: 2px; background: rgba(255,255,255,0.1); width: 100%; }
            </style>
        </head>
        <body>
            <div class="bg-pattern"></div>
            
            <div class="content">
                <div class="main-title"><span>●</span> TODAY'S LIVE MATCHES</div>

                <div class="matches-list">
                    ${allMatchesHtml}
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
        
        // fullPage: true দেওয়া হয়েছে, তাই ম্যাচ বেশি হলে ক্যানভাস নিজে থেকেই লম্বা হয়ে সব ম্যাচ ফিট করে নেবে
        const filename = 'social_all_matches_poster.png';
        await page.screenshot({ path: filename, type: 'png', fullPage: true }); 
        await browser.close();

        console.log(`\n[+] বুম! 💥 সব লাইভ ম্যাচের ডাইনামিক পোস্টার রেডি: ${filename}`);
        
    } catch (e) {
        console.error("\n❌ গিটহাব স্ক্রিপ্টে এরর:", e.message);
        process.exit(1);
    }
})();
