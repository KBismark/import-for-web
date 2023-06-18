let thirdPartyTransformer = undefined;
let fs = require("fs");
let path = require("path");
let slash = path.join("/");
let base = path.join(__dirname).split(slash);
base = base.slice(0,base.length-3).join(slash)//Pops base directory leaving out node_modules/import-for-web/lib
let packageJSON = JSON.parse(fs.readFileSync(path.join(base, "/package.json")));
let appName = packageJSON.name;
let version = packageJSON.version;
let main = packageJSON.main.replace(/^(src\/modules\/)/, "dist/modules/");
let mainIndex = path.resolve(base, "./", main);
if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(mainIndex)) {
    mainIndex += ".js";
} else {
    mainIndex = mainIndex.split(".");
    mainIndex[mainIndex.length - 1] = "js";
    mainIndex = mainIndex.join(".");
}
//let dependencyMap = { [mainIndex]: `/modules/${appName}@${version}` };
let dependencyMap = {};
let dependencyMap2 = {};
let moduleDependencies = {};
let moduleDependents = {};
let modulesDirectoryPath = `/modules/${appName}@${version}`;
let fileExtensions = ["js", "jsx", "cjs", "mjs"];
let baseSrc = path.join(base, "/src");
let baseDist = path.join(base, "/dist");
let parsedModulesPath = path.join(baseDist, "/modules");
//let unpackWebMap = `{\n  '/modules/${appName}@${version}': path.resolve(\`\${__dirname}\`,'./${main}'),\n`
let unpackWebMap = `{\n`;
let bundleDependencyMap = `{\n`
let bundleDependentsMap = `{\n`
let hasExternalDependencies = false;
let externalRef = {};

