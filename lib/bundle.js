const fs = require("fs");
let terser = require('terser');
const parse = require("./parse").parseModules;
const path = require("path");
let slash = path.join("/");
let base = path.join(__dirname).split(slash);
base = base.slice(0,base.length-3).join(slash)//Pops base directory leaving out node_modules/import-for-web/lib
let dependencyMap, dependentsMap;
let packageJSON = {};
let visted = {};
let count = 0;
let internal_import = undefined;
let clientDependencyMap = {};

function Concantenate(source, dependencies) {
    let independentModules = []
    if (!visted[source]) {
        visted[source] = 1;
    } else {
        return visted[source];
    }
    let file,dependents,adders=[];
    for (let i = 0; i < dependencies.length; i++){
        file = dependencies[i]
        if (dependents = dependentsMap[file]) {
            if (dependents.length == 1) {
                adders.push(file)
                independentModules.push(...Concantenate(file, dependencyMap[file] || []))
            } else {
                independentModules.push(file,...Concantenate(file, dependencyMap[file] || []))
            }
        }
    }
    visted[source] = independentModules = Array.from(new Set(independentModules));
    // External packages are already bundled. Bundle only files for this package
    if (clientDependencyMap[source]&&clientDependencyMap[source].includes(`/modules/${packageJSON.name}@${packageJSON.version}`)) {
        let s = "";
        for (let i = 0; i < independentModules.length; i++) {
            if (!dependencies.includes(independentModules[i])) {
                s += `\nI4W.include('${clientDependencyMap[independentModules[i]]}')`
            }
        }
        if (s) {
            s = `\nI4W.pathname='${packageJSON.name}-v${packageJSON.version}-${internal_import}-${++count}';${s}`;
            s += `\nI4W.onload=function(){I4W.export={}};`
        }
        let actualSrc = source, content = "";
        fs.writeFileSync((source = source + '.bundle.js'), s);
        for (let i = 0; i < adders.length; i++) {
            content = fs.readFileSync(adders[i] + '.bundle.js', 'utf8') + '\n';
            fs.appendFileSync(source, content);
            s += content;
            content = "";
        }
        content = fs.readFileSync(actualSrc);
        fs.appendFileSync(source, content);
        s += content;
        content = "";
        let min = terser.minify(s, {
            sourceMap: {
                filename: `/module_map${clientDependencyMap[actualSrc]}`,
                url: `/module_map${clientDependencyMap[actualSrc]}`
            },
            compress: {
                "arrows": false,
                "keep_infinity": true,
                "passes": 1,
            },
            format: {
                "comments": false,
                "ie8": true,
                "safari10": true,
                "webkit": true,
                "quote_style": 0,
            
            },
            mangle: {}
        });
        s = "";
        min.then(function (value) {
            fs.writeFileSync((actualSrc + '.min.js'), value.code);
            value.map = JSON.parse(value.map)
            value.map.sources[0] = `/module_mapsrc${clientDependencyMap[actualSrc]}`;
            value.map = JSON.stringify(value.map)
            fs.writeFileSync((actualSrc + '.map'), value.map);
        })
        .catch(function (err) {
            console.log(err);
            throw new Error("Faced problems while minifying code")
        })
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
        Concantenate(file,dependencyMap[file])
    }
}