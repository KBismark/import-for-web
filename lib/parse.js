let thirdPartyTransformer = undefined; // Will hold third party transformation module
let ts = undefined; // Will hold typescript's module if /tsconfig.json is available
let fs = require("fs");
let path = require("path");
let slash = path.join("/");
// Get the project's directory
let base = '';
base = path.join(__dirname).split(slash);
base = base.slice(0, base.length - 3).join(slash)//Pops base directory leaving out node_modules/import-for-web/lib
// Project must have a package.json file in its base directory
let packageJSON = JSON.parse(fs.readFileSync(path.join(base, "/package.json")));
// Check if project is typescript based
let parseTypescript = null;
try {
    parseTypescript = JSON.parse(fs.readFileSync(path.join(base, "/tsconfig.json")));
} catch (error) {
    parseTypescript = null;
}
if (parseTypescript) {
    ts = require('typescript');
}
// project's name
let appName = packageJSON.name;
// Project's version
let version = packageJSON.version;
// Resolve the main field of the packaje.json
let main = packageJSON.main.replace(/^(src\/modules\/)/, "dist/modules/");
let mainIndex = path.resolve(base, "./", main);
// All pathnames ending with these file extensions are assumed to be files and not directories
//...And their final path extensions will be `.js`
// if a file's pathmame does not end with any of these extensions, we add `.js` to the destination path in the /dist dir
const fileExtensions = ["js", "jsx", "cjs", "mjs","ts","tsx"];
const fileExtensionPattern = /(\.jsx|\.js|\.cjs|\.mjs|\.tsx|\.ts)$/;
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
// path  to the /dist/modules directory
//will contain parsed and bundled code
let parsedModulesPath = path.join(baseDist, "/modules");
// Starting strings 
let unpackWebMap = `{\n`;
let bundleDependencyMap = `{\n`
let bundleDependentsMap = `{\n`

