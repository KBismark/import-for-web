const fs = require("fs");
const path = require("path");
let slash = path.join("/");
/**
 * 
 * @param {string} packageName 
 * @param {string} base 
 * @returns {{[k:string]:string}}
 */
function getDependencyMap(packageName, base) {
    let packagePath = path.join(base, "/node_modules/", packageName);
    let mapPath = path.join(packagePath, "/i4w.map.js");
    let exists = fs.existsSync(mapPath);
    if (!exists) {
        base = base.split(slash);
        if (base.length == 1) {
            throw new Error(`Can't find module "${packageName}". Try 'npm install ${packageName}'`)
        }
        base.pop();
        return getDependencyMap(packageName,base.join(slash))
    }
    return require(mapPath)();
}
function getPath(packageName,base,deps,hasExt,actualPackage) {
    let packagePath; 
    if (!hasExt) {
        let subPath = path.join(packageName).split(slash);
        if (subPath.length > 1) {
            actualPackage = subPath.shift();
            subPath = subPath.join("/");
            if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(packageName)) {
                subPath+=".js"
            } else {
                subPath = subPath.split(".");
                subPath[subPath.length - 1] = "js";
                subPath = subPath.join(".");
            }
            
            subPath = subPath.replace(/^(src\/modules)/, "/dist/modules");
            packageName = path.join(actualPackage, subPath);
        } else {
            let packageMain,dps;
            actualPackage =  actualPackage||packageName;
            try {
                packageMain = fs.readFileSync(path.join(base, "/node_modules/", actualPackage, "/package.json"), "utf-8");
                dps = require(path.join(base, "/node_modules/", actualPackage, "/i4w.bundle.map.js"));
                deps.value = {
                    dependencyMap: {
                        ...dps.dependencyMap,
                        ...deps.value.dependencyMap
                    },
                    dependentsMap: {
                        ...dps.dependentsMap,
                        ...deps.value.dependentsMap
                    }
                };
            } catch (error) {
                base = base.split(slash);
                if (base.length == 1) {
                    throw new Error(`Can't find module "${actualPackage}". Try 'npm install ${actualPackage}'`)
                }
                base.pop();
                return getPath(packageName, base.join(slash),deps, false, actualPackage);
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
            throw new Error(`Can't find module "${actualPackage}". Try 'npm install ${actualPackage}'`)
        }
        base.pop();
        return getPath(packageName,base.join(slash),deps,true,actualPackage)
    }
    return packagePath;
}


function getMapLine(key, value) {
    return `  ${JSON.stringify(key)}: path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(value)}),\n`
}
function getBundleMapLine(key, values) {
    let s = "[",l=values.length,lst=l-1,val;
    for (let i = 0; i < l; i++){
        val = values[i];
        if (val.external) {
            s+=`\n  getPath('${val.external}',path.join(\`\${__dirname}\`),deps)${i == lst ? "" : ","}`
        } else {
            s += `\n  path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(values[i])})${i == lst ? "" : ","}`;
        }
       
    }
    s += l? "\n]" : "]";
    return `  [\`\${path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(key)})}\`]: ${s},\n`
}
function getExternalBundleMapDep(key, values) {
    let s = "[",l=values.length,lst=l-1,val,packageName = path.join(key).split(slash).shift();
    let map = '{value:{dependencyMap:{},dependentsMap:{}}}';
    for (let i = 0; i < l; i++){
        val = values[i];
        if (val.internal) {
            s += `\n  path.join(\`\${__dirname}/dist/modules\`,${JSON.stringify(val.internal)})${i == lst ? "" : ","}`;
        } else {

            val = "~" + val;
            val = val.replace(RegExp(`~(.*?)${packageName}`),"")
            s+=`\n  getPath('${packageName+val.split(slash).join("/")}',path.join(\`\${__dirname}\`),${map})${i == lst ? "" : ","}`
        }
       
    }
    s += l? "\n]" : "]";
    return `  [\`\${getPath('${key}',path.join(\`\${__dirname}\`),${map})}\`]: ${s},\n`
}

function externalPackage(packageName, base, subPath,ignoreSub) {
    if (!subPath&&!ignoreSub) {
        subPath = path.join(packageName).split(slash);
        packageName = subPath.shift();
        if (subPath.length) {
            subPath = "/" + subPath.join("/")
            if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(subPath)) {
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
            throw new Error(`Can't find module "${packageName}". Try 'npm install ${packageName}'`)
        }
        base.pop();
        return externalPackage(packageName,base.join(slash),subPath,ignoreSub)
    }
    packageJSON = JSON.parse(packageJSON);
    let version = packageJSON.version;
    let mainPackageFile = path.join(packagePath,subPath?("/dist/modules"+subPath):("/"+packageJSON.main));
    if (subPath) {
        return {
            packageName: `/modules/${packageName}@${version}${subPath}`,
            packagePath: mainPackageFile,
            bundleMap:require(path.join(packagePath,"/i4w.bundle.map.js")),
            dependencyMap: `  '/modules/${packageName}@${version}${subPath}': ` +
                `getDependencyMap('${packageName}', \`\${dirname}\`)['/modules/${packageName}@${version}${subPath}'],\n`
        }
    }
    return {
        packageName: `/modules/${packageName}@${version}`,
        packagePath: mainPackageFile,
        bundleMap:require(path.join(packagePath,"/i4w.bundle.map.js")),
        dependencyMap:`  ...getDependencyMap('${packageName}',\`\${dirname}\`),\n`
    }
}

module.exports = { ex:{getDependencyMap, getPath}, in:{getBundleMapLine, getExternalBundleMapDep, getMapLine, externalPackage} };