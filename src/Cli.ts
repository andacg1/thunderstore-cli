import { Args, Options } from "@effect/cli";
import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect";
import { upgradeDependencies } from "./upgradeDependencies.js";

//const output = Args.path({ name: "output", exists: "either" }).pipe(Options.withAlias('o'))
const output = Options.directory("output").pipe(Options.withAlias("o"), Options.withDefault('/home/steam/valheim/BepInEx/plugins'))
const dependenciesJson = Options.directory("deps").pipe(Options.withAlias("d"), Options.withDefault('/home/steam/valheim/mods.json'))

const command = Command.make("thunderstore", {output, dependenciesJson}, ({output, dependenciesJson}) => {
  //Effect.tryPromise(upgradeDependencies)
  return Console.log(output);
})

export const run = Command.run(command, {
  name: "Thunderstore Server Manager",
  version: "0.0.0"
})
