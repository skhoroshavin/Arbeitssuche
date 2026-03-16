/* global console */
import { execSync } from "child_process";
import path from "path";

/**
 * electron-builder afterPack hook — ad-hoc signs the macOS .app bundle.
 * This replaces Apple Developer ID signing for local/dev distribution.
 * Recipients still need to run `xattr -cr` to bypass Gatekeeper.
 */
export default async function (context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`Ad-hoc signing: ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, {
    stdio: "inherit",
  });
}
