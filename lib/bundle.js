const fs = require("fs");
let terser = require("terser");
const parse = require("./parse").parseModules;
const path = require("path");
let slash = path.join("/");
let base = path.join(__dirname).split(slash);
base = base.slice(0, base.length - 3).join(slash); //Pops base directory leaving out node_modules/import-for-web/lib
let dependencyMap, dependentsMap;
let packageJSON = {};
let visted = {};
let count = 0;
let internal_import = undefined;
let clientDependencyMap = {};

/**
 * The function `Concantenate` concatenates JavaScript files and their dependencies into a single
 * bundle.
 * @param source - The `source` parameter is a string that represents the main file or module that you
 * want to concatenate with its dependencies.
 * @param dependencies - The `dependencies` parameter is an array that contains the names of the files
 * that the `source` file depends on. These files are required to be concatenated with the `source`
 * file.
 * @returns the array of independent modules.
 */
function Concantenate(source, dependencies) {
  let independentModules = [];
  if (!visted[source]) {
    visted[source] = 1;
  } else {
    return visted[source];
  }
  let file,
    dependents,
    adders = [];
  /* The code snippet is iterating over the `dependencies` array and checking if each file has any
    dependents in the `dependentsMap`. If a file has only one dependent, it is added to the `adders`
    array and its dependencies are recursively concatenated using the `Concantenate` function. If a
    file has multiple dependents, it is added to the `independentModules` array along with its
    dependencies concatenated using the `Concantenate` function. */
  for (let i = 0; i < dependencies.length; i++) {
    file = dependencies[i];
    if ((dependents = dependentsMap[file])) {
      if (dependents.length == 1) {
        adders.push(file);
        independentModules.push(
          ...Concantenate(file, dependencyMap[file] || [])
        );
      } else {
        independentModules.push(
          file,
          ...Concantenate(file, dependencyMap[file] || [])
        );
      }
    }
  }
  visted[source] = independentModules = Array.from(new Set(independentModules));
  // External packages are already bundled. Bundle only files for this package
  if (
    clientDependencyMap[source] &&
    clientDependencyMap[source].includes(
      `/modules/${packageJSON.name}@${packageJSON.version}`
    )
  ) {
    let s = "";
    /* The code snippet is iterating over the `independentModules` array, which contains the names
        of the files that are not directly dependent on the `source` file. For each file in
        `independentModules`, it checks if the file is not included in the `dependencies` array. If
        the file is not a dependency of the `source` file, it adds a line of code to the `s` string. */
    for (let i = 0; i < independentModules.length; i++) {
      if (!dependencies.includes(independentModules[i])) {
        s += `\nI4W.include('${clientDependencyMap[independentModules[i]]}')`;
      }
    }
    /* The code snippet `if (s) { ... }` is checking if the variable `s` is not empty. If `s` is
        not empty, it means that there are files in the `independentModules` array that are not
        included in the `dependencies` array. */
    if (s) {
      s = `\nI4W.pathname='${packageJSON.name}-v${
        packageJSON.version
      }-${internal_import}-${++count}';${s}`;
      s += `\nI4W.onload=function(){I4W.export={}};`;
    }
    let actualSrc = source,
      content = "";
    fs.writeFileSync((source = source + ".bundle.js"), s);
    /* The code snippet is iterating over the `adders` array, which contains the names of files
        that have only one dependent. For each file in `adders`, it reads the content of the file
        with `fs.readFileSync`, appends a newline character to the content, and then appends the
        content to the `source` file using `fs.appendFileSync`. It also adds the content to the `s`
        string. This process is repeated for each file in the `adders` array. */
    for (let i = 0; i < adders.length; i++) {
      content = fs.readFileSync(adders[i] + ".bundle.js", "utf8") + "\n";
      fs.appendFileSync(source, content);
      s += content;
      content = "";
    }
    content = fs.readFileSync(actualSrc);
    fs.appendFileSync(source, content);
    s += content;
    content = "";
    /* The `terser.minify()` function is used to minify the JavaScript code stored in the `s`
       variable. */
    let min = terser.minify(s, {
      sourceMap: {
        filename: `/module_map${clientDependencyMap[actualSrc]}`,
        url: `/module_map${clientDependencyMap[actualSrc]}`,
      },
      compress: {
        arrows: false,
        keep_infinity: true,
        passes: 1,
      },
      format: {
        comments: false,
        ie8: true,
        safari10: true,
        webkit: true,
        quote_style: 0,
      },
      mangle: {},
    });
    s = "";
    min
      .then(function (value) {
        /* The code snippet `fs.writeFileSync((actualSrc + '.min.js'), value.code)` is writing the
           minified JavaScript code to a file with the extension `.min.js`. */
        fs.writeFileSync(actualSrc + ".min.js", value.code);
        /* This code snippet is manipulating the source map generated by the `terser.minify()`
           function. */
        value.map = JSON.parse(value.map);
        value.map.sources[0] = `/module_mapsrc${clientDependencyMap[actualSrc]}`;
        value.map = JSON.stringify(value.map);
        /* `fs.writeFileSync((actualSrc + '.map'), value.map);` is writing the source map generated
            by the `terser.minify()` function to a file with the extension `.map`. The source map is
            a JSON file that maps the minified code back to the original source code, allowing for
            easier debugging and understanding of the minified code. */
        fs.writeFileSync(actualSrc + ".map", value.map);
      })
      .catch(function (err) {
        console.log(err);
        throw new Error("Faced problems while minifying code");
      });
  }

  return independentModules;
}

/**
 * Bundle the files in the `dist/modules` folder.
 */
module.exports = function () {
  packageJSON = parse();
  clientDependencyMap = packageJSON.dependencyMap;
  packageJSON = packageJSON.packageJSON;
  const depMap = require(base + "/i4w.bundle.map.js");
  dependencyMap = depMap.dependencyMap;
  dependentsMap = depMap.dependentsMap;
  visted = {};
  count = 0;
  internal_import = Date.now();
  for (let file in dependencyMap) {
    Concantenate(file, dependencyMap[file]);
  }
};
