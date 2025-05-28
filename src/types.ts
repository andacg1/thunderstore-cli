export type Version = `${number}.${number}.${number}`;
export type ModDependency = {
  author: string;
  package: string;
  version: Version;
};

export type Dependencies = {
  mods: ModDependency[];
};
