let thirdPartyTransformer = undefined; // Will hold third party transformation module
let ts = undefined; // Will hold typescript's module if /tsconfig.json is available
let fs = require("fs");
const crypto = require("crypto");
let path = require("path");
let slash = path.join("/");
let dynamicClasnames;
// Get the project's directory
let base = "";
base = path.join(__dirname).split(slash);
base = base.slice(0, base.length - 3).join(slash); //Pops base directory leaving out node_modules/import-for-web/lib
// Project must have a package.json file in its base directory
let packageJSON = JSON.parse(fs.readFileSync(path.join(base, "/package.json")));
// Check if project is typescript based
let parseTypescript = null;
try {
  parseTypescript = JSON.parse(
    fs.readFileSync(path.join(base, "/tsconfig.json"))
  );
} catch (error) {
  parseTypescript = null;
}
if (parseTypescript) {
  ts = require("typescript");
}
// project's name
let appName = packageJSON.name;
//
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is generating a unique class ID. It first tries to generate the ID using the SHAKE256
algorithm from the crypto module in JavaScript. If the algorithm is not supported by the platform,
it falls back to generating a random ID using the Math.random() function. */
let uniqueClassID;
try {
  uniqueClassID = crypto
    .createHash("shake256", { outputLength: 2 })
    .update(appName)
    .digest("hex");
} catch (error) {
  //If algorithm not supported by platform, generate randomly
  uniqueClassID = `${Math.random()}`.slice(2, 7);
}
// Project's version
let version = packageJSON.version;
// Resolve the main field of the packaje.json
let main = packageJSON.main.replace(/^(src\/modules\/)/, "dist/modules/");
let mainIndex = path.resolve(base, "./", main);
// All pathnames ending with these file extensions are assumed to be files and not directories
//...And their final path extensions will be `.js`
// if a file's pathmame does not end with any of these extensions, we add `.js` to the destination path in the /dist dir
const fileExtensions = ["js", "jsx", "cjs", "mjs", "ts", "tsx"];
const fileExtensionPattern = /(\.jsx|\.js|\.cjs|\.mjs|\.tsx|\.ts)$/;
/* The code is checking if the file extension of the variable `mainIndex` matches any of the
specified file extensions (.jsx, .js, .cjs, .mjs, .tsx, .ts). If it does not match any of the
specified file extensions, it appends ".js" to the end of `mainIndex`. If it does match one of the
specified file extensions, it replaces the file extension with ".js". */
if (!fileExtensionPattern.test(mainIndex)) {
  mainIndex += ".js";
} else {
  mainIndex = mainIndex.split(".");
  mainIndex[mainIndex.length - 1] = "js";
  mainIndex = mainIndex.join(".");
}
// Map filenames/pathnames to their external pathnames, their dependencies and their dependents
let dependencyMap = {};
let dependencyMap2 = {};
let moduleDependencies = {};
let moduleDependents = {};
// main project's external path to the index module
let modulesDirectoryPath = `/modules/${appName}@${version}`;
// path  to the /src directory
// in this folder, modules of the project are kept in /modules directory
let baseSrc = path.join(base, "/src");
// path  to the /dist directory
// in this folder, parsed and bundled modules of the project are kept in /modules directory
let baseDist = path.join(base, "/dist");
// CSS files in the styles folder are paresd and stored in the src/S_T_Y_L_E folder
let baseS_T_Y_L_E = path.join(baseSrc, "/S_T_Y_L_E");
// CSS files to be imported into the JS/TS files are stored in src/styles
let baseStyles = path.join(baseSrc, "/styles");
// path  to the /dist/modules directory
//will contain parsed and bundled code
let parsedModulesPath = path.join(baseDist, "/modules");
// Starting strings
let unpackWebMap = `{\n`;
let bundleDependencyMap = `{\n`;
let bundleDependentsMap = `{\n`;