const serverImportsPattern = /\/\/<@serverImports>(.*?)\/\/<\/>/s;
const importsPattern = /\/\/<@imports>(.*?)\/\/<\/>/s;
const serverPattern = /\/\/<@server>(.*?)\/\/<\/>/gs;
const clientPattern = /\/\/<@client>(.*?)\/\/<\/>/gs;
const exportPattern = /((export\s+default\s+)|(export\s+))/;
const dynamicImportPattern = /\s*\.\s*(((reload|load|includes)Module)|loadPage)\s*\(\s*(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
const eachImportPattern = /import\s+(.*?)\s+from\s+(("[^"]*")|('[^']*'))/g;
const pathPattern = /(("[^"]*")|('[^']*')|(`[^`]*`))/gs;
const commentsPattern = /((\/\/(.*?)\n)|(\/\*(.*?)\*\/))/gs;

const { getBundleMapLine, getExternalBundleMapDep, getMapLine, externalPackage } = require("./helpers").in;

function parseDependencies(code, filePath, currentDirectory) {
   
    if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(filePath)) {
        filePath = filePath + ".js";
    } else {
        filePath = filePath.split(".");
        filePath[filePath.length - 1] = "js";
        filePath = filePath.join(".");
    }
    let rawFilePath = filePath.replace(parsedModulesPath, "").split(slash).join("/");
    allFiles[allFiles.length - 1].raw = rawFilePath;
    if (!moduleDependents[filePath]) {
        moduleDependencies[filePath] = [];
        moduleDependencies[filePath] = [];
    }
    let dependencies = moduleDependencies[filePath];
    //let dependents = moduleDependencies[filePath];

    let hasDependencies = null;
    let serverImports = code.match(serverImportsPattern);
    if (serverImports) {
        code = code.replace(serverImports[0], "");
        serverImports = `//<@server>\n${serverImports[0].replace('//<@serverImports>','')}\n`;
    } else {
        serverImports = "";
    }
    let declarations = code.match(importsPattern);
    if (declarations) {
        code = code.replace(declarations[0], "");
        declarations = declarations[1].replace(commentsPattern," ").match(eachImportPattern);
        if (declarations) {
            hasDependencies = [];
            let block, variableDeclaration, dependencyPath, filename, external, raw, sourceFile;
            for (let i = declarations.length-1; i >=0 ; i--) {
                block = declarations[i];
                dependencyPath = block.match(pathPattern)[0];
                variableDeclaration = block.replace(dependencyPath, "").replace("import", "const").replace(/(from\s+)$/, "= ")
                dependencyPath = dependencyPath.replace(/^./, "").replace(/.$/, "");
               
                if (/^\./.test(dependencyPath)) {
                    dependencyPath = path.resolve(currentDirectory, dependencyPath);
                    if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(dependencyPath)) {
                        dependencyPath += ".js";
                    } else {
                        dependencyPath = dependencyPath.split(".");
                        dependencyPath[dependencyPath.length - 1] = "js";
                        dependencyPath = dependencyPath.join(".");
                    }
                    if (!dependencyMap[dependencyPath]) {
                        raw = dependencyPath.replace(parsedModulesPath, "").split(slash).join("/");
                        dependencyMap[dependencyPath] = filename = (dependencyPath==mainIndex)?modulesDirectoryPath:modulesDirectoryPath + raw;
                        dependencyMap2[filename] = dependencyPath;
                        unpackWebMap+=getMapLine(filename,raw)
                        
                    } else {
                        filename = dependencyMap[dependencyPath];
                        raw = filename.replace(modulesDirectoryPath,"")
                    }
                    dependencies.push(raw);
                    if (!moduleDependents[dependencyPath]) {
                        moduleDependents[dependencyPath] = [];
                        moduleDependencies[dependencyPath] = [];
                    }
                    if (!moduleDependents[dependencyPath].includes(rawFilePath)) {
                        moduleDependents[dependencyPath].push(rawFilePath)
                    }
                    

                } else {//It's an external package
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
    
    let dynamicInclusions = code.match(dynamicImportPattern);
    if (dynamicInclusions) {
        let dependencyPath, block, parsedBlock, filename, external, raw, sourceFile;
        for (let i = 0; i < dynamicInclusions.length; i++){
            block = dynamicInclusions[i];
            dependencyPath = block.match(pathPattern)[0];
            dependencyPath = dependencyPath.replace(/^./, "").replace(/.$/, "");
            if (/^\./.test(dependencyPath)) {
                dependencyPath = path.resolve(currentDirectory, dependencyPath);
                if (!/(\.jsx|\.js|\.cjs|\.mjs)$/.test(dependencyPath)) {
                    dependencyPath += ".js";
                } else {
                    dependencyPath = dependencyPath.split(".");
                    dependencyPath[dependencyPath.length - 1] = "js";
                    dependencyPath = dependencyPath.join(".");
                }
                if (!dependencyMap[dependencyPath]) {
                    raw = dependencyPath.replace(parsedModulesPath, "").split(slash).join("/");
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

            } else {//It's an external package
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
                //dependencies.push({external:dependencyPath});
                sourceFile = dependencyMap2[filename];
                moduleDependents[sourceFile].push({internal:rawFilePath})
                
            }
            
            parsedBlock = block.replace(pathPattern, `'${filename}'`)
            code = code.replace(block, parsedBlock);
        }
    }
    
    if (exportPattern.test(code)) {
        code = code.replace(exportPattern,"I4W.export_temporal = ")
    } else {
        code += "\nI4W.export_temporal = {}";
    }
    
    if (hasDependencies && hasDependencies.length) {
        code = `I4W.onload=function(){\n${code}`
        code += '\n//<@client>' + "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal=null;" + '\n//</>';
        code += '\n//<@server>' + "return I4W.export_temporal;" + '//</>';
        code +=`\n}`
        for (let i = 0; i < hasDependencies.length; i++){
            code = `I4W.include('${hasDependencies[i]}')\n` + code;
        }
    } else {
        code = `\n//<@client>\n!function(){\n//</>`+
        `\n//<@server>I4W.onload=function(){//</>\n${code}`
        code += '\n//<@client>' + "\nI4W.export = I4W.export_temporal;\nI4W.export_temporal = null;" + '\n//</>';
        code += '\n//<@server>' + "return I4W.export_temporal;" + '//</>';
        code += `\n//<@client>\n}();\n//</>`;
        code += `\n//<@server>}//</>`;
    }
    let pathname,raw;
    if (!dependencyMap[filePath]) {
        dependencyMap[filePath] = pathname = (filePath==mainIndex)?modulesDirectoryPath:modulesDirectoryPath + rawFilePath;
        dependencyMap2[pathname] = filePath;
        unpackWebMap += getMapLine(pathname, rawFilePath)
    } else {
        pathname = dependencyMap[filePath];
    }
    bundleDependencyMap += `${getBundleMapLine(rawFilePath, dependencies)}\n`;
    code = `I4W.pathname = '${pathname}';\n${code}`
    code = `${serverImports}\n//<@server>module.exports = function(HoneyBee){const I4W = HoneyBee.UI._imex;//</>\n${code}`
    code += `\n//<@server>}//</>`
    if (thirdPartyTransformer) {
        code = thirdPartyTransformer(code);
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
    } else {
        code = {
            ssrCode: "",
            code:code.replace(serverPattern, '')
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




let allFiles = [];
function parseSubDirectory(directory,distDirectory) {
    let directories = fs.readdirSync(directory, "utf-8");
   
    try {
        fs.mkdirSync(distDirectory);
    } catch (error) {}
    let item,code,resultPath;
    for (let i = 0; i < directories.length; i++) {
        item = directories[i].split(".");
        if (fileExtensions.includes(item[item.length - 1])) {//Assumed as a file to be parsed
            item[item.length - 1] = "js";
            item = item.join(".");
            resultPath = path.join(distDirectory, item);
            allFiles.push({ path:resultPath,raw:"" });
            code = parseDependencies(fs.readFileSync(path.join(directory, item), "utf-8"), resultPath, distDirectory);
            fs.writeFileSync(resultPath, code.code);
            if (code.ssrCode) {
                fs.writeFileSync(resultPath+'.server.js', code.ssrCode);
            }
        } else {//Assumed to be a directory
            item = item.join(".");
            parseSubDirectory(path.join(directory, item), path.join(distDirectory, item));
        }
    }
   
}




module.exports = exports = {
    parseModules() {
       // dependencyMap = {[mainIndex]:`/modules/${appName}@${version}`};
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
        fs.writeFileSync(
            path.join(base, "/i4w.map.js"),
            `const path = require('path');\n` +
            (hasExternalDependencies?`const { getDependencyMap } = require('import-for-web')\nconst dirname = path.dirname(__filename)\n`:'') +
            `module.exports =() => (\n${ unpackWebMap }})`
        );
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
        //Parse dynamic pages
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

