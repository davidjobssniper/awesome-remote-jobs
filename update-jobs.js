// update-jobs.js
const fs = require('fs');
const path = require('path');

const API_URL = "https://www.jobsniper.pro/api/jobs";
const WEBSITE_URL = "https://jobsniper.pro";

// FIX: Hàm tiện ích giúp dọn dẹp text, chống vỡ bảng Markdown
function sanitizeMarkdown(text) {
    if (!text) return "N/A";
    return String(text).replace(/\|/g, '-').replace(/[\r\n]+/g, ' ').trim();
}

async function fetchTopJobs() {
    try {
        console.log(`Fetching jobs from API: ${API_URL}...`);
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let jobsList = data.jobs || [];

        const cleanJobs = jobsList.map(item => {
            const keys = Object.keys(item);
            if (keys.length === 1 && !isNaN(keys[0])) {
                return item[keys[0]];
            }
            return item;
        });

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
    // 🚀 SEO TỐI ƯU: Thêm Badges cho chuyên nghiệp, nhấn mạnh keyword
    let md = `# 🎯 Awesome Remote Software Jobs (2026)

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Updated](https://img.shields.io/badge/Last_Update-${dateString}-blue?style=for-the-badge)

*A daily curated list of high-paying, verified remote developer jobs for Senior Engineers.*

🔥 **[Join our Elite JobSniper Platform to get real-time alerts](${WEBSITE_URL})**

---

### 🚀 Top 10 Remote Roles Today (${dateString})

| Role (Click to Apply) | Company | Salary | Tech Stack |
|-----------------------|---------|--------|------------|
`;

    jobs.forEach(job => {
        let salary = job.salary && job.salary !== "Negotiable" ? job.salary : "Competitive";
        let stackInfo = (job.tags && job.tags.length > 0) ? job.tags.slice(0, 2).join(', ') : "Backend";
        
        // FIX BUG: Khai báo bằng let, sanitize trước khi cắt
        let safeTitle = sanitizeMarkdown(job.title);
        let shortTitle = safeTitle.length > 50 ? safeTitle.substring(0, 47) + "..." : safeTitle;

        // Sanitize toàn bộ data để bảng không bao giờ vỡ
        let safeCompany = sanitizeMarkdown(job.company);
        let safeSalary = sanitizeMarkdown(salary);
        let safeStack = sanitizeMarkdown(stackInfo);

        // 🎯 TUYỆT KỸ SEO: Gắn link thẳng vào Job Title (Bỏ cột Apply dư thừa)
        // Đảm bảo URL có dấu / trước ?slug= để chuẩn format
        const jobUrl = `${WEBSITE_URL}/?slug=${job.slug}`;
        
        md += `| [**${shortTitle}**](${jobUrl}) | ${safeCompany} | ${safeSalary} | ${safeStack} |\n`;
    });

    md += `\n---\n*Bot updated automatically at: ${new Date().toISOString()}*\n`;
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

    // 1. Cập nhật README.md
    fs.writeFileSync('README.md', markdownContent);
    console.log("✅ Updated README.md");

    // 2. Tạo file Archive (Kho SEO)
    const archiveDir = path.join(__dirname, 'archive');
    if (!fs.existsSync(archiveDir)){
        fs.mkdirSync(archiveDir);
    }
    
    // SEO TỐI ƯU: Cho Archive file một cái tiêu đề khác đi một chút để tránh trùng lặp nội dung 100%
    const archiveMarkdown = markdownContent.replace(
        `# 🎯 Awesome Remote Software Jobs (2026)`, 
        `# 🗄️ Job Archive: ${today}`
    );

    const archivePath = path.join(archiveDir, `${today}-remote-jobs.md`);
    fs.writeFileSync(archivePath, archiveMarkdown);
    console.log(`✅ Created archive: ${archivePath}`);
}

run();
