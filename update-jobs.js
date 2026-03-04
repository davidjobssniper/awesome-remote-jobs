// update-jobs.js
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = "JobSniper_Jobs";
const WEBSITE_URL = "https://jobsniper.pro";

// Cấu hình AWS SDK đọc từ Environment Variables (GitHub Secrets)
AWS.config.update({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const db = new AWS.DynamoDB.DocumentClient();

async function fetchTopJobs() {
    try {
        const data = await db.scan({
            TableName: TABLE_NAME,
            Limit: 50, // Lấy nhiều xíu để đủ 10 job mới nhất
            FilterExpression: "attribute_exists(#desc) AND #desc <> :empty",
            ExpressionAttributeNames: { "#desc": "desc" },
            ExpressionAttributeValues: { ":empty": "" }
        }).promise();

        let allJobs = data.Items || [];
        // Lấy 10 job mới nhất không phân biệt ngôn ngữ
        allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return allJobs.slice(0, 10); 
    } catch (e) {
        console.error("DB Error:", e);
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
        const stackInfo = job.interview_data?.keywords ? job.interview_data.keywords.slice(0, 2).join(', ') : "Various";
        // Cắt ngắn title nếu dài quá
        const shortTitle = job.title.length > 40 ? job.title.substring(0, 37) + "..." : job.title;
        
        md += `| **${shortTitle}** | ${job.company} | ${salary} | ${stackInfo} | [View Details](${WEBSITE_URL}?slug=${job.slug}) |\n`;
    });

    md += `\n---\n*Bot updated at: ${new Date().toISOString()}*\n`;
    md += `\n📂 **[View Previous Days in Archive](./archive/)**`;
    return md;
}

async function run() {
    console.log("Fetching jobs from DynamoDB...");
    const jobs = await fetchTopJobs();
    
    if (jobs.length === 0) {
        console.log("No jobs found. Exiting.");
        return;
    }

    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const markdownContent = generateMarkdown(jobs, today);

    // 1. Cập nhật README.md (Trang chủ)
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
