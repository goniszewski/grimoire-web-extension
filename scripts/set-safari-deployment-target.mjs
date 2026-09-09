import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const deploymentTarget = "13.0";
const projectPath = resolve(
  ".output/safari/Grimoire Companion/Grimoire Companion.xcodeproj/project.pbxproj",
);
const source = readFileSync(projectPath, "utf8");
const matches = source.match(/MACOSX_DEPLOYMENT_TARGET = [^;]+;/g) ?? [];

if (matches.length === 0) {
  throw new Error(`No macOS deployment targets found in ${projectPath}`);
}

const updated = source.replace(
  /MACOSX_DEPLOYMENT_TARGET = [^;]+;/g,
  `MACOSX_DEPLOYMENT_TARGET = ${deploymentTarget};`,
);
writeFileSync(projectPath, updated);
console.log(`Set ${matches.length} Safari project deployment targets to macOS ${deploymentTarget}`);