let hasExternalDependencies = false;
// keep references of all external packages used in project
let externalRef = {};
//patterns to match
const serverImportsPattern = /\/\/<@serverImports>(.*?)\/\/<\/>/s;
const importsPattern = /\/\/<@imports>(.*?)\/\/<\/>/s;
const serverPattern = /\/\/<@server>(.*?)\/\/<\/>/gs;
const clientPattern = /\/\/<@client>(.*?)\/\/<\/>/gs;
const exportPattern = /((export\s+default\s+)|(export\s+))/;
const dynamicImportPattern = /\s*\.\s*(((reload|load|includes)Module)|loadPage|import\s*\.\s*from)\s*\(\s*(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
const eachImportPattern = /import\s+(.*?)\s+from\s+(("[^"]*")|('[^']*'))/g;
const pathPattern = /(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
const commentsPattern = /((\/\/(.*?)\n)|(\/\*(.*?)\*\/))/gs;

const { getBundleMapLine, getExternalBundleMapDep, getMapLine, externalPackage } = require("./helpers").in;

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
    let rawFilePath = filePath.replace(parsedModulesPath, "").split(slash).join("/");
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
    let SERVER_IMPORTS;
    if (serverImports) {
        code = code.replace(serverImports[0], "");
        SERVER_IMPORTS= serverImports = `//<@server>\n${serverImports[0].replace('//<@serverImports>','')}\n`;
    } else {
        serverImports = "";
    }
    // Parse import statements if any
    let declarations = code.match(importsPattern);
    let IMPORTS;
    if (declarations) {
        code = code.replace(declarations[0], "");
        // Take commented codes out of import declarations and match each import statement
        IMPORTS = declarations[0];
        declarations = declarations[1].replace(commentsPattern," ").match(eachImportPattern);
        if (declarations) {
            hasDependencies = [];
            let block, variableDeclaration, dependencyPath, filename, external, raw, sourceFile;
            for (let i = declarations.length-1; i >=0 ; i--) {
                block = declarations[i];
                dependencyPath = block.match(pathPattern)[0];
                variableDeclaration = block.replace(dependencyPath, "").replace("import", "const").replace(/(from\s+)$/, "= ")
                dependencyPath = dependencyPath.replace(/^./, "").replace(/.$/, "");
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
                        raw = dependencyPath.replace(parsedModulesPath, "").split(slash).join("/");
                        // if the file is referenced as the main entry in the package.json,
                        // then it name follows the pattern: `/modules/project_name@version`
                        // Else, it follows the pattern: `/modules/project_name@version/raw_filename
                        dependencyMap[dependencyPath] = filename = (dependencyPath==mainIndex)?modulesDirectoryPath:modulesDirectoryPath + raw;
                        dependencyMap2[filename] = dependencyPath;
                        unpackWebMap+=getMapLine(filename,raw)
                        
                    } else {
                        filename = dependencyMap[dependencyPath];
                        raw = filename.replace(modulesDirectoryPath,"")
                    }
                    dependencies.push(raw);
                    // Setup this dependent module if not ever visited
                    if (!moduleDependents[dependencyPath]) {
                        moduleDependents[dependencyPath] = [];
                        moduleDependencies[dependencyPath] = [];
                    }
                    if (!moduleDependents[dependencyPath].includes(rawFilePath)) {
                        moduleDependents[dependencyPath].push(rawFilePath)
                    }
                    

                }
                //External packages imported into application codes
                else {//It's an external package
                    if (!dependencyMap[dependencyPath]) {
                        external = externalPackage(dependencyPath,base);
                        dependencyMap[dependencyPath] = filename = external.packageName;
                        dependencyMap2[filename] = external.packagePath;
                        unpackWebMap += external.dependencyMap;
                        hasExternalDependencies = true;
                        
                        moduleDependents = {
                            ...external.bundleMap.dependentsMap,
                            ...moduleDependents
                        }
                        moduleDependencies = {
                            ...external.bundleMap.dependencyMap,
                            ...moduleDependencies
                        }
                        externalRef[dependencyPath]={
                            src: external.packagePath,
                            dependents: external.bundleMap.dependentsMap[external.packagePath]
                        }
                    } else {
                        filename = dependencyMap[dependencyPath];
                    }
                    dependencies.push({external:dependencyPath});
                    sourceFile = dependencyMap2[filename];
                    moduleDependents[sourceFile].push({internal:rawFilePath})

                }
                hasDependencies.push(filename)
                variableDeclaration += `I4W.require('${filename}');\n`
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
        for (let i = 0; i < dynamicInclusions.length; i++){
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
                    raw = dependencyPath.replace(parsedModulesPath, "").split(slash).join("/");
                    // if the file is referenced as the main entry in the package.json,
                    // then it name follows the pattern: `/modules/project_name@version`
                    // Else, it follows the pattern: `/modules/project_name@version/raw_filename
                    dependencyMap[dependencyPath] = filename = (dependencyPath==mainIndex)?modulesDirectoryPath:modulesDirectoryPath + raw;
                    dependencyMap2[filename] = dependencyPath;
                    unpackWebMap += getMapLine(filename, raw);
                }
                else {
                    filename = dependencyMap[dependencyPath];
                    raw = filename.replace(modulesDirectoryPath,"")
                }

                if (!moduleDependents[dependencyPath]) {
                    moduleDependents[dependencyPath] = [];
                    moduleDependencies[dependencyPath] = []
                }
                if (!moduleDependents[dependencyPath].includes(rawFilePath)) {
                    moduleDependents[dependencyPath].push(rawFilePath)
                }

            }
             //External packages imported dynamically into application codes
            else {//It's an external package. 
                if (!dependencyMap[dependencyPath]) {
                    external = externalPackage(dependencyPath,base);
                    dependencyMap[dependencyPath] = filename = external.packageName;
                    dependencyMap2[filename] = external.packagePath;
                    unpackWebMap += external.dependencyMap;
                    hasExternalDependencies = true;
                    moduleDependents = {
                        ...external.bundleMap.dependentsMap,
                        ...moduleDependents
                    }
                    moduleDependencies = {
                        ...external.bundleMap.dependencyMap,
                        ...moduleDependencies
                    }
                    externalRef[dependencyPath]={
                        src: external.packagePath,
                        dependents: external.bundleMap.dependentsMap[external.packagePath]
                    }
                } else {
                    filename = dependencyMap[dependencyPath];
                }
                sourceFile = dependencyMap2[filename];
                moduleDependents[sourceFile].push({internal:rawFilePath})
                
            }
            
            parsedBlock = block.replace(pathPattern, `'${filename}'`)
            code = code.replace(block, parsedBlock);
        }
    }
    
    if (exportPattern.test(code)) {
        code = code.replace(exportPattern,"/*EXPORT*/I4W.export_temporal = ")
    } else {
        code += "\nI4W.export_temporal = {}";
    }
   
    // Apply third party transformations if any
    if (thirdPartyTransformer) {
        code = thirdPartyTransformer(code);
    } else {
        code = {
            code: code,
            ssrCode:''
        }
    }

    // If typescript is set up, transpile code into JS
    if (parseTypescript) {
        code.code = ts.transpileModule(code.code, {
            "compilerOptions": {
                ...tsConfig.compilerOptions,
                emitDeclarationOnly: false
            }
        }).outputText;
    
        code.ssrCode = ts.transpileModule(code.ssrCode, {
            "compilerOptions": {
                ...tsConfig.compilerOptions,
                emitDeclarationOnly: false
            }
        }).outputText;
    }

    if (hasDependencies && hasDependencies.length) {
        code.code = `I4W.onload=function(){\n${code.code}`;
        code.ssrCode = `I4W.onload=function(){\n${code.ssrCode}`;
        code.code += '\n//<@client>' + "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal=null;" + '\n//</>';
        code.ssrCode += '\n//<@server>' + "return I4W.export_temporal;" + '//</>';
        code.code += `\n}`;
        code.ssrCode += `\n}`;
        for (let i = 0; i < hasDependencies.length; i++){
            code.code = `I4W.include('${hasDependencies[i]}')\n` + code.code;
        }
    } else {
        code.code = `\n//<@client>\n!function(){\n//</>\n${code.code}`;
        code.ssrCode = `\n//<@server>I4W.onload=function(){//</>\n${code.ssrCode}`;
        code.code += '\n//<@client>' + "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal = null;" + '\n//</>';
        code.ssrCode += '\n//<@server>' + "return I4W.export_temporal;" + '//</>';
        code.code += `\n//<@client>\n}();\n//</>`;
        code.ssrCode += `\n//<@server>}//</>`;
    }
    let pathname,raw;
    if (!dependencyMap[filePath]) {
        // if the file is referenced as the main entry in the package.json,
        // then it name follows the pattern: `/modules/project_name@version`
        // Else, it follows the pattern: `/modules/project_name@version/raw_filename
        dependencyMap[filePath] = pathname = (filePath==mainIndex)?modulesDirectoryPath:modulesDirectoryPath + rawFilePath;
        dependencyMap2[pathname] = filePath;
        unpackWebMap += getMapLine(pathname, rawFilePath)
    } else {
        pathname = dependencyMap[filePath];
    }
    bundleDependencyMap += `${getBundleMapLine(rawFilePath, dependencies)}\n`;
    code.code = `I4W.pathname = '${pathname}';\n${code.code}`;
    code.ssrCode = `I4W.pathname = '${pathname}';\n${code.ssrCode}`;
    code.ssrCode = `${serverImports}\n//<@server>module.exports = function(HoneyBee){const I4W = HoneyBee.UI._imex;//</>\n${code.ssrCode}`
    code.ssrCode += `\n//<@server>}//</>`;

    
    // take out client codes from server codes and vice versa.
    code.code = code.code.replace(serverPattern, '');
    code.ssrCode = code.ssrCode.replace(clientPattern, '');
    let serverOnly = code.ssrCode.match(serverPattern);
    if (serverOnly) {
        let a;
        for (let i = 0; i < serverOnly.length; i++){
            a = serverOnly[i].replace('//<@server>','').replace('//</>','');
            code.ssrCode = code.ssrCode.replace(serverOnly[i],a);
        }
    }
    let clientOnly = code.code.match(clientPattern);
    if (clientOnly) {
        let a;
        for (let i = 0; i < clientOnly.length; i++) {
            a = clientOnly[i].replace('//<@client>', '').replace('//</>', '');
            code.code = code.code.replace(clientOnly[i], a);
        }
    }
    return code;
}



const tsConfig = {
    "compilerOptions": {
        "target": "es5",
        "module": "commonjs",
        "allowJS": true,
        "declaration": true,
        "strict": true
    }
};

let allFiles = [];
function parseSubDirectory(directory,distDirectory) {
    let directories = fs.readdirSync(directory, "utf-8");
   // try creating directory if not exist else ignore error
    try {
        fs.mkdirSync(distDirectory);
    } catch (error) {}
    let item,code,resultPath,source;
    for (let i = 0; i < directories.length; i++) {
        source = directories[i];
        item = source.split(".");
        if (fileExtensions.includes(item[item.length - 1])) {//Assumed as a file to be parsed
            item[item.length - 1] = "js";
            item = item.join(".");
            resultPath = path.join(distDirectory, item);
            allFiles.push({ path: resultPath, raw: "" });
            code = fs.readFileSync(path.join(directory, source), "utf-8");
            code = parseDependencies(code, resultPath, distDirectory);
            fs.writeFileSync(resultPath, code.code);
            if (code.ssrCode) {
                fs.writeFileSync(resultPath+'.server.js', code.ssrCode);
            }
        } else {//Assumed to be a directory
            parseSubDirectory(path.join(directory, source), path.join(distDirectory, source));
        }
    }
   
}




module.exports = exports = {
    baseDirectory:base,
    parseModules() {
        packageJSON = JSON.parse(fs.readFileSync(path.join(base, "/package.json")));
        parseTypescript = null;
        try {
            parseTypescript = JSON.parse(fs.readFileSync(path.join(base, "/tsconfig.json")));
        } catch (error) {
            parseTypescript = null;
        }
        if (parseTypescript) {
            ts = require('typescript');
        }
        appName = packageJSON.name;
        version = packageJSON.version;
        main = packageJSON.main.replace(/^(src\/modules\/)/, "dist/modules/");
        mainIndex = path.resolve(base, "./", main);
        if (!fileExtensionPattern.test(mainIndex)) {
            mainIndex += ".js";
        } else {
            mainIndex = mainIndex.split(".");
            mainIndex[mainIndex.length - 1] = "js";
            mainIndex = mainIndex.join(".");
        }
        modulesDirectoryPath = `/modules/${appName}@${version}`;

        dependencyMap = {};
        dependencyMap2 = {};
        moduleDependencies = {};
        moduleDependents = {};
        unpackWebMap = `{\n`
        bundleDependencyMap = `{\n`
        bundleDependentsMap = `{\n`
        hasExternalDependencies = false;
        externalRef = {};
        try {
            fs.mkdirSync(baseDist);
            
        } catch (error) {}
        parseSubDirectory(path.join(baseSrc, "/modules"), path.join(baseDist, "/modules"));

        // Create the i4w.map file
        // This file is needed to map the generated module paths to their actual paths.
        fs.writeFileSync(
            path.join(base, "/i4w.map.js"),
            `const path = require('path');\n` +
            (hasExternalDependencies?`const { getDependencyMap } = require('import-for-web')\nconst dirname = path.dirname(__filename)\n`:'') +
            `module.exports =() => (\n${ unpackWebMap }})`
        );

        // Build and create the i4w.bundle.map file
        // This file is used by I4W during code bundling
        for (let i = 0; i < allFiles.length; i++){
            bundleDependentsMap += `${getBundleMapLine(allFiles[i].raw,moduleDependents[allFiles[i].path]||[])}\n`
        }
        for (let i in externalRef) {
            bundleDependentsMap += `${getExternalBundleMapDep(i,externalRef[i].dependents||[])}\n`
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
        let baseContents = fs.readdirSync(base, 'utf8'), fileContent, pagePath;

        //Parse dynamic index pages
        for (let i = 0; i < baseContents.length; i++){
            if (baseContents[i].toLowerCase().endsWith('.page.html')||baseContents[i].toLowerCase().endsWith('.page.htm')) {
                fileContent = fs.readFileSync(pagePath = path.join(base, '/', baseContents[i]), 'utf8');
                fileContent = fileContent.split('<!--LEAVE THIS COMMENT UNTOUCHED-->')
                if (fileContent.length == 2) {
                    fs.writeFileSync(
                        pagePath.replace(/((html)|(htm))$/, 'js'),
                        `/**`+
                        `\n*`+ 
                        `\n* @param {{isSSR:boolean}} HoneyBee`+ 
                        `\n* @param {keyof import('./i4w.map')} source`+
                        `\n* @param {*} DATA`+
                        `\n* @returns {[string, string]}`+
                        `\n*/`+
                        `\nmodule.exports = (HoneyBee,source,PAGEDATA)=>[\n\`${fileContent[0]}\`,\`${fileContent[1]}\`\n]`
                    )
                }
            }
        }
        return {
            packageJSON: {
                name: packageJSON.name,
                version: packageJSON.version
            },
            dependencyMap:dependencyMap
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
    }
}

