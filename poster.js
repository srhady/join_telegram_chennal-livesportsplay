const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    try {
        console.log("[*] হোমপেজ থেকে লাইভ ম্যাচ খোঁজা হচ্ছে...");
        
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

        const displayMatches = scrapedMatches.slice(0, 8);
        console.log(`[+] মোট ${scrapedMatches.length} টি পাওয়া গেছে, পোস্টারে ${displayMatches.length} টি রেন্ডার করা হচ্ছে।`);

        let layoutClass = displayMatches.length > 4 ? 'grid-2-col' : 'grid-1-col';

        const colorPalettes = [
            { c1: "#f39c12", c2: "#e74c3c" }, 
            { c1: "#00d2ff", c2: "#3a7bd5" }, 
            { c1: "#11998e", c2: "#38ef7d" }, 
            { c1: "#8E2DE2", c2: "#4A00E0" }, 
            { c1: "#fc00ff", c2: "#00dbde" }  
        ];

        let allMatchesHtml = '';
        displayMatches.forEach((match, index) => {
            let colors = colorPalettes[index % colorPalettes.length]; 
            
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
                    <span class="time">● LIVE</span>
                </div>
            </div>
            `;
        });

        const dateOptions = { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const bdtDateTime = new Date().toLocaleString('en-US', dateOptions).toUpperCase();

        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&family=Montserrat:ital,wght@0,600;0,800;0,900;1,900&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-dark: #070b14;
                    --accent-blue: #38bdf8;
                }
                body {
                    margin: 0; padding: 0;
                    width: 1080px; height: 1350px;
                    background: var(--bg-dark);
                    font-family: 'Montserrat', sans-serif;
                    color: white; position: relative;
                    overflow: hidden;
                }
                .bg-pattern {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.02) 2px, transparent 2px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 2px, transparent 2px);
                    background-size: 60px 60px; z-index: 1;
                }
                
                .datetime-badge {
                    position: absolute;
                    top: 40px; right: 40px;
                    background: rgba(15, 23, 42, 0.85);
                    border: 1px solid rgba(56, 189, 248, 0.3);
                    padding: 15px 35px;
                    border-radius: 50px;
                    font-size: 24px;
                    color: #fff;
                    font-weight: 800;
                    letter-spacing: 1px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 5px 20px rgba(0,0,0,0.5);
                    z-index: 20;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .datetime-badge span { color: var(--accent-blue); }

                .content {
                    position: relative; z-index: 10;
                    display: flex; flex-direction: column;
                    justify-content: space-between;
                    padding: 50px; box-sizing: border-box; height: 100%;
                }

                .main-title {
                    text-align: center; font-size: 75px; font-weight: 900; color: white;
                    text-transform: uppercase; margin-top: 50px; margin-bottom: 25px; letter-spacing: 2px;
                    font-family: 'Anton', sans-serif;
                    text-shadow: 0 10px 20px rgba(0,0,0,0.5);
                }
                .main-title span { color: #ff004c; animation: blink 1.5s infinite;}
                @keyframes blink { 0%, 100% {opacity: 1;} 50% {opacity: 0.3;} }

                .matches-list {
                    flex-grow: 1; display: grid; align-content: center;
                    gap: 25px; width: 100%;
                }
                .grid-1-col { grid-template-columns: 1fr; }
                .grid-2-col { grid-template-columns: 1fr 1fr; }

                .match-row {
                    background: rgba(15, 23, 42, 0.6);
                    border: 2px solid rgba(255,255,255,0.05);
                    border-radius: 20px; 
                    display: flex; flex-direction: column; justify-content: center;
                    position: relative; overflow: hidden;
                    backdrop-filter: blur(15px); box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                
                .grid-2-col .match-row { width: 100%; }
                
                .grid-2-col .match-row:last-child:nth-child(odd) {
                    grid-column: 1 / -1;
                    width: 48%; 
                    margin: 0 auto;
                }

                .match-row::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px;
                    background: linear-gradient(90deg, var(--t1-color), var(--t2-color));
                }
                .match-row::after {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, var(--t1-color) 0%, transparent 40%);
                    opacity: 0.05; z-index: -1;
                }

                .match-teams { display: flex; justify-content: space-between; align-items: center; }
                .team {
                    font-weight: 700; text-transform: uppercase; line-height: 1.15;
                    font-family: 'Oswald', sans-serif;
                    width: 42%; text-align: center; letter-spacing: 1px;
                    text-shadow: 3px 3px 10px rgba(0,0,0,0.8);
                }
                
                /* টিমের নাম শুধু সাদা করা হলো */
                .team-1, .team-2 { color: #ffffff; }
                .team-1 .highlight, .team-2 .highlight { color: #ffffff; }

                .vs-badge {
                    color: #fff; font-weight: 900; font-style: italic;
                    background: rgba(255,255,255,0.05); border-radius: 12px;
                    border: 2px solid rgba(255,255,255,0.1);
                    font-family: 'Montserrat', sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                }
                .match-details { color: #94a3b8; text-align: center; font-weight: bold; margin-top: 10px; }
                
                /* টুর্নামেন্টের নাম প্রতিটি কার্ডের নিজস্ব কালার (var(--t1-color)) পাবে */
                .tournament { color: var(--t1-color); text-transform: uppercase; letter-spacing: 1px; font-weight: 900;}
                .time { color: #ff004c; letter-spacing: 1px;}

                .grid-1-col .match-row { padding: 45px; gap: 25px; }
                .grid-1-col .team { font-size: 80px; }
                .grid-1-col .vs-badge { font-size: 45px; padding: 15px 25px; }
                .grid-1-col .match-details { font-size: 28px; }

                .grid-2-col .match-row { padding: 35px 20px; gap: 20px; }
                .grid-2-col .team { font-size: 45px; }
                .grid-2-col .vs-badge { font-size: 30px; padding: 10px 20px; }
                .grid-2-col .match-details { font-size: 20px; }

                .footer-card {
                    background: rgba(15, 23, 42, 0.8);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 20px; padding: 30px; display: flex; flex-direction: column; gap: 20px;
                    backdrop-filter: blur(20px); box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
                    margin-top: 25px;
                }
                .footer-row { display: flex; justify-content: space-between; align-items: center; }
                .footer-text-block { display: flex; flex-direction: column; gap: 6px; }
                .footer-title { font-size: 20px; color: #94a3b8; font-weight: 800; letter-spacing: 1px; }
                .footer-link { font-size: 22px; color: var(--accent-blue); font-weight: 900; letter-spacing: 0.5px; }
                .playlist-info { font-size: 20px; color: white; font-weight: 600; }
                .branding {
                    background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2);
                    padding: 12px 30px; font-size: 24px; font-weight: 900; color: #fff; letter-spacing: 3px; border-radius: 12px;
                }
                .branding span { color: var(--accent-blue); }
                .divider { height: 2px; background: rgba(255,255,255,0.1); width: 100%; }
            </style>
        </head>
        <body>
            <div class="bg-pattern"></div>
            
            <div class="datetime-badge">
                🗓️ <span>UPDATE:</span> ${bdtDateTime} (BDT)
            </div>
            
            <div class="content">
                <div class="main-title"><span>●</span> TODAY'S LIVE MATCHES</div>

                <div class="matches-list ${layoutClass}">
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
        
        const filename = 'social_all_matches_poster.png';
        await page.screenshot({ path: filename, type: 'png' }); 
        await browser.close();

        console.log(`\n[+] বুম! 💥 ফাইনাল মাস্টারপিস পোস্টার রেডি: ${filename}`);
        
    } catch (e) {
        console.error("\n❌ গিটহাব স্ক্রিপ্টে এরর:", e.message);
        process.exit(1);
    }
})();
