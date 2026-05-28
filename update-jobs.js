// update-jobs.ts
const fs = require('fs');
const path = require('path');

const KEY_PUBLIC = process.env.KEY_PUBLIC;
// Vẫn dùng API Web để cày Traffic và Backlink SEO
const API_URL = "https://www.jobsniper.pro/api/jobs?key=" + KEY_PUBLIC;
const WEBSITE_URL = "https://www.jobsniper.pro";
const HACKATHON_URL = "https://www.jobsniper.pro/hackathon.html";

function sanitizeMarkdown(text) {
    if (!text) return "N/A";
    return String(text).replace(/\|/g, '-').replace(/[\r\n]+/g, ' ').trim();
}

async function fetchTopJobs() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'User-Agent': 'github-actions-jobsniper',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let jobsList = data.jobs || [];

        // Logic làm sạch data gốc của Chúa công
        const cleanJobs = jobsList.map(item => {
            const keys = Object.keys(item);
            if (keys.length === 1 && !isNaN(keys[0])) {
                return item[keys[0]];
            }
            return item;
        });

        // Sắp xếp lấy mới nhất
        cleanJobs.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        return cleanJobs.slice(0, 10);
    } catch (e) {
        console.error("❌ API Fetch Error:", e);
        return [];
    }
}

function generateMarkdown(jobs, dateString) {
    let md = `# 🎯 Awesome Remote Software Jobs (2026)

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Updated](https://img.shields.io/badge/Last_Update-Today-blue?style=for-the-badge)

> [!IMPORTANT]
> ### 🛑 STOP DOING 7-ROUND HR INTERVIEWS
> We are actively bypassing the broken HR screening process. We hold direct contracts with hiring CTOs for high-ticket remote roles ($120k - $250k). They don't want to read your CV. They want to see your architecture.
> 
> **The CTO Firewall Deal:**
> 1. Pick a role from the list below.
> 2. Accept the technical challenge and submit your system design.
> 3. **The Fast-Track:** If your architecture clears our technical audit (Score > 7.0), your profile goes straight to the decision-maker. 0 HR rounds.
> 4. **Monthly Bounty:** The top-rated architecture submission each month wins a **$500 Cash Prize**.
> 
> 👉 [**Prove Your Architecture Skills & Bypass HR Now**](https://www.jobsniper.pro)

🔥 **We update these direct-to-CTO pipelines daily. Don't let your CV rot in an inbox. (${WEBSITE_URL})**

---

### 🚀 Top 10 Remote Roles Today (${dateString})

| Role (Click to Apply) | Company | Salary | Tech Stack |
|-----------------------|---------|--------|------------|
`;

    jobs.forEach(job => {
        let salary = job.salary && job.salary !== "Negotiable" ? job.salary : "Competitive";
        let stackInfo = (job.tags && job.tags.length > 0) ? job.tags.slice(0, 2).join(', ') : "Backend";
        
        let safeTitle = sanitizeMarkdown(job.title);
        let shortTitle = safeTitle.length > 50 ? safeTitle.substring(0, 47) + "..." : safeTitle;

        let safeCompany = sanitizeMarkdown(job.company);
        let safeSalary = sanitizeMarkdown(salary);
        let safeStack = sanitizeMarkdown(stackInfo);

        const jobUrl = `${WEBSITE_URL}/?slug=${job.slug}`;
        
        md += `| [**${shortTitle}**](${jobUrl}) | ${safeCompany} | ${safeSalary} | ${safeStack} |\n`;
    });

    md += `\n---\n*Updated at: ${new Date().toISOString()}*\n`;
    md += `\n📂 **[Browse Previous Days in Archive](./archive/)**`;
    return md;
}

async function run() {
    const jobs = await fetchTopJobs();
    
    if (jobs.length === 0) {
        console.log("⚠️ No jobs found or API failed. Exiting.");
        return;
    }

    const today = new Date().toISOString().split('T')[0]; 
    const markdownContent = generateMarkdown(jobs, today);

    fs.writeFileSync('README.md', markdownContent);
    console.log("✅ Updated README.md");

    const archiveDir = path.join(__dirname, 'archive');
    if (!fs.existsSync(archiveDir)){
        fs.mkdirSync(archiveDir);
    }
    
    const archiveMarkdown = markdownContent.replace(
        `# 🎯 Awesome Remote Software Jobs (2026)`, 
        `# 🗄️ Job Archive: ${today}`
    );

    const archivePath = path.join(archiveDir, `${today}-remote-jobs.md`);
    fs.writeFileSync(archivePath, archiveMarkdown);
    console.log(`✅ Created archive: ${archivePath}`);
}

run();
