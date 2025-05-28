import { Options } from "@effect/cli";
import * as Command from "@effect/cli/Command";
import { Console, Effect } from "effect";
import { upgradeDependencies } from "./upgradeDependencies.js";

const outputFolderName = Options.directory("output").pipe(
  Options.withAlias("o"),
  Options.withDefault("/home/steam/valheim/BepInEx/plugins"),
);
const dependenciesFile = Options.file("deps").pipe(
  Options.withAlias("d"),
  Options.withDefault("/home/steam/valheim/mods.json"),
);

const command = Command.make(
  "thunderstore",
  { outputFolderName, dependenciesFile },
  ({ outputFolderName, dependenciesFile }) => {
    Effect.runPromise(
      upgradeDependencies({
        dependenciesFilePath: dependenciesFile,
        outputFolderName,
      }),
    );
    return Console.log(outputFolderName);
  },
);

export const run = Command.run(command, {
  name: "Thunderstore Server Manager",
  version: "0.0.1",
});
