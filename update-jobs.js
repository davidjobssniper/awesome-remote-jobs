// update-jobs.js
const fs = require('fs');
const path = require('path');

const API_URL = "https://www.jobsniper.pro/api/jobs";
const WEBSITE_URL = "https://jobsniper.pro";

async function fetchTopJobs() {
    try {
        console.log(`Fetching jobs from API: ${API_URL}...`);
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let jobsList = data.jobs || [];

        // Xử lý cấu trúc JSON đặc thù của Chúa công (lồng trong key "0", "1",...)
        const cleanJobs = jobsList.map(item => {
            const keys = Object.keys(item);
            // Nếu item có dạng { "0": { title: "..." } }, ta rút lõi nó ra
            if (keys.length === 1 && !isNaN(keys[0])) {
                return item[keys[0]];
            }
            return item; // Trả về nguyên bản nếu là object bình thường
        });

        // Sắp xếp mới nhất lên đầu (đề phòng API trả về lộn xộn)
        cleanJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Lấy đúng 10 job đầu tiên
        return cleanJobs.slice(0, 10); 
    } catch (e) {
        console.error("❌ API Fetch Error:", e);
        return [];
    }
}

function generateMarkdown(jobs, dateString) {
    let md = `# 🎯 Awesome Remote Software Jobs
*Daily updated curated list of high-paying remote developer jobs.*

🔥 **[Join our Elite Telegram Channel to get real-time alerts](${WEBSITE_URL})**

---

### 🚀 Top 10 Jobs Today (${dateString})

| Role | Company | Salary | Stack | Apply |
|------|---------|--------|-------|-------|
`;

    jobs.forEach(job => {
        const salary = job.salary && job.salary !== "Negotiable" ? job.salary : "Competitive";
        // Vì API trả về mảng tags, ta lấy tối đa 2 tag đầu tiên hiển thị cho gọn
        const stackInfo = (job.tags && job.tags.length > 0) ? job.tags.slice(0, 2).join(', ') : "Various";
        
        // Cắt ngắn title nếu quá dài để bảng Markdown không bị vỡ
        const shortTitle = job.title.length > 45 ? job.title.substring(0, 42) + "..." : job.title;
        
        md += `| **${shortTitle}** | ${job.company} | ${salary} | ${stackInfo} | [View Details](${WEBSITE_URL}?slug=${job.slug}) |\n`;
    });

    md += `\n---\n*Bot updated at: ${new Date().toISOString()}*\n`;
    md += `\n📂 **[View Previous Days in Archive](./archive/)**`;
    return md;
}

async function run() {
    const jobs = await fetchTopJobs();
    
    if (jobs.length === 0) {
        console.log("⚠️ No jobs found or API failed. Exiting.");
        return;
    }

    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const markdownContent = generateMarkdown(jobs, today);

    // 1. Cập nhật README.md
    fs.writeFileSync('README.md', markdownContent);
    console.log("✅ Updated README.md");

    // 2. Tạo file Archive (Kho SEO)
    const archiveDir = path.join(__dirname, 'archive');
    if (!fs.existsSync(archiveDir)){
        fs.mkdirSync(archiveDir);
    }
    const archivePath = path.join(archiveDir, `${today}-remote-jobs.md`);
    fs.writeFileSync(archivePath, markdownContent);
    console.log(`✅ Created archive: ${archivePath}`);
}

run();
