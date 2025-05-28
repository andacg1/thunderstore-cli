# Thunderstore Mod Manager

## Installation
### Using npm (Preferred)
1. Install the package globally on your server
```bash
npm i -g thunderstore-cli 
```

### Building Manually
1. Clone the repo
```bash
git clone https://github.com/andacg1/thunderstore-server-cli.git
```

2. Install dependencies
```bash
npm install
```

3. Create a package archive
```bash
npm run pack
```

4. Upload the `thunderstore-cli-0.0.2.tgz` archive to your server
5. Install the package globally on your server
```bash
npm i -g thunderstore-cli-0.0.2.tgz
```


## Usage
1. Create a dependency file (e.g. `mods.json`) on your server
```json
{
  "mods": [
    {
      "author": "Vapok",
      "package": "AdventureBackpacks",
      "version": "1.7.10"
    },
    {
      "author": "Marlthon",
      "package": "Cats",
      "version": "0.1.3"
    },
    {
      "author": "MSchmoecker",
      "package": "MultiUserChest",
      "version": "0.6.1"
    }
  ]
}
```
2. Run `thunderstore-cli`
```bash
thunderstore-cli --deps /home/steam/valheim/mods.json -o /home/steam/valheim/BepInEx/plugins
```

---

# Contributing
## Running Code

This template leverages [tsx](https://tsx.is) to allow execution of TypeScript files via NodeJS as if they were written in plain JavaScript.

To execute a file with `tsx`:

```sh
npx tsx ./path/to/the/file.ts
```

## Operations

**Building**

To build the package:

```sh
npm run build
```

**Testing**

To test the package:

```sh
npm run test
```

