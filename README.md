# Import-For-Web
A code modularization support for browsers and also an asynchronous module loader that supports ECMAScript import and export satements. I4W also supports dynamic module loading. All modules (including nested module dpendencies) requests are made simultaneouslly and does not wait for other modules to load before making the request to load other modules.    
I4W also does not neglect the benefits of code cocantenation or bundling and minifications which reduces the number of HTTP requests made to load modules and their dependencies. I4w uses the `terser` minification tool under the hood for code minification.    
Import-For-Web also employs strategies which keeps a good balance between your bundled code and the browser caching system. These strategies ensures that modules that have several dependents remain independent and are loaded independently. This allows such modules to be cached by the browser and hence, subsequent requests to load them are loaded from memomry. Modules that have not several dependents (non-independent modules) are bundled with their dependendencies which can also take advantage of browser caching systems. In the end, every module is loaded once but can be used accros pages.    
**Import-For-Web shines when employed with multi-page application systems**    
I4W can make your multi-page applications look exactly as single page applications. You can dynamically load required modules for new pages and build new pages dynamically.

## Available import statement syntax
Source: [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)    
```js
import defaultExport from "module-name";
import * as name from "module-name";
import { export1 } from "module-name";
import { export1 as alias1 } from "module-name";
import { default as alias } from "module-name";
import { export1, export2 } from "module-name";
import { export1, export2 as alias2, /* … */ } from "module-name";
import { "string name" as alias } from "module-name";
import defaultExport, { export1, /* … */ } from "module-name";
import defaultExport, * as name from "module-name";
import "module-name";

```

## Supported import statement syntax by I4W
There are four forms of the `import` declarations. Import-For-Web currently supports two: [Named](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#named_import) and [Default](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#default_import) import declarations.    
```js
import defaultExport from "module-name";
import { export1 } from "module-name";
import { export1, export2, /* ...and many more */ } from "module-name";

```

## Supported export statement syntax by I4W
```js
export default somethingToExport;
export { first_thingToExport, second_thingToExport, /* ...and many more */ };

```

## Examples
```js
// /src/modules/module-1.js
const add = (a, b)=> a + b;
export { add };    

```    
```js
// /src/modules/module-2.js
const sub = (a, b)=> a - b;
export default sub;    

```    
```js
// /src/modules/index.js

//<@imports>
import { add } from "./module-1"
import sub from "./module-2"
//</>

consol.log(add(8,9) - sub(6,3));

export { add, sub };    

```    

## What Actually Happens
In the above codes, `export` and `export default` are transpiled into `I4W.export =`. `I4W.export` is a setter which stores expoted values into an object where they can be accessed by other modules via the `import` statements.    
In betwewn the imports tag: `//<@imports>` and `//</>` is where Import-For-Web looks for import declarations. `import` is transpiled into `const`, `from` is transpiled into `=` and `"module_name"` is transpiled into `I4W.require('/modules/project_name@project_version/filename.js')`    

Assuming the package.json file as:    
```json
// /package.json
{
    "name": "my_app",
    "version": "1.0.0",
    "main": "src/modules/index.js"
}    

```     

The transpiled form of the example codes above are:    

```js
// dist/modules/module-1.js
I4W.pathname = '/modules/my_app@1.0.0/module-1.js'
!function(){
    const add = (a, b)=> a + b;
    I4W.export = { add };  
}();  

``` 

```js
// dist/modules/module-2.js
I4W.pathname = '/modules/my_app@1.0.0/module-2.js'
!function(){
    const sub = (a, b)=> a - b;
    I4W.export = sub;  
}();  

```    
```js
// dist/modules/index.js


I4W.pathname = '/modules/my_app@1.0.0'; // Excludes the filename since this file is referenced as the main field in the package.json

// Include statements sets up the dependencies of the module
I4W.include('/modules/my_app@1.0.0/module-1.js')
I4W.include('/modules/my_app@1.0.0/module-2.js')

//Setting onload callback starts loading all dependencies asynchronously and in parrallel
// All dependencies must be loaded before the onload() callback will execute.
I4W.onload = function(){
    const { add } = I4W.require('/modules/my_app@1.0.0/module-1.js');
    const sub = I4W.require('/modules/my_app@1.0.0/module-2.js');

    consol.log(add(8,9) - sub(6,3));

    I4W.export = { add, sub }; 
}

```    

**NOTICE:** Did you observe how each file includes the current version of the project? This makes it easy to either upgrade to newer versions or downgrade to older versions of your project modules cached by users' browsers.You can also upgarde or downgrade some few modeles instead by keeping both versions of your project.     

## Rules
- `import` statements must be surrounded with an imports tag: `//<@imports>` and `//</>`    
- Only codes in the `/src/modules` folder shall be transpiled, bundled and minified by I4W.    
- Output files are stored in `dist/modules` folder.    
