import { Console, Effect, pipe } from "effect";
import { UnknownException } from "effect/Cause";
import { Package, PackageSchema } from "./schemas/Package.js";
import { Url } from "./schemas/Url.js";
import { ModDependency, Dependencies } from "./types.js";
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

const getOutdatedPackages = (
  dependencies: ModDependency[],
): Effect.Effect<Package[], UnknownException, never> =>
  Effect.gen(function* () {
    const outdatedPackages: Package[] = [];
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
            outdatedPackages.push(packageData);
          }
        }),
      ),
    );
    return outdatedPackages;
  });

const decompressPackage = (
  outputFilePath: string,
  outputFolderName: string,
  packageFolderName: string,
): Effect.Effect<void, UnknownException, never> =>
  Effect.tryPromise(async () =>
    decompress(
      outputFilePath,
      `${outputFolderName}/${packageFolderName}`,
    ).finally(async () => {
      return await fs.rm(outputFilePath);
    }),
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
  dependenciesFile: string;
  outputFolderName?: string;
};
export const upgradeDependencies = (
  {
    dependenciesFile = "./mods.json",
    outputFolderName = "dist",
  }: UpgradeDependenciesOptions = {
    dependenciesFile: "./mods.json",
    outputFolderName: "dist",
  },
) =>
  Effect.gen(function* () {
    // 1. Read list of mods and their versions
    const modDependencies = yield* readDependencies(dependenciesFile);
    // 2. Check for updates
    const outdatedPackages = yield* getOutdatedPackages(modDependencies.mods);
    // 3. Upgrade outdated dependencies
    yield* Effect.all(
      outdatedPackages.map((modPackage) =>
        upgradePackage(modPackage, outputFolderName),
      ),
      {
        concurrency: 3,
      },
    );
  });
