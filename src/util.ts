import { Version } from "./types.js";

export function isOutdatedVersion(
  currentVersion: Version,
  latestVersion: Version,
) {
  const currentParts = currentVersion.split(".");
  const latestParts = latestVersion.split(".");
  for (let i = 0; i < currentParts.length; i++) {
    if (Number(currentParts[i]) < Number(latestParts[i])) {
      return true;
    }
  }
  return false;
}