let hasExternalDependencies = false;
// keep references of all external packages used in project
let externalRef = {};
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `serverImportsPattern`. This pattern
is used to match a specific comment block in a JavaScript code file. The comment block is expected
to start with `//<@serverImports>` and end with `//</>`. The `s` flag at the end of the regular
expression pattern enables the "dotall" mode, which allows the `.` character to match newline
characters as well. */
const serverImportsPattern = /\/\/<@serverImports>(.*?)\/\/<\/>/s;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `importsPattern`. This pattern is
used to match a specific comment block in a JavaScript code file. The comment block is delimited by
`//<@imports>` and `//</>`. The `s` flag at the end of the regular expression pattern enables the
"dotall" mode, which allows the `.` character to match newline characters as well. */
const importsPattern = /\/\/<@imports>(.*?)\/\/<\/>/s;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `serverPattern`. This pattern is used
to match a specific comment format in JavaScript code. The comment format is `//<@server>...</>`,
where `...` can be any content between the opening and closing tags. The `s` flag at the end of the
regular expression enables the dot (`.`) to match newline characters as well. */
const serverPattern = /\/\/<@server>(.*?)\/\/<\/>/gs;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `clientPattern`. This pattern is used
to match a specific comment format in JavaScript code. The comment format is
`//<@client>...</@client>`, where `...` can be any content between the opening and closing tags. The
`s` flag at the end of the regular expression enables the dot (`.`) to match newline characters as
well. */
const clientPattern = /\/\/<@client>(.*?)\/\/<\/>/gs;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `stylesPattern`. This pattern is used
to match a specific comment format in JavaScript code. The comment format is `//<@styles>...</>`,
where `...` can be any content between the opening and closing tags. The `s` flag at the end of the
regular expression pattern enables the dot (`.`) to match newline characters as well. */
const stylesPattern = /\/\/<@styles>(.*?)\/\/<\/>/s;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `exportPattern`. This pattern is used
to match and identify export statements in JavaScript code. The pattern consists of two parts: */
const exportPattern = /((export\s+default\s+)|(export\s+))/;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `dynamicImportPattern`. This pattern
is used to match and extract dynamic import statements in JavaScript code. Dynamic import statements
are used to load modules or import code from other files at runtime. The pattern matches various
forms of dynamic import statements, including `import()` function calls, `import . from` syntax, and
`import . from` syntax with specific methods like `reloadModule`, `loadModule`, `includesModule`,
`loadPage`, etc. The pattern also matches different types of import paths, including double-quoted
strings, single-quoted strings */
const dynamicImportPattern =
  /\s*\.\s*(((reload|load|includes)Module)|loadPage|import\s*\.\s*from)\s*\(\s*(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `eachImportPattern`. This pattern is
used to match and extract import statements in JavaScript code. The pattern matches the keyword
`import`, followed by one or more whitespace characters, followed by any non-whitespace characters
(which represent the imported module or variable), followed by the keyword `from`, followed by a
string literal enclosed in either double quotes or single quotes (which represents the source of the
import). The `g` flag at the end of the pattern indicates that the pattern should be applied
globally to the input string, allowing multiple matches to be found */
const eachImportPattern = /import\s+(.*?)\s+from\s+(("[^"]*")|('[^']*'))/g;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `pathPattern`. This pattern is used
to match strings enclosed in double quotes, single quotes, or backticks. The `|` operator is used to
specify multiple alternatives within the pattern. The `g` flag is used to perform a global search,
meaning it will find all matches in a given string. The `s` flag is used to enable the "dotall"
mode, which allows the `.` character to match newline characters as well. */
const pathPattern = /(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern called `commentsPattern` in JavaScript. This
pattern is used to match and extract comments in JavaScript code. It can match both single-line
comments starting with `//` and multi-line. The `gs` flags
at the end of the pattern indicate that it should match globally (across multiple lines) and treat
the input as a single string. */
const commentsPattern = /((\/\/(.*?)\n)|(\/\*(.*?)\*\/))/gs;
/**
 * AI GENERATED COMMENTS - (Mintlify)
 * 
 * The code below is defining a regular expression pattern in JavaScript. The pattern is used to match
import statements that use the "as" keyword to alias imported modules or variables. The pattern
matches a valid identifier followed by the "as" keyword and another valid identifier. The "g" flag
is used to perform a global search, and the "s" flag is used to enable the dotall mode, allowing the
pattern to match across multiple lines. */
const importAsStatementPattern =
  /[\$_a-zA-Z][\$_a-zA-Z0-9]*\s+as\s+[\$_a-zA-Z][\$_a-zA-Z0-9]*/gs;

const {
  getBundleMapLine,
  getExternalBundleMapDep,
  getMapLine,
  externalPackage,
  ExtendedBases,
} = require("./helpers").in;
/**
 * The function takes an object with style properties and values, and returns a new object with merged
 * styles for each key.
 * @param o - The parameter `o` is an object that contains key-value pairs. Each key represents a style
 * name, and the corresponding value is an array of style objects.
 * @returns The function `stylesCompilerExe` returns an object `finalResult` which contains the
 * compiled styles.
 */
const stylesCompilerExe = function (o) {
  const keys = Object.keys(o);
  const finalResult = {};
  keys.forEach((key) => {
    const styles = o[key];
    let result = {};
    for (let i = 0; i < styles.length; i++) {
      result = {
        ...result,
        ...styles[i],
      };
    }
    finalResult[key] = result;
  });
  return finalResult;
};
/**
 * The function `buildCSS` takes an object as input and returns a string representing CSS properties
 * and values.
 * @param obj - An object containing CSS property-value pairs.
 * @returns The function `buildCSS` returns a string that represents a CSS block.
 */
function buildCSS(obj) {
  const keys = Object.keys(obj);
  let css = "{",
    key;
  for (let i = 0; i < keys.length; i++) {
    key = keys[i];
    css += `${key}:${obj[key]};`;
  }
  return css + "}";
}

/**
 * The function `parseDependencies` is used to parse the dependencies of a JavaScript code file and
 * transform it into a format that can be used by a bundler or module loader.
 * @param code - The code parameter is a string that represents the JavaScript code that needs to be
 * parsed for dependencies.
 * @param filePath - The file path of the code file that needs to be parsed for dependencies.
 * @param currentDirectory - The current directory is the directory where the code file is located. It
 * is used to resolve the paths of imported modules relative to the current directory.
 * @returns The function `parseDependencies` returns an object with two properties: `code` and
 * `ssrCode`.
 */
function parseDependencies(code, filePath, currentDirectory) {
  // If the filename does not end with any of the file extensions,
  // we append `.js` to it. Else, we update it to `.js`
  if (!fileExtensionPattern.test(filePath)) {
    filePath = filePath + ".js";
  } else {
    filePath = filePath.split(".");
    filePath[filePath.length - 1] = "js";
    filePath = filePath.join(".");
  }
  // Raw filename reletive to the src/modules directory
  let rawFilePath = filePath
    .replace(parsedModulesPath, "")
    .split(slash)
    .join("/");
  // Keep info of all files being processed
  allFiles[allFiles.length - 1].raw = rawFilePath;
  //If is not visited, set up
  if (!moduleDependents[filePath]) {
    moduleDependencies[filePath] = [];
    moduleDependencies[filePath] = [];
  }
  let dependencies = moduleDependencies[filePath];

  let hasDependencies = null;
  //Server imports will only be available in the `.server.js` files
  let serverImports = code.match(serverImportsPattern);
  if (serverImports) {
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is replacing the first occurrence of `serverImports[0]` in the `code` variable
       with an empty string. It then updates the `serverImports` variable by adding a comment
       `//<@server>` at the beginning and removing the `//<@serverImports>` comment from the
       original `serverImports[0]` value. */
    code = code.replace(serverImports[0], "");
    serverImports = `//<@server>\n${serverImports[0].replace(
      "//<@serverImports>",
      ""
    )}\n`;
  } else {
    serverImports = "";
  }
  /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is a JavaScript code snippet. It is checking for a section of code that matches a
   specific pattern (stylesPattern) and extracting it into the styleSection variable. It then checks
   if the styleSection exists and proceeds to process it further. */
  let styleSection = code.match(stylesPattern),
    hasStyles = false;
  let styleSheet = "const S_T_Y_L_E = {\n";
  let styleSpace = "";
  if (styleSection) {
    styleSpace = styleSection[0];
    /**
         * AI GENERATED COMMENTS - (Mintlify)
         * 
         * The code below is using regular expressions to extract import statements from a style
        section in JavaScript code. It replaces any comments in the style section with a space, and
        then matches and extracts each import statement using a specific pattern. */
    let styleImports = styleSection[1]
      .replace(commentsPattern, " ")
      .match(eachImportPattern);
    styleSection = styleSection[1];
    if (styleImports) {
      let styles_file = "",
        line;
      let styleJSON, variableDeclaration, asImpoetUsage;

      for (let i = 0; i < styleImports.length; i++) {
        line = styleImports[i];
        styles_file = line.match(pathPattern)[0];
        variableDeclaration = line
          .replace(styles_file, "")
          .replace("import", "const")
          .replace(/(from\s+)$/, "= ");
        asImpoetUsage = variableDeclaration.match(importAsStatementPattern);
        if (asImpoetUsage) {
          for (let j = 0; j < asImpoetUsage.length; j++) {
            variableDeclaration = variableDeclaration.replace(
              asImpoetUsage[j],
              asImpoetUsage[j].replace(/\sas\s/, " : ")
            );
          }
        }
        styles_file = styles_file.replace(/^./, "").replace(/.$/, "");
        styles_file = `${
          styles_file.endsWith(".ts")
            ? styles_file
            : /(\S+\.[a-zA-Z0-9]+)$/.test(styles_file)
            ? styles_file.replace(/(\.[a-zA-Z]+)$/, ".ts")
            : styles_file + ".ts"
        }`;
        styles_file = path.resolve(
          currentDirectory.replace(baseDist, baseSrc),
          styles_file
        );
        styleJSON = fs.readFileSync(styles_file, "utf8");
        styleJSON = styleJSON.replace(/[^\S]export\s+default\s+/, "");
        variableDeclaration += styleJSON + "\n";
        styleSection = styleSection.replace(line, variableDeclaration);
      }
      let styleMethod = new Function(`
             const HoneyBee = {
                UI:{
                    CreateStyleSheet: ${stylesCompilerExe.toString()},
                }
             };
             const {UI} = HoneyBee;
             const {CreateStyleSheet} = UI;
             ${styleSection}
             return S_T_Y_L_E;
            `);
      let fileCSSJSON = new styleMethod();
      let keys = Object.keys(fileCSSJSON);
      let val = dynamicClasnames.getUniqueVar() + uniqueClassID,
        key;
      for (let i = 0; i < keys.length; i++) {
        key = keys[i];
        styleSheet += `${key}:{\nclass: "${val}-${key}",\nstyle: \`.${val}-${key}${buildCSS(
          fileCSSJSON[key]
        )}\`\n},\n`;
      }
    }
    hasStyles = true;
  }
  styleSheet += `\n}\n`;
  if (hasStyles) {
    code = code.replace(styleSpace, styleSheet);
  }
  // Parse import statements if any
  let declarations = code.match(importsPattern);
  if (declarations) {
    code = code.replace(declarations[0], "");
    // Take commented codes out of import declarations and match each import statement
    declarations = declarations[1]
      .replace(commentsPattern, " ")
      .match(eachImportPattern);
    if (declarations) {
      hasDependencies = [];
      let block,
        variableDeclaration,
        dependencyPath,
        filename,
        external,
        raw,
        sourceFile,
        asImpoetUsage;
      for (let i = declarations.length - 1; i >= 0; i--) {
        block = declarations[i];
        dependencyPath = block.match(pathPattern)[0];
        /* It is replacing the occurrence of a dependency path with an empty string,
               replacing the keyword "import" with "const", and replacing the string "from" at the
               end of a line with an equal sign. */
        variableDeclaration = block
          .replace(dependencyPath, "")
          .replace("import", "const")
          .replace(/(from\s+)$/, "= ");
        asImpoetUsage = variableDeclaration.match(importAsStatementPattern);
        if (asImpoetUsage) {
          for (let j = 0; j < asImpoetUsage.length; j++) {
            variableDeclaration = variableDeclaration.replace(
              asImpoetUsage[j],
              asImpoetUsage[j].replace(/\sas\s/, " : ")
            );
          }
        }
        dependencyPath = dependencyPath.replace(/^./, "").replace(/.$/, "");
        /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if the "module_name" to import starts with a dot `.`. If it does,
       it resolves the dependency path and appends `.js` to it if it doesn't already have a file
       extension. It then adds the dependency path to a dependency map and creates a filename based
       on the dependency path. It also adds the filename to a separate dependency map. It then adds
       the filename to a list of dependencies and sets up the dependent module if it hasn't been
       visited before. Finally, it adds the raw file path to the list of module dependents. */

        // If the "module_name" to import from starts with a dot `.`
        // then it is assumed to be not a module from an external package
        if (/^\./.test(dependencyPath)) {
          dependencyPath = path.resolve(currentDirectory, dependencyPath);
          // If the filename does not end with any of the file extensions,
          // we append `.js` to it. Else, we update it to `.js`
          if (!fileExtensionPattern.test(dependencyPath)) {
            dependencyPath += ".js";
          } else {
            dependencyPath = dependencyPath.split(".");
            dependencyPath[dependencyPath.length - 1] = "js";
            dependencyPath = dependencyPath.join(".");
          }
          if (!dependencyMap[dependencyPath]) {
            raw = dependencyPath
              .replace(parsedModulesPath, "")
              .split(slash)
              .join("/");
            // if the file is referenced as the main entry in the package.json,
            // then it name follows the pattern: `/modules/project_name@version`
            // Else, it follows the pattern: `/modules/project_name@version/raw_filename
            dependencyMap[dependencyPath] = filename =
              dependencyPath == mainIndex
                ? modulesDirectoryPath
                : modulesDirectoryPath + raw;
            dependencyMap2[filename] = dependencyPath;
            unpackWebMap += getMapLine(filename, raw);
          } else {
            filename = dependencyMap[dependencyPath];
            raw = filename.replace(modulesDirectoryPath, "");
          }
          dependencies.push(raw);
          // Setup this dependent module if not ever visited
          if (!moduleDependents[dependencyPath]) {
            moduleDependents[dependencyPath] = [];
            moduleDependencies[dependencyPath] = [];
          }
          if (!moduleDependents[dependencyPath].includes(rawFilePath)) {
            moduleDependents[dependencyPath].push(rawFilePath);
          }
        }
        //External packages imported into application codes
        else {
          /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if a dependency specified by `dependencyPath` exists in the
          `dependencyMap`. If it does not exist, it calls the `externalPackage` function to retrieve
          information about the external package. It then adds the dependency to the `dependencyMap`
          and `dependencyMap2`, and updates the `unpackWebMap` variable with the external package's
          dependency map. It also updates the `moduleDependents` and `moduleDependencies` objects
          with the external package's dependents and dependencies. Finally, it adds the dependency
          to the `dependencies` array and updates the `module */
          if (!dependencyMap[dependencyPath]) {
            external = externalPackage(dependencyPath, base);
            dependencyMap[dependencyPath] = filename = external.packageName;
            dependencyMap2[filename] = external.packagePath;
            unpackWebMap += external.dependencyMap;
            hasExternalDependencies = true;

            moduleDependents = {
              ...external.bundleMap.dependentsMap,
              ...moduleDependents,
            };
            moduleDependencies = {
              ...external.bundleMap.dependencyMap,
              ...moduleDependencies,
            };
            externalRef[dependencyPath] = {
              src: external.packagePath,
              dependents:
                external.bundleMap.dependentsMap[external.packagePath],
            };
          } else {
            filename = dependencyMap[dependencyPath];
          }
          dependencies.push({ external: dependencyPath });
          sourceFile = dependencyMap2[filename];
          moduleDependents[sourceFile].push({ internal: rawFilePath });
        }
        hasDependencies.push(filename);
        variableDeclaration += `I4W.require('${filename}');\n`;
        code = variableDeclaration + code;
      }
    }
  }
  // Parse dynamic import of modules and other inclussion of module path names
  // Modules are dynamically loaded via I4W.loadModule, I4W.loadPage
  // Modules may also be included in our code via I4W.includesModule('module_name') and many others
  let dynamicInclusions = code.match(dynamicImportPattern);
  if (dynamicInclusions) {
    let dependencyPath, block, parsedBlock, filename, external, raw, sourceFile;
    for (let i = 0; i < dynamicInclusions.length; i++) {
      block = dynamicInclusions[i];
      dependencyPath = block.match(pathPattern)[0];
      dependencyPath = dependencyPath.replace(/^./, "").replace(/.$/, "");
      if (/^\./.test(dependencyPath)) {
        dependencyPath = path.resolve(currentDirectory, dependencyPath);
        // If the filename does not end with any of the file extensions,
        // we append `.js` to it. Else, we update it to `.js`
        if (!fileExtensionPattern.test(dependencyPath)) {
          dependencyPath += ".js";
        } else {
          dependencyPath = dependencyPath.split(".");
          dependencyPath[dependencyPath.length - 1] = "js";
          dependencyPath = dependencyPath.join(".");
        }
        if (!dependencyMap[dependencyPath]) {
          raw = dependencyPath
            .replace(parsedModulesPath, "")
            .split(slash)
            .join("/");
          // if the file is referenced as the main entry in the package.json,
          // then it name follows the pattern: `/modules/project_name@version`
          // Else, it follows the pattern: `/modules/project_name@version/raw_filename
          dependencyMap[dependencyPath] = filename =
            dependencyPath == mainIndex
              ? modulesDirectoryPath
              : modulesDirectoryPath + raw;
          dependencyMap2[filename] = dependencyPath;
          unpackWebMap += getMapLine(filename, raw);
        } else {
          filename = dependencyMap[dependencyPath];
          raw = filename.replace(modulesDirectoryPath, "");
        }

        if (!moduleDependents[dependencyPath]) {
          moduleDependents[dependencyPath] = [];
          moduleDependencies[dependencyPath] = [];
        }
        if (!moduleDependents[dependencyPath].includes(rawFilePath)) {
          moduleDependents[dependencyPath].push(rawFilePath);
        }
      }
      //External packages imported dynamically into application codes
      else {
        /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if a dependency path exists in a dependency map. If it does not
        exist, it calls an external package function and adds the dependency path and filename to
        the dependency map. It also updates other maps and variables related to dependencies. If the
        dependency path already exists in the dependency map, it retrieves the filename from the
        map. Finally, it adds an object to the moduleDependents array with the source file and the
        internal rawFilePath. */
        if (!dependencyMap[dependencyPath]) {
          external = externalPackage(dependencyPath, base);
          dependencyMap[dependencyPath] = filename = external.packageName;
          dependencyMap2[filename] = external.packagePath;
          unpackWebMap += external.dependencyMap;
          hasExternalDependencies = true;
          moduleDependents = {
            ...external.bundleMap.dependentsMap,
            ...moduleDependents,
          };
          moduleDependencies = {
            ...external.bundleMap.dependencyMap,
            ...moduleDependencies,
          };
          externalRef[dependencyPath] = {
            src: external.packagePath,
            dependents: external.bundleMap.dependentsMap[external.packagePath],
          };
        } else {
          filename = dependencyMap[dependencyPath];
        }
        sourceFile = dependencyMap2[filename];
        moduleDependents[sourceFile].push({ internal: rawFilePath });
      }

      parsedBlock = block.replace(pathPattern, `'${filename}'`);
      code = code.replace(block, parsedBlock);
    }
  }

  /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if the regular expression `exportPattern` matches any part of the `code`
string. If it does, it replaces the matched part with `"I4W.export_temporal = "`. If the
regular expression does not match, it appends the string `"\nI4W.export_temporal = {}"` to the
`code` string. */
  if (exportPattern.test(code)) {
    code = code.replace(exportPattern, "/*EXPORT*/I4W.export_temporal = ");
  } else {
    code += "\nI4W.export_temporal = {}";
  }

  // Apply third party transformations if any
  if (thirdPartyTransformer) {
    code = thirdPartyTransformer(code);
  } else {
    code = {
      code: code,
      ssrCode: "",
    };
  }

  // If typescript is set up, transpile code into JS
  if (parseTypescript) {
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is transpiling TypeScript code to JavaScript code using the TypeScript compiler
   API. It takes in a `code` object that contains two properties: `code` and `ssrCode`. The `code`
   property represents the client-side code, while the `ssrCode` property represents the server-side
   rendering code. */
    code.code = ts.transpileModule(code.code, {
      compilerOptions: {
        ...tsConfig.compilerOptions,
        emitDeclarationOnly: false,
      },
    }).outputText;

    code.ssrCode = ts.transpileModule(code.ssrCode, {
      compilerOptions: {
        ...tsConfig.compilerOptions,
        emitDeclarationOnly: false,
      },
    }).outputText;
  }

  /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if there are any dependencies (`hasDependencies`) and if so, it
  modifies the `code` and `ssrCode` variables by adding some additional code before and after the
  original code. */
  if (hasDependencies && hasDependencies.length) {
    code.code = `I4W.onload=function(){\n${code.code}`;
    code.ssrCode = `I4W.onload=function(){\n${code.ssrCode}`;
    code.code +=
      "\n//<@client>" +
      "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal=null;" +
      "\n//</>";
    code.ssrCode += "\n//<@server>" + "return I4W.export_temporal;" + "//</>";
    code.code += `\n}`;
    code.ssrCode += `\n}`;
    for (let i = 0; i < hasDependencies.length; i++) {
      code.code = `I4W.include('${hasDependencies[i]}')\n` + code.code;
    }
  } else {
    code.code = `\n//<@client>\n!function(){\n//</>\n${code.code}`;
    code.ssrCode = `\n//<@server>I4W.onload=function(){//</>\n${code.ssrCode}`;
    code.code +=
      "\n//<@client>" +
      "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal = null;" +
      "\n//</>";
    code.ssrCode += "\n//<@server>" + "return I4W.export_temporal;" + "//</>";
    code.code += `\n//<@client>\n}();\n//</>`;
    code.ssrCode += `\n//<@server>}//</>`;
  }
  let pathname, raw;
  if (!dependencyMap[filePath]) {
    // if the file is referenced as the main entry in the package.json,
    // then it name follows the pattern: `/modules/project_name@version`
    // Else, it follows the pattern: `/modules/project_name@version/raw_filename
    dependencyMap[filePath] = pathname =
      filePath == mainIndex
        ? modulesDirectoryPath
        : modulesDirectoryPath + rawFilePath;
    dependencyMap2[pathname] = filePath;
    unpackWebMap += getMapLine(pathname, rawFilePath);
  } else {
    pathname = dependencyMap[filePath];
  }
  bundleDependencyMap += `${getBundleMapLine(rawFilePath, dependencies)}\n`;
  code.code = `I4W.pathname = '${pathname}';\n${code.code}`;
  code.ssrCode = `I4W.pathname = '${pathname}';\n${code.ssrCode}`;
  code.ssrCode = `${serverImports}\n//<@server>module.exports = function(HoneyBee){const I4W = HoneyBee.UI._imex;//</>\n${code.ssrCode}`;
  code.ssrCode += `\n//<@server>}//</>`;

  /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is removing client-specific code from server code and vice versa. It uses regular
  expressions to find and replace specific patterns in the code. It first removes server-specific
  code from the client code by replacing it with an empty string. Then it removes client-specific
  code from the server code by replacing it with an empty string. Finally, it extracts the
  server-only code and client-only code from the modified server and client code respectively, and
  replaces the corresponding patterns with the extracted code. */
  code.code = code.code.replace(serverPattern, "");
  code.ssrCode = code.ssrCode.replace(clientPattern, "");
  let serverOnly = code.ssrCode.match(serverPattern);
  if (serverOnly) {
    let a;
    for (let i = 0; i < serverOnly.length; i++) {
      a = serverOnly[i].replace("//<@server>", "").replace("//</>", "");
      code.ssrCode = code.ssrCode.replace(serverOnly[i], a);
    }
  }
  let clientOnly = code.code.match(clientPattern);
  if (clientOnly) {
    let a;
    for (let i = 0; i < clientOnly.length; i++) {
      a = clientOnly[i].replace("//<@client>", "").replace("//</>", "");
      code.code = code.code.replace(clientOnly[i], a);
    }
  }
  return code;
}

//TODO: Use user provided config object from tsconfig.json
//TypeScript config
const tsConfig = {
  compilerOptions: {
    target: "es5",
    module: "commonjs",
    allowJS: true,
    declaration: true,
    strict: true,
  },
};

let allFiles = [];
/**
 * The function `parseSubDirectory` recursively parses a directory and its subdirectories, creating a
 * new directory structure and parsing JavaScript files while ignoring other file types.
 * @param directory - The `directory` parameter is the path to the directory that you want to parse. It
 * represents the source directory where the files and subdirectories are located.
 * @param distDirectory - The `distDirectory` parameter is the destination directory where the parsed
 * files will be saved.
 */
function parseSubDirectory(directory, distDirectory) {
  let directories = fs.readdirSync(directory, "utf-8");
  // try creating directory if not exist else ignore error
  try {
    fs.mkdirSync(distDirectory);
  } catch (error) {}
  let item, code, resultPath, source;
  for (let i = 0; i < directories.length; i++) {
    source = directories[i];
    item = source.split(".");
    if (fileExtensions.includes(item[item.length - 1])) {
      //Assumed as a file to be parsed
      item[item.length - 1] = "js";
      item = item.join(".");
      resultPath = path.join(distDirectory, item);
      allFiles.push({ path: resultPath, raw: "" });
      code = fs.readFileSync(path.join(directory, source), "utf-8");
      code = parseDependencies(code, resultPath, distDirectory);
      fs.writeFileSync(resultPath, code.code);
      if (code.ssrCode) {
        fs.writeFileSync(resultPath + ".server.js", code.ssrCode);
      }
    } else {
      //Assumed to be a directory
      parseSubDirectory(
        path.join(directory, source),
        path.join(distDirectory, source)
      );
    }
  }
}

/**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is defining a regular expression pattern in JavaScript. The pattern is used to match
CSS style lines in a string. */
const cssStyleLinePattern = /[a-z\-_][a-zA-Z\-_]*\s*:(.*?)(;|\})/gs;
/**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is defining a regular expression pattern called `cssStyleBlock`. This pattern is used
to match CSS style blocks in a string of CSS code. The pattern matches a class selector followed by
optional whitespace, followed by an opening curly brace, followed by any characters (including
newlines) until a closing curly brace is found. The `s` flag at the end of the pattern allows the
dot (`.`) to match newline characters as well. The `g` flag allows the pattern to match multiple
occurrences in the input string. */
const cssStyleBlock = /\.[a-zA-Z\-_]+\s*\{(.*?)\}/gs;
/**
 * The function `parseStylesDirectory` creates a new directory, reads the contents of an old directory,
 * and copies each file from the old directory to the new directory.
 * @param old_dir - The `old_dir` parameter is the path to the directory containing the styles files
 * that you want to parse and copy.
 * @param new_dir - The `new_dir` parameter is the directory path where the parsed styles will be
 * copied to.
 * @param callback - The `callback` parameter is a function that will be called once the
 * `parseStylesDirectory` function has finished processing all the files in the directory.
 */
function parseStylesDirectory(old_dir, new_dir, callback) {
  try {
    fs.mkdirSync(new_dir);
  } catch (error) {}
  const contents = fs.readdirSync(old_dir, "utf8");
  let i = -1;
  const copyCallback = function () {
    i++;
    if (i < contents.length) {
      parseStyles(
        path.join(old_dir, "/", contents[i]),
        path.join(new_dir, "/", contents[i]),
        copyCallback
      );
    } else {
      callback();
    }
  };
  copyCallback();
}
/**
 * The function `parseStyles` reads the content of a file, parses it using a style parser, and writes
 * the parsed content to a new file.
 * @param old_dir - The `old_dir` parameter represents the directory path of the file that needs to be
 * parsed.
 * @param new_dir - The `new_dir` parameter is the directory path where the parsed styles will be
 * saved.
 * @param callback - The `callback` parameter is a function that will be called after the styles have
 * been parsed and written to the new directory. It can be used to perform any additional tasks or
 * actions that need to be done after the parsing is complete.
 * @returns The function does not explicitly return anything.
 */
function parseStyles(old_dir, new_dir, callback) {
  let content;
  try {
    content = fs.readFileSync(old_dir, "utf8");
  } catch (error) {
    parseStylesDirectory(old_dir, new_dir, callback);
    return;
  }
  new_dir = new_dir.split(".");
  new_dir.pop();
  new_dir.push("ts");
  fs.writeFileSync(new_dir.join("."), styleParser(content));
  callback();
}

/**
 * The function `styleParser` takes a CSS stylesheet as input and converts it into a JavaScript object.
 * @param styleSheet - The `styleSheet` parameter is a string that represents a CSS stylesheet.
 * @returns a string that represents a JavaScript object. The object contains the parsed styles from
 * the input styleSheet. The styles are organized by class names, with each class name as a key and its
 * corresponding style properties as values. The returned string is in the format of a default export
 * statement in JavaScript.
 */
function styleParser(styleSheet) {
  //Strip out comments
  styleSheet = styleSheet.replace(/\/\*(.*?)\*\//gs, " ");
  //Match style blocks
  const blocks = styleSheet.match(cssStyleBlock);
  if (blocks) {
    let block = "",
      lines,
      line;
    if (blocks) {
      let parsedBlock = "",
        className;
      for (let i = 0; i < blocks.length; i++) {
        parsedBlock = block = blocks[i];
        lines = block.match(cssStyleLinePattern);
        if (lines) {
          for (let j = 0; j < lines.length; j++) {
            line = lines[j];
            if (line.endsWith("}")) {
              parsedBlock = parsedBlock.replace(
                line,
                `"${line
                  .replace(":", '": "')
                  .replace(/;/g, "")
                  .replace(/}$/gs, "")}"}`
              );
            } else {
              parsedBlock = parsedBlock.replace(
                line,
                `"${line.replace(":", '": "').replace(/;/g, "")}",`
              );
            }
          }
        }
        className = parsedBlock
          .match(/\.[a-zA-Z\-_]+\s*\{/g)[0]
          .replace(".", '"')
          .replace("{", '": {');
        styleSheet = styleSheet.replace(
          block,
          `${parsedBlock.replace(/\.[a-zA-Z\-_]+\s*\{/, className)},\n`
        );
      }
    }
  }

  return ` export default {\n${styleSheet}}`;
}

module.exports = exports = {
  baseDirectory: base,
  /**
   * The function creates directories for styles and parses the styles directory.
   */
  parseStylesDirectory() {
    try {
      fs.mkdirSync(baseDist);
      fs.mkdirSync(baseS_T_Y_L_E);
      fs.mkdirSync(baseStyles);
    } catch (error) {}
    parseStylesDirectory(baseStyles, baseS_T_Y_L_E, function () {});
  },
  /**
     * AI GENERATED COMMENTS - (Mintlify)
     * 
     * The code below is a JavaScript function called `parseModules()`. It performs several tasks
    related to parsing and organizing modules in a project. */
  parseModules() {
    /**
         * AI GENERATED COMMENTS - (Mintlify)
         * 
         * The code below is creating a new instance of the `ExtendedBases` class and assigning it to
        the `dynamicClasnames` variable. */
    dynamicClasnames = new ExtendedBases();
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is reading and parsing the contents of a package.json file. It uses the fs
       module to read the file and the JSON.parse() function to parse the contents into a JavaScript
       object. */
    packageJSON = JSON.parse(fs.readFileSync(path.join(base, "/package.json")));
    parseTypescript = null;
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is attempting to read and parse the contents of a file called "tsconfig.json"
       using the fs module in Node.js. It first checks if the file exists and if it does, it reads
       the contents of the file and attempts to parse it as JSON. If the parsing is successful, the
       parsed JSON object is assigned to the variable "parseTypescript". If the file does not exist
       or if there is an error during the parsing process, the variable "parseTypescript" is set to
       null. */
    try {
      parseTypescript = JSON.parse(
        fs.readFileSync(path.join(base, "/tsconfig.json"))
      );
    } catch (error) {
      parseTypescript = null;
    }
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if the variable `parseTypescript` is truthy. If it is, it requires
       the `typescript` module and assigns it to the variable `ts`. */
    if (parseTypescript) {
      ts = require("typescript");
    }
    appName = packageJSON.name;
    version = packageJSON.version;
    main = packageJSON.main.replace(/^(src\/modules\/)/, "dist/modules/");
    /**
    * AI GENERATED COMMENTS - (Mintlify)
    * 
    * The code below is checking if the file extension of the variable `mainIndex` matches the
       pattern `fileExtensionPattern`. If it does not match, it appends the file extension ".js" to
       `mainIndex`. If it does match, it splits `mainIndex` by "." and replaces the last element
       with "js", then joins the elements back together to form `mainIndex`. */
    mainIndex = path.resolve(base, "./", main);
    if (!fileExtensionPattern.test(mainIndex)) {
      mainIndex += ".js";
    } else {
      mainIndex = mainIndex.split(".");
      mainIndex[mainIndex.length - 1] = "js";
      mainIndex = mainIndex.join(".");
    }
    /**
         * AI GENERATED COMMENTS - (Mintlify)
         * 
         * The code below is assigning a value to the variable `modulesDirectoryPath`. The value is a
        string that represents a directory path. The directory path is constructed using the
        template literal syntax, which allows for the interpolation of variables within a string.
        The directory path includes the variables `appName` and `version`, which are expected to be
        defined elsewhere in the code. The directory path is constructed by concatenating the string
        "/modules/" with the values of `appName` and `version`, separated by the "@" symbol. */
    modulesDirectoryPath = `/modules/${appName}@${version}`;

    dependencyMap = {};
    dependencyMap2 = {};
    moduleDependencies = {};
    moduleDependents = {};
    unpackWebMap = `{\n`;
    bundleDependencyMap = `{\n`;
    bundleDependentsMap = `{\n`;
    hasExternalDependencies = false;
    externalRef = {};
    parseSubDirectory(
      path.join(baseSrc, "/modules"),
      path.join(baseDist, "/modules")
    );

    // Create the i4w.map file
    // This file is needed to map the generated module paths to their actual paths.
    fs.writeFileSync(
      path.join(base, "/i4w.map.js"),
      `const path = require('path');\n` +
        (hasExternalDependencies
          ? `const { getDependencyMap } = require('import-for-web')\nconst dirname = path.dirname(__filename)\n`
          : "") +
        `module.exports =() => (\n${unpackWebMap}})`
    );

    // Build and create the i4w.bundle.map file
    // This file is used by I4W during code bundling
    for (let i = 0; i < allFiles.length; i++) {
      bundleDependentsMap += `${getBundleMapLine(
        allFiles[i].raw,
        moduleDependents[allFiles[i].path] || []
      )}\n`;
    }
    for (let i in externalRef) {
      bundleDependentsMap += `${getExternalBundleMapDep(
        i,
        externalRef[i].dependents || []
      )}\n`;
    }
    bundleDependencyMap += "}";
    bundleDependentsMap += "}";
    fs.writeFileSync(
      path.join(base, "/i4w.bundle.map.js"),
      `const path = require('path')\n` +
        `const { getPath } = require('import-for-web')\n` +
        `const deps = {value:{dependencyMap:{},dependentsMap:{}}};\n const Map1 = \n${bundleDependencyMap}\nconst Map2 = ${bundleDependentsMap}\n` +
        `deps.value.dependencyMap = {\n  ...deps.value.dependencyMap, ...Map1\n}\n` +
        `deps.value.dependentsMap = {\n  ...deps.value.dependentsMap, ...Map2\n}\n` +
        `module.exports = deps.value`
    );
    let baseContents = fs.readdirSync(base, "utf8"),
      fileContent,
      pagePath;

    /**Parse dynamic index pages
         * 
         * AI GENERATED COMMENTS - (Mintlify)
         * 
         * The code below is a JavaScript loop that iterates over an array called `baseContents`. It
        checks if each element in the array ends with either ".page.html" or ".page.htm"
        (case-insensitive). If the condition is true, it reads the contents of the file using the
        `fs.readFileSync` method and splits the content into two parts using the comment `<!--LEAVE
        THIS COMMENT UNTOUCHED-->` as the separator. */
    for (let i = 0; i < baseContents.length; i++) {
      if (
        baseContents[i].toLowerCase().endsWith(".page.html") ||
        baseContents[i].toLowerCase().endsWith(".page.htm")
      ) {
        fileContent = fs.readFileSync(
          (pagePath = path.join(base, "/", baseContents[i])),
          "utf8"
        );
        fileContent = fileContent.split("<!--LEAVE THIS COMMENT UNTOUCHED-->");
        if (fileContent.length == 2) {
          fs.writeFileSync(
            pagePath.replace(/((html)|(htm))$/, "js"),
            `/**` +
              `\n*` +
              `\n* @param {{isSSR:boolean}} HoneyBee` +
              `\n* @param {keyof import('./i4w.map')} source` +
              `\n* @param {*} DATA` +
              `\n* @returns {[string, string]}` +
              `\n*/` +
              `\nmodule.exports = (HoneyBee,source,PAGEDATA)=>[\n\`${fileContent[0]}\`,\`${fileContent[1]}\`\n]`
          );
        }
      }
    }
    /**
         * AI GENERATED COMMENTS - (Mintlify)
         * 
         * The code below is returning an object that contains two properties: "packageJSON" and
        "dependencyMap". The "packageJSON" property is an object that contains the "name" and
        "version" properties from the "packageJSON" object. The "dependencyMap" property is a
        reference to the "dependencyMap" object. */
    return {
      packageJSON: {
        name: packageJSON.name,
        version: packageJSON.version,
      },
      dependencyMap: dependencyMap,
    };
  },
  /**
   * Transform the code before it is saved.
   * @param {(code:string)=>{ssrCode:string,code:string}} fn A method that is passed the code for other third-party transformations.
   * Third-party transformations must not remove comments from the returned strings. `fn` must return an object with `code` and
   * `ssrCode` fields set to their respective string values.
   * Call `transform(fn)` before parsing or bundling starts.
   */
  transform(fn) {
    thirdPartyTransformer = fn;
  },
};
