// scripts/generateVersion.js

import fs from "fs";
import path from "path";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const version = `v${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

const filePath = path.resolve("src/version.js");

fs.writeFileSync(filePath, `export const APP_VERSION = "${version}";\n`);
console.log("✅ Generated version:", version);
