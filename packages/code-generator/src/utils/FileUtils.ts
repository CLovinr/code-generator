import path from "path";
import fs from "fs";

export function copyFiles(
  sourceFile: string,
  targetDir: string,
  includeCurrentDir: boolean = false
) {
  const stat = fs.statSync(sourceFile); // 获取文件状态
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (stat.isDirectory()) {
    if (includeCurrentDir) {
      targetDir = path.join(targetDir, path.basename(sourceFile));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    const files = fs.readdirSync(sourceFile);

    for (const file of files) {
      const sourceFilePath = path.join(sourceFile, file);
      const targetFilePath = path.join(targetDir, file);

      const stat = fs.statSync(sourceFilePath);
      if (stat.isDirectory()) {
        copyFiles(sourceFilePath, targetFilePath);
      } else {
        fs.copyFileSync(sourceFilePath, targetFilePath);
      }
    }
  } else {
    fs.copyFileSync(
      sourceFile,
      path.join(targetDir, path.basename(sourceFile))
    );
  }
}
