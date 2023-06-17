#! /usr/bin/env node
let I4W = require("../index");

const argv = process.argv.slice(2);
if (argv.length != 1||!["parse","bundle"].includes(argv[0])) {
    throw new Error("Command not found!.\nPlease use 'npx i4w parse' to convert your import statements and 'npx i4w bundle' to bundle your modules.")
}
switch (argv[0]) {
    case "parse":
        I4W.parseModules();
        break;
    case "bundle":
        I4W.bundle();
        break;
}
process.exit(0);

