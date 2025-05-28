import { Console, Data, Effect, pipe } from "effect";
import { UnknownException } from "effect/Cause";
import { Manifest } from "./schemas/Manifest.js";
import { Package, PackageSchema } from "./schemas/Package.js";
import { Url } from "./schemas/Url.js";
import { ModDependency, Dependencies, Version } from "./types.js";
import { isOutdatedVersion } from "./util.js";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import path from "path";
import decompress from "decompress";

import fs from "node:fs/promises";
import chalk from "chalk";

const getPackageListing = (
  author: string,
  packageName: string,
): Effect.Effect<Package, UnknownException, never> =>
  Effect.tryPromise(async () => {
    const resp = await fetch(
      `https://thunderstore.io/api/experimental/package/${author}/${packageName}/`,
    );
    return PackageSchema.parse(await resp.json());
  });

class FileNotFoundError extends Data.TaggedError("FileNotFound")<{
  message: string;
}> {}

const getPackageManifest = (
  author: string,
  packageName: string,
  outputFolderName: string,
) =>
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise(async () => {
      const packageFolderName = path.join(
        outputFolderName,
        `${author}-${packageName}`,
      );
      const dir = await fs.readdir(packageFolderName, { withFileTypes: true });
      for await (const file of dir) {
        if (!file.name.endsWith("manifest.json")) {
          continue;
        }
        const rawData = await fs.readFile(
          path.join(file.parentPath, file.name),
          {
            encoding: "utf8",
          },
        );
        const manifest: Manifest = JSON.parse(rawData);
        return manifest;
      }
      return null;
    });
    if (result === null) {
      return yield* Effect.fail(
        new FileNotFoundError({
          message: `Could not find manifest.json for ${author}-${packageName}`,
        }),
      );
    }
    return result;
  });

const getCurrentVersions = (
  mods: ModDependency[],
  outputFolderName: string,
): Effect.Effect<ModDependency[], never, never> =>
  pipe(
    mods.map((mod) =>
      pipe(
        getPackageManifest(mod.author, mod.package, outputFolderName),
        (prev) =>
          Effect.match(prev, {
            onSuccess: (value) => ({
              version: value.version_number as Version,
              author: mod.author,
              package: mod.package,
            }),
            onFailure: (e) => ({
              version: "0.0.0" as Version,
              author: mod.author,
              package: mod.package,
            }),
          }),
      ),
    ),
    (prev) => Effect.all(prev),
  );

const updateDependenciesFile = (
  dependenciesFilePath: string,
  packagesToUpdate: Package[],
) =>
  Effect.gen(function* () {
    const modDependencies = yield* readDependencies(dependenciesFilePath);
    const updatedPackageMap = new Map<string, Version>();
    for (const packageToUpdate of packagesToUpdate) {
      updatedPackageMap.set(
        `${packageToUpdate.namespace}-${packageToUpdate.name}`,
        packageToUpdate.latest.version_number,
      );
    }
    for (const mod of modDependencies.mods) {
      const latestVersion = updatedPackageMap.get(
        `${mod.author}-${mod.package}`,
      );
      if (!latestVersion) {
        continue;
      }
      mod.version = latestVersion;
    }

    yield* Effect.tryPromise(async () =>
      fs.writeFile(
        dependenciesFilePath,
        JSON.stringify(modDependencies, null, "\t"),
      ),
    );
  });

const download = (url: Url, path: string) =>
  Effect.tryPromise(async () => {
    const response = await fetch(url);
    const body = response.body as ReadableStream;
    const stream = Readable.fromWeb(body);
    return await fs.writeFile(path, stream);
  });

const readDependencies = (
  filePath: string,
): Effect.Effect<Dependencies, UnknownException, never> =>
  pipe(
    Effect.tryPromise(async () => {
      let dependencies: Dependencies = {
        mods: [],
      };
      try {
        const rawData = await fs.readFile(filePath, {
          encoding: "utf8",
        });
        dependencies = JSON.parse(rawData);
      } catch (err) {
        console.error(err);
      }
      return dependencies;
    }),
    Effect.tap((dependencies) =>
      Console.log(
        dependencies.mods.reduce(
          (prev, curr) =>
            `${prev}${curr.author}-${curr.package}-${curr.version}\n`,
          "",
        ),
      ),
    ),
  );

const getPackagesToUpdate = (
  dependencies: ModDependency[],
): Effect.Effect<Package[], UnknownException, never> =>
  Effect.gen(function* () {
    const packagesToUpdate: Package[] = [];
    yield* Effect.all(
      dependencies.map((dependency) =>
        Effect.gen(function* () {
          const packageData = yield* getPackageListing(
            dependency.author,
            dependency.package,
          );
          if (
            isOutdatedVersion(
              dependency.version,
              packageData.latest.version_number,
            )
          ) {
            packagesToUpdate.push(packageData);
          } else {
            yield* Console.log(
              chalk.cyan(
                `${packageData.full_name} is already on the latest version (v${packageData.latest.version_number})`,
              ),
            );
          }
        }),
      ),
    );
    return packagesToUpdate;
  });

const decompressPackage = (
  zipFilePath: string,
  outputFolderName: string,
  packageFolderName: string,
): Effect.Effect<void, UnknownException, never> =>
  Effect.tryPromise(async () =>
    decompress(zipFilePath, `${outputFolderName}/${packageFolderName}`).finally(
      async () => {
        return await fs.rm(zipFilePath);
      },
    ),
  );

const upgradePackage = (
  modPackage: Package,
  outputFolderName: string,
): Effect.Effect<void, UnknownException, never> => {
  const packageFolderName = `${modPackage.namespace}-${modPackage.name}`;
  const outputFilePath = path.join(
    process.cwd(),
    `${packageFolderName}-${modPackage.latest.version_number}.zip`,
  );

  return Effect.all([
    // Download updates for outdated mods
    download(
      `https://gcdn.thunderstore.io/live/repository/packages/${packageFolderName}-${modPackage.latest.version_number}.zip`,
      outputFilePath,
    ),

    // Extract zip into server plugin directory
    decompressPackage(outputFilePath, outputFolderName, packageFolderName),
    Console.log(
      chalk.green(
        `Updated ${packageFolderName} to v${modPackage.latest.version_number}`,
      ),
    ),
  ]);
};

export type UpgradeDependenciesOptions = {
  dependenciesFilePath: string;
  outputFolderName?: string;
};
export const upgradeDependencies = (
  {
    dependenciesFilePath = "./mods.json",
    outputFolderName = "dist",
  }: UpgradeDependenciesOptions = {
    dependenciesFilePath: "./mods.json",
    outputFolderName: "dist",
  },
) =>
  Effect.gen(function* () {
    // 1. Read list of mods and their versions
    const modDependencies = yield* readDependencies(dependenciesFilePath);
    // 2. Get installed versions
    const currentVersions = yield* getCurrentVersions(
      modDependencies.mods,
      outputFolderName,
    );
    // 2. Check for updates
    const packagesToUpdate = yield* getPackagesToUpdate(currentVersions);
    // 3. Upgrade outdated dependencies
    yield* Effect.all(
      packagesToUpdate.map((modPackage) =>
        upgradePackage(modPackage, outputFolderName),
      ),
      {
        concurrency: 3,
      },
    );
    // 4. Update dependencies file
    yield* updateDependenciesFile(dependenciesFilePath, packagesToUpdate);
  });
