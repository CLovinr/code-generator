const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

try {
  // 获取当前分支名称
  const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();

  // 获取远程仓库的 URL
  const remoteUrl = execSync("git config --get remote.origin.url")
    .toString()
    .trim();

  // 解析仓库名称
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);

  if (match) {
    const repoOwner = match[1];
    const repoName = match[2];

    console.log("当前分支:", branch);
    console.log("远程仓库 URL:", remoteUrl);
    console.log("仓库所有者:", repoOwner);
    console.log("仓库名称:", repoName);
    console.log("将替换README.md中的图片链接...");

    const readmePath = path.join(
      __dirname,
      "..",
      "packages",
      "code-generator-dusk",
      "README.md"
    );
    let readmeContent = fs.readFileSync(readmePath, "utf-8");
    readmeContent = readmeContent.replace(
      /\.\/docs\/images\//g,
    //   `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/docs/images/`
      `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${branch}/docs/images/`
    );

    fs.writeFileSync(readmePath, readmeContent, "utf-8");

    console.log("README.md中的图片链接已替换完成。");
  }
} catch (error) {
  console.error("获取 Git 信息失败:", error.message);
}
