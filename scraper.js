const puppeteer = require('puppeteer');
const fs = require('fs');

const getBDTime = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bdDate = new Date(utc + (3600000 * 6)); 
    let hours = bdDate.getHours(), minutes = bdDate.getMinutes(), seconds = bdDate.getSeconds();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    let day = bdDate.getDate(), month = bdDate.getMonth() + 1, year = bdDate.getFullYear();
    return `${hours}:${minutes}:${seconds} ${ampm} ${day < 10 ? '0'+day : day}-${month < 10 ? '0'+month : month}-${year}`;
};

(async () => {
    let b;
    try {
        // গিটহাবের জন্য স্ট্যান্ডার্ড ব্রাউজার লঞ্চ
        b = await puppeteer.launch({ 
            headless: "new", 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'] 
        });
        const p = await b.newPage();
        await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('\n[*] crichd.com.co হোমপেজ লোড হচ্ছে...');
        await p.goto('https://crichd.com.co/', { waitUntil: 'networkidle2', timeout: 90000 }).catch(e=>console.log("[!] লোড এরর:", e.message));
        await new Promise(r => setTimeout(r, 6000));
        
        // শুধুমাত্র সবুজ রঙের আসল ম্যাচের লিংক ক্যাচ করা
        const matchesData = await p.evaluate(() => {
            let results = [];
            let rows = Array.from(document.querySelectorAll('tr'));
            for (let row of rows) {
                let links = Array.from(row.querySelectorAll('td a'));
                if (links.length > 0) {
                    let matchLink = links[links.length - 1]; // সবুজ রঙের লিংক
                    let text = (matchLink.innerText || '').trim();
                    let href = matchLink.href || '';
                    
                    if (text.length > 4 && href.includes('crichd.com.co') && !text.toLowerCase().includes('score')) {
                        if (!results.some(r => r.url === href)) {
                            results.push({ title: text, url: href });
                        }
                    }
                }
            }
            return results;
        });

        if (matchesData.length === 0) {
            console.log('[-] হোমপেজে কোনো লাইভ ম্যাচের লিংক পাওয়া যায়নি!');
            await b.close();
            return;
        }

        console.log(`[+] মোট ${matchesData.length} টি ম্যাচ পাওয়া গেছে!`);

        let m3uContent = "#EXTM3U\n\n";
        m3uContent += `#"name": "CricHD Live Auto Update",\n`;
        m3uContent += `#"telegram": "https://t.me/livesportsplay",\n`;
        m3uContent += `#"last update time": "${getBDTime()}",\n\n`;
        
        // আপনার দেওয়া ফিক্সড লোগো
        const logoUrl = "https://cdn-icons-png.freepik.com/512/6308/6308493.png";

        for (let match of matchesData) {
            console.log(`\n==================================================`);
            console.log(`🏆 ম্যাচ: ${match.title}`);
            console.log(`==================================================`);
            
            await p.goto(match.url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(()=>{});
            await new Promise(r => setTimeout(r, 6000));

            // শুধু চ্যানেলের ভেতরের Watch লিংকগুলো নেওয়া (নামের আর দরকার নেই)
            const channelLinks = await p.evaluate(() => {
                let res = [];
                let rows = Array.from(document.querySelectorAll('tr'));
                rows.forEach(row => {
                    let tds = row.querySelectorAll('td');
                    if (tds.length >= 3) {
                        let watchLink = tds[tds.length - 1].querySelector('a'); 
                        if (watchLink && (watchLink.innerText || '').toLowerCase().includes('watch') && watchLink.href) {
                             res.push(watchLink.href);
                        }
                    }
                });
                return res;
            });

            if (channelLinks.length === 0) {
                console.log(`[-] এই ম্যাচের পেজে কোনো চ্যানেল লিংক পাওয়া যায়নি।`);
                continue; 
            }

            console.log(`[+] এই ম্যাচের ${channelLinks.length} টি লিংক স্ক্যান হচ্ছে...\n`);

            let linkCounter = 1;
            for (let cUrl of channelLinks) {
                let mPage;
                try {
                    mPage = await b.newPage();
                    await mPage.setViewport({ width: 1280, height: 720 });
                    await mPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    
                    let bestLink = "";

                    await mPage.setRequestInterception(true);
                    mPage.on('request', request => {
                        const url = request.url();
                        if ((url.includes('.m3u8') || url.includes('.m3u')) && !url.includes('ping.gif')) {
                            bestLink = url.replace(/&amp;/g, '&');
                        }
                        request.continue();
                    });

                    await mPage.goto(cUrl, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 5000));
                    
                    await mPage.mouse.click(640, 360).catch(()=>{});
                    await new Promise(r => setTimeout(r, 4000));

                    if (!bestLink) {
                        const iframes = await mPage.$$eval('iframe', frames => frames.map(f => f.src).filter(src => src && src.includes('http')));
                        if (iframes.length > 0) {
                            for (let iframeSrc of iframes) {
                                const tPage = await b.newPage();
                                await tPage.setRequestInterception(true);
                                tPage.on('request', req => {
                                    const u = req.url();
                                    if (u.includes('.m3u8')) bestLink = u;
                                    req.continue();
                                });
                                await tPage.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
                                await new Promise(r => setTimeout(r, 5000));
                                await tPage.mouse.click(640, 360).catch(()=>{}); 
                                await new Promise(r => setTimeout(r, 4000));
                                await tPage.close().catch(()=>{});
                                if (bestLink) break; 
                            }
                        }
                    }

                    if (bestLink) {
                        console.log(`    ✅ লিংক পাওয়া গেছে: ${bestLink}`);
                        
                        // চ্যানেলের নামের বদলে শুধু ম্যাচের নাম (সবুজ লেখাটা) বসানো হলো
                        m3uContent += `#EXTINF:-1 tvg-logo="${logoUrl}" group-title="Live Match", ${match.title} (Link ${linkCounter})\n`;
                        m3uContent += `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n`;
                        m3uContent += `#EXTVLCOPT:http-referrer=https://crichd.com.co/\n`;
                        m3uContent += `${bestLink}\n\n`;
                        linkCounter++;
                    } else {
                        console.log(`    ❌ কোনো m3u8 লিংক পাওয়া যায়নি।`);
                    }
                } catch (e) {
                    console.log(`    ❌ এরর: স্ক্যান করতে সমস্যা হয়েছে`);
                } finally {
                    if (mPage) await mPage.close().catch(()=>{});
                }
                await new Promise(r => setTimeout(r, 2000)); 
            }
        }
        
        if(b) await b.close();

        fs.writeFileSync('crichd.m3u', m3uContent, 'utf-8');
        console.log(`\n==================================================`);
        console.log(`[+] সফলভাবে crichd.m3u ফাইল আপডেট হয়েছে!`);
        console.log(`==================================================\n`);

    } catch (e) { 
        console.log('\n❌ স্ক্রিপ্টে সমস্যা হয়েছে:', e.message); 
        if(b) await b.close().catch(()=>{});
    }
})();
