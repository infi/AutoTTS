const cp = require("child_process")

const voices = cp.execSync("espeak --voices")

const fs = require("fs")

const languages = voices
    .toString()
    .split("\n")
    .slice(1) // don't need the table title
    .map(x => x.split(" ")[3])
    .filter(y => !!y) // only list true-like values

fs.writeFileSync("langs.json", JSON.stringify(languages, null, 2))

console.log("Wrote to langs.json")