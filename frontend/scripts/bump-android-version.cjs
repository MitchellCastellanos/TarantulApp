const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.error(`Error: build.gradle not found at ${gradlePath}`);
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, 'utf8');

// 1. Increment versionCode
// Match: versionCode project.hasProperty('versionCode') ? project.property('versionCode').toInteger() : 24
const versionCodeRegex = /versionCode\s+(?:project\.hasProperty\('versionCode'\)\s+\?\s+project\.property\('versionCode'\)\.toInteger\(\)\s+:\s+)?(\d+)/;
const versionCodeMatch = content.match(versionCodeRegex);

if (!versionCodeMatch) {
  console.error('Error: Could not find versionCode in build.gradle');
  process.exit(1);
}

const oldVersionCode = parseInt(versionCodeMatch[1], 10);
const newVersionCode = oldVersionCode + 1;

// If it's the dynamic version, we only update the fallback value
if (content.includes("project.hasProperty('versionCode')")) {
  content = content.replace(/:\s+(\d+)/, `: ${newVersionCode}`);
} else {
  content = content.replace(/versionCode\s+(\d+)/, `versionCode ${newVersionCode}`);
}

// 2. Increment versionName (patch bump)
// Match: versionName "2.0.2"
const versionNameRegex = /versionName\s+"([^"]+)"/;
const versionNameMatch = content.match(versionNameRegex);

if (!versionNameMatch) {
  console.error('Error: Could not find versionName in build.gradle');
  process.exit(1);
}

const oldVersionName = versionNameMatch[1];
const parts = oldVersionName.split('.');

if (parts.length >= 3) {
  // 1.0.3 -> 1.0.4
  const patch = parseInt(parts[parts.length - 1], 10);
  if (!isNaN(patch)) {
    parts[parts.length - 1] = (patch + 1).toString();
    const newVersionName = parts.join('.');
    content = content.replace(versionNameRegex, `versionName "${newVersionName}"`);
    console.log(`Bumped Android version: ${oldVersionName} (${oldVersionCode}) -> ${newVersionName} (${newVersionCode})`);
  } else {
    console.warn('Could not parse patch version, only incrementing versionCode');
    console.log(`Bumped Android versionCode: ${oldVersionCode} -> ${newVersionCode}`);
  }
} else {
  console.warn('versionName format not recognized for patch bump, only incrementing versionCode');
  console.log(`Bumped Android versionCode: ${oldVersionCode} -> ${newVersionCode}`);
}

fs.writeFileSync(gradlePath, content);
