import { Package, PackageSchema } from "./schemas/Package.js";
import { Url } from "./schemas/Url.js";
import { ModDependency, Dependencies } from "./types.js";
import { isOutdatedVersion } from "./util.js";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import path from "path";
import decompress from "decompress";

import fs from 'node:fs/promises'

async function getPackageListing(
  author: string,
  packageName: string,
): Promise<Package> {
  const resp = await fetch(
    `https://thunderstore.io/api/experimental/package/${author}/${packageName}/`,
  );
  return PackageSchema.parse(await resp.json());
}

const download = async (url: Url, path: string): Promise<void> => {
  const response = await fetch(url)
  const body = response.body as ReadableStream
  const stream = Readable.fromWeb(body)
  await fs.writeFile(path, stream)
}

const readDependencies = async (filePath: string | undefined): Promise<Dependencies> => {
  let dependencies: Dependencies = {
    mods: []
  };
  try {
    const rawData = await fs.readFile(filePath || "./mods.json", { encoding: "utf8" });
    dependencies = JSON.parse(rawData);
    console.log(dependencies);
  } catch (err) {
    console.error(err);
  }
  return dependencies
}

const getOutdatedPackages = async (dependencies: ModDependency[]): Promise<Package[]> => {
  const outdatedPackages: Package[] = [];
  for await (const dependency of dependencies) {
    const packageData = await getPackageListing(dependency.author, dependency.package);
    console.log(packageData);
    if (isOutdatedVersion(dependency.version, packageData.latest.version_number)) {
      outdatedPackages.push(packageData);
    }
  }
  return outdatedPackages
}

const upgradePackage = async (modPackage: Package, outputFolderName: string | undefined) => {
  const packageFolderName = `${modPackage.namespace}-${modPackage.name}`;
  const outputFilePath = path.join(
    process.cwd(),
    `${packageFolderName}-${modPackage.latest.version_number}.zip`,
  );
  // Download updates for outdated mods
  await download(`https://gcdn.thunderstore.io/live/repository/packages/${packageFolderName}-${modPackage.latest.version_number}.zip`, outputFilePath)

  // Extract zip into server plugin directory
  await decompress(outputFilePath, `${outputFolderName || 'dist'}/${packageFolderName}`)
    .then((files) => {
      console.log(files);
    })
    .catch((error) => {
      console.log(error);
    }).finally(async () => {
      await fs.rm(outputFilePath)
    })
}

export type UpgradeDependenciesOptions = {
  dependenciesJson?: string
  outputFolderName?: string
}
export async function upgradeDependencies({dependenciesJson, outputFolderName}: UpgradeDependenciesOptions = {}) {
  // 1. Read list of mods and their versions
  const modDependencies = await readDependencies(dependenciesJson)
  // 2. Check for updates
  const outdatedMods = await getOutdatedPackages(modDependencies.mods)
  // 3. Upgrade outdated dependencies
  for await (const modPackage of outdatedMods) {
    await upgradePackage(modPackage, outputFolderName)
  }
}

upgradeDependencies();
