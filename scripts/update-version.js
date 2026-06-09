import fs from "fs";
import path from "path";

const version = process.argv[2] || "1.0.0"; // Get version from command line or default to 1.0.0
const buildNumber = process.argv[3] || "1"; // Get build number from command line or default to 1
const androidVersionCode = process.argv[4]; // Optional Android version code

// Update iOS Info.plist
const infoPlistPath = path.join(
  "ios",
  "App",
  "App.xcodeproj",
  "project.pbxproj"
);
let infoPlist = fs.readFileSync(infoPlistPath, "utf-8");

infoPlist = infoPlist.replace(
  /MARKETING_VERSION = .*;/g,
  `MARKETING_VERSION = ${version};`
);

infoPlist = infoPlist.replace(
  /CURRENT_PROJECT_VERSION = .*;/g,
  `CURRENT_PROJECT_VERSION = ${buildNumber};`
);

fs.writeFileSync(infoPlistPath, infoPlist, "utf-8");
console.log(
  `Updated iOS version to ${version} and build number to ${buildNumber}`
);

// Update Android build.gradle
const buildGradlePath = path.join("android", "app", "build.gradle");
let buildGradle = fs.readFileSync(buildGradlePath, "utf-8");

// Extract current Android versionCode if needed
let finalAndroidVersionCode = androidVersionCode;
if (!finalAndroidVersionCode) {
  const versionCodeMatch = buildGradle.match(/versionCode (\d+)/);
  if (versionCodeMatch && versionCodeMatch[1]) {
    const currentVersionCode = parseInt(versionCodeMatch[1], 10);
    finalAndroidVersionCode = (currentVersionCode + 1).toString();
  } else {
    // If no versionCode found in build.gradle, start with 1
    finalAndroidVersionCode = "1";
  }
}

buildGradle = buildGradle.replace(
  /versionName ".*"/g,
  `versionName "${version}"`
);
buildGradle = buildGradle.replace(
  /versionCode \d+/g,
  `versionCode ${finalAndroidVersionCode}`
);
fs.writeFileSync(buildGradlePath, buildGradle, "utf-8");
console.log(
  `Updated Android version to ${version} and build number (versionCode) to ${finalAndroidVersionCode}`
);

// Update version constants
const versionConstantsPath = path.join("src", "common", "versionConstants.ts");
let versionConstants = fs.readFileSync(versionConstantsPath, "utf-8");
versionConstants = versionConstants.replace(
  /APP_VERSION = ".*";/g,
  `APP_VERSION = "${version}";`
);
versionConstants = versionConstants.replace(
  /APP_BUILD_NUMBER = ".*";/g,
  `APP_BUILD_NUMBER = "${buildNumber}";`
);
fs.writeFileSync(versionConstantsPath, versionConstants, "utf-8");
console.log(
  `Updated version constants to ${version} and build number to ${buildNumber}`
);
