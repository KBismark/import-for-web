const fs = require("fs");
const path = require("path");
let slash = path.join("/");

/**
 * The function `getDependencyMap` retrieves the dependency map for a given package name and base
 * directory.
 * @param packageName - The `packageName` parameter is a string that represents the name of the package
 * for which you want to get the dependency map.
 * @param base - The `base` parameter is the base directory path where the `node_modules` folder is
 * located.
 * @returns the result of calling the function `require(mapPath)()`.
 */
function getDependencyMap(packageName, base) {
  let packagePath = path.join(base, "/node_modules/", packageName);
  let mapPath = path.join(packagePath, "/i4w.map.js");
  let exists = fs.existsSync(mapPath);
  if (!exists) {
    base = base.split(slash);
    if (base.length == 1) {
      throw new Error(
        `Can't find module "${packageName}". Try 'npm install ${packageName}'`
      );
    }
    base.pop();
    return getDependencyMap(packageName, base.join(slash));
  }
  return require(mapPath)();
}
/**
 * The function `getPath` takes in various parameters and returns the path of a package/module in a
 * Node.js project.
 * @param packageName - The name of the package/module you want to get the path for.
 * @param base - The `base` parameter represents the base directory path where the module is located.
 * @param deps - deps is an object that contains two properties: dependencyMap and dependentsMap. These
 * properties are used to keep track of the dependencies and dependents of the packages being
 * processed.
 * @param hasExt - A boolean value indicating whether the package name already has a file extension
 * (e.g., ".js") or not.
 * @param actualPackage - The `actualPackage` parameter represents the name of the package that is
 * being searched for. It is used to determine the path to the package's main file.
 * @returns the `packagePath` variable, which is the path to the specified package.
 */
function getPath(packageName, base, deps, hasExt, actualPackage) {
  let packagePath;
  if (!hasExt) {
    let subPath = path.join(packageName).split(slash);
    if (subPath.length > 1) {
      actualPackage = subPath.shift();
      subPath = subPath.join("/");
      if (!/(\.jsx|\.js|\.cjs|\.mjs|\.tsx|\.ts)$/.test(packageName)) {
        subPath += ".js";
      } else {
        subPath = subPath.split(".");
        subPath[subPath.length - 1] = "js";
        subPath = subPath.join(".");
      }

      subPath = subPath.replace(/^(src\/modules)/, "/dist/modules");
      packageName = path.join(actualPackage, subPath);
    } else {
      let packageMain, dps;
      actualPackage = actualPackage || packageName;
      try {
        packageMain = fs.readFileSync(
          path.join(base, "/node_modules/", actualPackage, "/package.json"),
          "utf-8"
        );
        dps = require(path.join(
          base,
          "/node_modules/",
          actualPackage,
          "/i4w.bundle.map.js"
        ));
        deps.value = {
          dependencyMap: {
            ...dps.dependencyMap,
            ...deps.value.dependencyMap,
          },
          dependentsMap: {
            ...dps.dependentsMap,
            ...deps.value.dependentsMap,
          },
        };
      } catch (error) {
        base = base.split(slash);
        if (base.length == 1) {
          throw new Error(
            `Can't find module "${actualPackage}". Try 'npm install ${actualPackage}'`
          );
        }
        base.pop();
        return getPath(
          packageName,
          base.join(slash),
          deps,
          false,
          actualPackage
        );
      }
      packageMain = JSON.parse(packageMain).main;
      packageName = packageName + "/" + packageMain;
    }
    packagePath = path.join(base, "/node_modules/", packageName);
    hasExt = true;
  } else {
    packagePath = path.join(base, "/node_modules/", packageName);
  }
  let exists = fs.existsSync(packagePath);
  if (!exists) {
    base = base.split(slash);
    if (base.length == 1) {
      throw new Error(
        `Can't find module "${actualPackage}". Try 'npm install ${actualPackage}'`
      );
    }
    base.pop();
    return getPath(packageName, base.join(slash), deps, true, actualPackage);
  }
  return packagePath;
}

/**
 * The function `getMapLine` returns a string that represents a mapping between a key and a value,
 * where the value is a path joined with a directory name and a given value.
 * @param key - The `key` parameter is a string that represents the key of a mapping in a map object.
 * @param value - The `value` parameter is a string representing the path to a file or directory.
 * @returns a string that concatenates the key and value parameters with some additional formatting.
 * The key is being converted to a JSON string using JSON.stringify(), and the value is being
 * concatenated with the path.join() function. The resulting string is then returned.
 */
function getMapLine(key, value) {
  return `  ${JSON.stringify(
    key
  )}: path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(value)}),\n`;
}
/**
 * The function `getBundleMapLine` generates a line of code that maps a key to an array of file paths,
 * either by joining the key with a list of values or by calling a function to get the path from an
 * external source.
 * @param key - The `key` parameter is a string that represents the key for the bundle map line.
 * @param values - The `values` parameter is an array of objects or strings. Each element in the array
 * represents a value that will be used in the generated code.
 * @returns The function `getBundleMapLine` returns a string that represents a line of code.
 */
