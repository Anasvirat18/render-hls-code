const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Octokit } = require("@octokit/rest");

const INPUT_URL = "http://ptu.ridsys.in/riptv/live/stream20/index.m3u8";
const OUTPUT_DIR = "output";
const GITHUB_OUTPUT_REPO = "Anasvirat18/hls-stream";
const GITHUB_BRANCH = "main";
const GITHUB_TOKEN = process.env.GH_TOKEN;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function deleteOldFiles() {
  const { data: items } = await octokit.repos.getContent({
    owner: "Anasvirat18",
    repo: "hls-stream",
    path: "",
    ref: GITHUB_BRANCH,
  });

  for (const item of items) {
    if (item.type === "file") {
      console.log(`🗑️ Deleting ${item.name}...`);
      await octokit.repos.deleteFile({
        owner: "Anasvirat18",
        repo: "hls-stream",
        path: item.path,
        message: `Delete old file: ${item.name}`,
        sha: item.sha,
        branch: GITHUB_BRANCH,
      });
    }
  }
}

function runFFmpeg() {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${INPUT_URL}" -c copy -hls_time 10 -hls_list_size 0 -f hls ${OUTPUT_DIR}/index.m3u8`,
      (err, stdout, stderr) => {
        if (err) {
          console.error("❌ FFmpeg error:", stderr);
          return reject(err);
        }
        resolve();
      }
    );
  });
}

async function uploadNewFiles() {
  const files = fs.readdirSync(OUTPUT_DIR);
  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file);
    const content = fs.readFileSync(filePath).toString("base64");

    console.log(`⬆️ Uploading ${file}...`);
    await octokit.repos.createOrUpdateFileContents({
      owner: "Anasvirat18",
      repo: "hls-stream",
      path: file,
      message: `Upload ${file}`,
      content,
      branch: GITHUB_BRANCH,
    });
  }
}

(async () => {
  try {
    // Prepare the output directory
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR);

    console.log("🎬 Starting FFmpeg conversion...");
    await runFFmpeg();

    console.log("🧹 Deleting old files from GitHub...");
    await deleteOldFiles();

    console.log("⬆️ Uploading new HLS files...");
    await uploadNewFiles();

    console.log("✅ All done!");
    console.log("🔗 Stream ready at: https://anasvirat18.github.io/hls-stream/index.m3u8");
  } catch (err) {
    console.error("❌ Script failed:", err);
  }
})();