function getBundleMapLine(key, values) {
  let s = "[",
    l = values.length,
    lst = l - 1,
    val;
  for (let i = 0; i < l; i++) {
    val = values[i];
    if (val.external) {
      s += `\n  getPath('${val.external}',path.join(\`\${__dirname}\`),deps)${
        i == lst ? "" : ","
      }`;
    } else {
      s += `\n  path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(
        values[i]
      )})${i == lst ? "" : ","}`;
    }
  }
  s += l ? "\n]" : "]";
  return `  [\`\${path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(
    key
  )})}\`]: ${s},\n`;
}
/**
 * The function `getExternalBundleMapDep` generates a string representation of an external bundle map
 * dependency in JavaScript.
 * @param key - The `key` parameter is a string that represents the key for the external bundle map
 * dependency.
 * @param values - An array of objects representing external dependencies. Each object has the
 * following properties:
 * @returns a string that represents an array of external bundle map dependencies.
 */
function getExternalBundleMapDep(key, values) {
  let s = "[",
    l = values.length,
    lst = l - 1,
    val,
    packageName = path.join(key).split(slash).shift();
  let map = "{value:{dependencyMap:{},dependentsMap:{}}}";
  for (let i = 0; i < l; i++) {
    val = values[i];
    if (val.internal) {
      s += `\n  path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(
        val.internal
      )})${i == lst ? "" : ","}`;
    } else {
      val = "~" + val;
      val = val.replace(RegExp(`~(.*?)${packageName}`), "");
      s += `\n  getPath('${
        packageName + val.split(slash).join("/")
      }',path.join(\`\${__dirname}\`),${map})${i == lst ? "" : ","}`;
    }
  }
  s += l ? "\n]" : "]";
  return `  [\`\${getPath('${key}',path.join(\`\${__dirname}\`),${map})}\`]: ${s},\n`;
}

/**
 * The function `externalPackage` is used to retrieve information about an external package, such as
 * its name, path, bundle map, and dependency map.
 * @param packageName - The name of the package you want to include or access.
 * @param base - The `base` parameter is the base directory path where the external package is located.
 * @param subPath - The `subPath` parameter is a string that represents the sub-path within the
 * package. It is used to specify a specific file or directory within the package. If `subPath` is
 * provided, it will be appended to the package path.
 * @param ignoreSub - The `ignoreSub` parameter is a boolean flag that determines whether to ignore the
 * `subPath` parameter. If `ignoreSub` is `true`, the `subPath` parameter will be set to `undefined`
 * and not used in the function. If `ignoreSub` is `false`
 * @returns an object with the following properties:
 */
function externalPackage(packageName, base, subPath, ignoreSub) {
  if (!subPath && !ignoreSub) {
    subPath = path.join(packageName).split(slash);
    packageName = subPath.shift();
    if (subPath.length) {
      subPath = "/" + subPath.join("/");
      if (!/(\.jsx|\.js|\.cjs|\.mjs|\.tsx|\.ts)$/.test(subPath)) {
        subPath += ".js";
      } else {
        subPath = subPath.split(".");
        subPath[subPath.length - 1] = "js";
        subPath = subPath.join(".");
      }
      subPath = subPath.replace(/^(\/src\/modules)/, "");
      if (!subPath.length) {
        ignoreSub = true;
        subPath = undefined;
      }
    } else {
      ignoreSub = true;
      subPath = undefined;
    }
  }
  let packagePath = path.join(base, "/node_modules/", packageName);
  let packageJSON;
  try {
    packageJSON = fs.readFileSync(path.join(packagePath, "/package.json"));
  } catch (error) {
    base = base.split(slash);
    if (base.length == 1) {
      throw new Error(
        `Can't find module "${packageName}". Try 'npm install ${packageName}'`
      );
    }
    base.pop();
    return externalPackage(packageName, base.join(slash), subPath, ignoreSub);
  }
  packageJSON = JSON.parse(packageJSON);
  let version = packageJSON.version;
  let mainPackageFile = path.join(
    packagePath,
    subPath ? "/dist/modules" + subPath : "/" + packageJSON.main
  );
  if (subPath) {
    return {
      packageName: `/modules/${packageName}@${version}${subPath}`,
      packagePath: mainPackageFile,
      bundleMap: require(path.join(packagePath, "/i4w.bundle.map.js")),
      dependencyMap:
        `  '/modules/${packageName}@${version}${subPath}': ` +
        `getDependencyMap('${packageName}', \`\${dirname}\`)['/modules/${packageName}@${version}${subPath}'],\n`,
    };
  }
  return {
    packageName: `/modules/${packageName}@${version}`,
    packagePath: mainPackageFile,
    bundleMap: require(path.join(packagePath, "/i4w.bundle.map.js")),
    dependencyMap: `  ...getDependencyMap('${packageName}',\`\${dirname}\`),\n`,
  };
}

/* The ExtendedBases class generates unique CSS variable names based on a set of characters. */
class ExtendedBases {
  CSSVARCHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  CSSCURSOR1;
  CSSCURSOR2;
  CSSCURSOR3;
  CSSCURSOR4;
  CSSCURSOR5;
  VARLENGTH;
  TOTAL;
  constructor() {
    this.CSSCURSOR1 = -1;
    this.CSSCURSOR2 = 0;
    this.CSSCURSOR3 = -1;
    this.CSSCURSOR4 = -1;
    this.CSSCURSOR5 = -1;
    this.VARLENGTH = 0;
    this.TOTAL = 0;
  }
  /**
   * The function `getUniqueVar()` generates unique CSS variable names based on the length of the
   * variable name.
   * @returns The function `getUniqueVar()` returns a unique variable based on the value of
   * `VARLENGTH`. The returned variable is a combination of characters from the `CSSVARCHARS` array.
   * The length of the returned variable depends on the value of `VARLENGTH`.
   */
  getUniqueVar() {
    switch (this.VARLENGTH) {
      case 0:
        if (this.CSSCURSOR1 == 61) {
          this.VARLENGTH++;
        }
        return this.CSSCURSOR1++, `${this.CSSVARCHARS[this.CSSCURSOR1]}`;
      case 1:
        if (this.CSSCURSOR2 == 61 && this.CSSCURSOR3 == 61) {
          this.VARLENGTH++;
          this.CSSCURSOR2 = 0;
          this.CSSCURSOR3 = 0;
          this.CSSCURSOR4 = -1;
        } else if (this.CSSCURSOR3 == 61) {
          this.CSSCURSOR2++;
          this.CSSCURSOR3 = -1;
        }
        break;
      case 2:
        if (
          this.CSSCURSOR2 == 61 &&
          this.CSSCURSOR3 == 61 &&
          this.CSSCURSOR4 == 61
        ) {
          this.VARLENGTH++;
          this.CSSCURSOR2 = 0;
          this.CSSCURSOR3 = 0;
          this.CSSCURSOR4 = 0;
          this.CSSCURSOR5 = -1;
        } else if (this.CSSCURSOR3 == 61 && this.CSSCURSOR4 == 61) {
          this.CSSCURSOR2++;
          this.CSSCURSOR3 = 0;
          this.CSSCURSOR4 = -1;
        } else if (this.CSSCURSOR4 == 61) {
          this.CSSCURSOR3++;
          this.CSSCURSOR4 = -1;
        }
        break;
      case 3:
        if (
          this.CSSCURSOR2 == 61 &&
          this.CSSCURSOR3 == 61 &&
          this.CSSCURSOR4 == 61 &&
          this.CSSCURSOR5 == 61
        ) {
          this.VARLENGTH++;
          this.CSSCURSOR2 = -1;
          this.CSSCURSOR3 = -1;
          this.CSSCURSOR4 = -1;
          this.CSSCURSOR5 = -1; //add sixth variable
        } else if (
          this.CSSCURSOR3 == 61 &&
          this.CSSCURSOR4 == 61 &&
          this.CSSCURSOR5 == 61
        ) {
          this.CSSCURSOR2++;
          this.CSSCURSOR3 = 0;
          this.CSSCURSOR4 = 0;
          this.CSSCURSOR5 = -1;
        } else if (this.CSSCURSOR4 == 61 && this.CSSCURSOR5 == 61) {
          this.CSSCURSOR3++;
          this.CSSCURSOR4 = 0;
          this.CSSCURSOR5 = -1;
        } else if (this.CSSCURSOR5 == 61) {
          this.CSSCURSOR4++;
          this.CSSCURSOR5 = -1;
        }
        break;
      default:
        break;
    }
    switch (this.VARLENGTH) {
      case 1: //return two chars. Total Length: (3906-62)
        return (
          this.CSSCURSOR3++,
          `${this.CSSVARCHARS[this.CSSCURSOR2]}${
            this.CSSVARCHARS[this.CSSCURSOR3]
          }`
        );
      case 2: //return three chars. Total Length: (242234-3906)
        return (
          this.CSSCURSOR4++,
          `${this.CSSVARCHARS[this.CSSCURSOR2]}${
            this.CSSVARCHARS[this.CSSCURSOR3]
          }${this.CSSVARCHARS[CSSCURSOR4]}`
        );
      case 3: //return four chars. Total Length: (Over 13 million)
        return (
          this.CSSCURSOR5++,
          `${this.CSSVARCHARS[this.CSSCURSOR2]}${
            this.CSSVARCHARS[this.CSSCURSOR3]
          }${this.CSSVARCHARS[CSSCURSOR4]}${this.CSSVARCHARS[CSSCURSOR5]}`
        );
      default:
        //We wouldn't need up to this point.
        //Crash if only we are here--> That's too much geek;
        throw new Error(
          "You have more than 14 million distinct css rules." +
            "Try to break your css file into two or more by parsing some of your HTML files separately."
        );
    }
    this.TOTAL++;
  }
}

var CSSOBJECT = {},
  STYLETRACE = {},
  STYLESHEET = "";

module.exports = {
  ex: { getDependencyMap, getPath },
  in: {
    getBundleMapLine,
    getExternalBundleMapDep,
    getMapLine,
    externalPackage,
    ExtendedBases,
  },
};
