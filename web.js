!(function () {
  /*
   * Code importation and exportation library.
   * -Version: 0.0.1-
   * -Lincense: MIT-
   *
   * The IMEX Project by Kwabena Bismark.
   * See initial project on github: https://github.com/KBismark/IMEX
   * 
   */

  var symbolIdentifier = "$_" + Math.random() + "-";
  function setFreezedObjectProperty(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  function setWritableObjectProperty(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: false,
      configurable: false,
      writable: true,
    });
  }
  function setFreezedObjectProperties(obj, propsObj) {
    var keys = Object.keys(propsObj);
    for (var i = 0; i < keys.length; i++) {
      setFreezedObjectProperty(obj, keys[i], propsObj[keys[i]]);
    }
    return obj;
  }

  /**
   * Loads script files by creating a new script element.
   */
  function loadScripts(src, dependency) {
    var script = document.createElement("script");
    //Concat the version of this script file if any
    script.src = [
      src,
      typeof modulesVersion[src] == "string" ? modulesVersion[src] : "",
    ].join("");
    script.onerror = function () {
      I4W[symbolIdentifier + "requested"][dependency] = false;
      var importsKey = symbolIdentifier + "imports",
        i;
      var dependants = I4W[importsKey][dependency];
      if (dependants) {
        //Send unsuccessful message to all modules
        //that depends on this particular module.
        for (i = 0; i < dependants.length; i++) {
          modulesCallback(false, dependants[i]);
        }
      }
      this.onerror = null;
    };
    return script;
  }
  var modules = {},
    modulesReqObj = { abort: function () {} },
    currentModuleRequest = modulesReqObj,
    currentLoadingModule = {
      src: null,
    };
  //Allows aborting page loads.
  function pageLoadAborter(src) {
    return {
      abort: function () {
        if (src === currentLoadingModule.src) {
          currentModuleRequest.abort();
          currentModuleRequest = modulesReqObj;
          modules[currentLoadingModule.src].onload = null;
          modules[currentLoadingModule.src].onerror = null;
          modules[currentLoadingModule.src].loading = false;
        }
      },
    };
  }
  function moduleRequestsOnload() {
    //We assume status codes in the range [200 - 300] is success
    if (this.status >= 200 && this.status < 300) {
      currentModuleRequest = modulesReqObj;
      modules[this.pageSrc].loading = false;
      modules[this.pageSrc].loaded = true;
      modules[this.pageSrc].I4WLoading = true;
      var script = document.createElement("script");
      script.textContent = this.responseText;
      document.head.appendChild(script);
      I4W.loadModule(this.pageSrc, {
        onload: scopedI4Wonload(this.pageSrc),
        onerror: scopedI4Wonerror(this.pageSrc),
        args: this.args,
      });
    } else {
      this.onerror();
    }
  }
  function moduleRequestsOnabort() {
    currentModuleRequest = modulesReqObj;
    modules[this.pageSrc].loading = false;
    modules[this.pageSrc].onerror = null;
    modules[this.pageSrc].onload = null;
  }
  function moduleRequestsOnerror() {
    currentModuleRequest = modulesReqObj;
    var onerror = modules[this.pageSrc].onerror;
    modules[this.pageSrc].onerror = null;
    modules[this.pageSrc].onload = null;
    modules[this.pageSrc].loading = false;
    modules[this.pageSrc].loaded = false;
    if (onerror) {
      onerror(this.args);
    }
  }

  function scopedI4Wonload(pageSrc) {
    return function (args) {
      var onload = modules[pageSrc].onload;
      modules[pageSrc].onerror = null;
      modules[pageSrc].onload = null;
      modules[pageSrc].I4WLoaded = true;
      modules[pageSrc].I4WLoading = false;
      if (currentLoadingModule.src === pageSrc) {
        onload(args);
      }
      pageSrc = null;
    };
  }
  function scopedI4Wonerror(pageSrc) {
    return function (args) {
      var onerror = modules[pageSrc].onerror;
      modules[pageSrc].onerror = null;
      modules[pageSrc].onload = null;
      modules[pageSrc].I4WLoaded = false;
      modules[pageSrc].I4WLoading = false;
      if (onerror && currentLoadingModule.src === pageSrc) {
        onerror(args);
      }
      pageSrc = null;
    };
  }

  function pageLoader(src, props) {
    currentModuleRequest.abort();
    if (typeof currentLoadingModule.src == "string") {
      modules[currentLoadingModule.src].onload = null;
      modules[currentLoadingModule.src].onerror = null;
      modules[currentLoadingModule.src].loading = false;
    }
    currentLoadingModule.src = null;
    var request = new XMLHttpRequest();
    request.pageSrc = src;
    request.args = props.args;
    request.onload = moduleRequestsOnload;
    request.onerror = moduleRequestsOnerror;
    //request.onabort=moduleRequestsOnabort;
    modules[src].onload = props.onload;
    modules[src].onerror = props.onerror;
    modules[src].loading = true;
    request.open(
      "GET",
      [
        src,
        typeof modulesVersion[src] == "string" ? modulesVersion[src] : "",
      ].join(""),
      true
    );
    currentModuleRequest = request;
    currentLoadingModule.src = src;
    var importsKey = symbolIdentifier + "imports",
      dependency = symbolIdentifier + src;
    if (!I4W[importsKey][dependency]) {
      I4W[importsKey][dependency] = [];
    }
    request.send();
  }

  //Uses Ajax to load index files to pages
  function loadPage(src, props) {
    src = typeof requireDict[src] == "string" ? requireDict[src] : src;
    if (modules[src]) {
      if (modules[src].loaded) {
        currentModuleRequest.abort();
        currentModuleRequest = modulesReqObj;
        if (typeof currentLoadingModule.src == "string") {
          modules[currentLoadingModule.src].onload = null;
          modules[currentLoadingModule.src].onerror = null;
          modules[currentLoadingModule.src].loading = false;
        }
        currentLoadingModule.src = src;
        if (modules[src].I4WLoaded) {
          I4W.loadModule(src, props);
        } else {
          modules[src].onload = props.onload;
          modules[src].onerror = props.onerror;
          if (!modules[src].I4WLoading) {
            I4W.reloadModule(src);
          }
        }
      } else {
        if (!modules[src].loading) {
          pageLoader(src, props);
        } else {
          modules[src].onload = props.onload;
          modules[src].onerror = props.onerror;
        }
      }
      return pageLoadAborter(src);
    }
    modules[src] = {
      loaded: false,
      loading: false,
      I4WLoaded: false,
      I4WLoading: false,
      onload: props.onload,
      onerror: props.onerror,
      onabort: props.onabort,
    };
    if (I4W.includesModule(src)) {
      currentModuleRequest.abort();
      if (typeof currentLoadingModule.src == "string") {
        modules[currentLoadingModule.src].onload = null;
        modules[currentLoadingModule.src].onerror = null;
        modules[currentLoadingModule.src].loading = false;
      }
      currentLoadingModule.src = src;
      modules[src].loaded = true;
      modules[src].I4WLoading = true;
      I4W.loadModule(src, {
        onload: scopedI4Wonload(src),
        onerror: scopedI4Wonerror(src),
        args: props.args,
      });
    } else {
      pageLoader(src, props);
    }

    return pageLoadAborter(src);
  }

  //Sends load response (true/false) to module dependencies
  function modulesCallback(result, dependantData) {
    I4W.import[dependantData.pathname].loadResult[dependantData.position] =
      result;
    if (!dependantData.regulator.firstload) {
      dependantData.regulator.requests++;
      if (
        dependantData.regulator.requests ==
        dependantData.regulator.expectedRequests
        /** All requests has returned */
      ) {
        dependantData.regulator.firstload = true;
        if (
          I4W.import[dependantData.pathname].loadResult.indexOf(false) < 0
          /** All dependencies are loaded successfully */
        ) {
          I4W[symbolIdentifier + "currentPathname"] =
            I4W.import[dependantData.pathname].main;
          I4W.import[dependantData.pathname].onload();
          I4W.import[dependantData.pathname].onload = null;
          I4W.import[dependantData.pathname].onerror = null;
          I4W.import[dependantData.pathname].onerrorOnce = null;
        } else {
          var importsKey = symbolIdentifier + "imports",
            i;
          var dependants = I4W[importsKey][dependantData.pathname];
          if (dependants) {
            //Send unsuccessful message to all modules
            //that depends on this particular module.
            for (i = 0; i < dependants.length; i++) {
              modulesCallback(false, dependants[i]);
            }
          }
          if (I4W.import[dependantData.pathname].onerrorOnce) {
            I4W.import[dependantData.pathname].onerrorOnce();
            I4W.import[dependantData.pathname].onerrorOnce = null;
          }
          if (I4W.import[dependantData.pathname].onerror) {
            I4W.import[dependantData.pathname].onerror();
          }
        }
        dependantData.regulator.requests = 0;
      }
    } else {
      if (
        I4W.import[dependantData.pathname].successful.indexOf(
          dependantData.position
        ) < 0
      ) {
        dependantData.regulator.requests++;
      }
      if (
        I4W.import[dependantData.pathname].loadResult.indexOf(false) < 0
        /** All dependencies are loaded successfully */
      ) {
        I4W[symbolIdentifier + "currentPathname"] =
          I4W.import[dependantData.pathname].main;
        I4W.import[dependantData.pathname].onload();
        I4W.import[dependantData.pathname].onload = null;
        I4W.import[dependantData.pathname].onerror = null;
        I4W.import[dependantData.pathname].onerrorOnce = null;
      } else {
        var totalReq =
          dependantData.regulator.requests +
          I4W.import[dependantData.pathname].successful.length;
        if (totalReq == dependantData.regulator.expectedRequests) {
          var importsKey = symbolIdentifier + "imports",
            i;
          var dependants = I4W[importsKey][dependantData.pathname];
          if (dependants) {
            //Send unsuccessful message to all modules
            //that depends on this particular module.
            for (i = 0; i < dependants.length; i++) {
              modulesCallback(false, dependants[i]);
            }
          }
          if (I4W.import[dependantData.pathname].onerror) {
            I4W.import[dependantData.pathname].onerror();
          }
          dependantData.regulator.requests = 0;
        }
      }
    }
  }

  //Reload modules in case of failure after `loadModule()`
  function reloadModule(src) {
    src = typeof requireDict[src] == "string" ? requireDict[src] : src;
    var dependency = symbolIdentifier + src;
    var i;
    if (this.import[dependency] /** Module is already loaded */) {
      if (this.import[dependency].setup /** If module was correctly setup */) {
        if (
          this.import[dependency].loadResult.indexOf(false) >= 0
          /** Could not load dependencies of this module successfully */
        ) {
          /** Reload dependencies that were not loaded successfully */
          for (i = 0; i < this.import[dependency].loadResult.length; i++) {
            if (!this.import[dependency].loadResult[i]) {
              this.reloadModule(this.import[dependency].dependencies[i]);
            }
          }
        }
      }
    } /** The module's file is not loaded at all */ else {
      if (
        !this[symbolIdentifier + "requested"][dependency]
        /** If not in the process loading, request for it */
      ) {
        this[symbolIdentifier + "requested"][dependency] = true;
        document.head.appendChild(loadScripts(src, dependency));
      }
    }
  }
  var inAppModuleLoads = {};
  //Loads modules
  function loadModule(
    src,
    { onload = null, onerror = null, args = undefined }
  ) {
    if (typeof onload == "function") {
      src = typeof requireDict[src] == "string" ? requireDict[src] : src;
      if (!inAppModuleLoads[src]) {
        inAppModuleLoads[src] = {
          listeners: [
            {
              onerror: onerror,
              onload: onload,
              args: args,
            },
          ],
          loaded: false,
          loading: true,
        };
        I4W.pathname = symbolIdentifier + "inAppModuleLoads-" + src;
        I4W.include(src);
        I4W.onerror = (function (src) {
          return function () {
            inAppModuleLoads[src].loading = false;
            var i;
            for (i = 0; i < inAppModuleLoads[src].listeners.length; i++) {
              if (
                typeof inAppModuleLoads[src].listeners[i].onerror == "function"
              ) {
                inAppModuleLoads[src].listeners[i].onerror(
                  inAppModuleLoads[src].listeners[i].args
                );
              }
            }
          };
        })(src);
        I4W.onload = (function (src) {
          return function () {
            inAppModuleLoads[src].loaded = true;
            var i;
            for (i = 0; i < inAppModuleLoads[src].listeners.length; i++) {
              inAppModuleLoads[src].listeners[i].onload(
                inAppModuleLoads[src].listeners[i].args
              );
            }
            inAppModuleLoads[src].listeners = null;
          };
        })(src);
      } else {
        if (inAppModuleLoads[src].loaded) {
          onload(args);
        } else {
          inAppModuleLoads[src].listeners.push({
            onerror: onerror,
            onload: onload,
            args: args,
          });
          if (!inAppModuleLoads[src].loading) {
            inAppModuleLoads[src].loading = true;
            I4W.reloadModule(src);
          }
        }
      }
    }
  }

  var setRequireOnWindow = false;
  var requireDict = {};
  //Enable the use of `require()` to import modules
  function useRequire(requirObj) {
    if (requirObj) {
      requireDict = {
        ...requirObj,
        ...requireDict,
      };
    }
    if (!setRequireOnWindow) {
      setRequireOnWindow = true;
      setFreezedObjectProperty(window, "require", I4W.import.from);
    }
  }

  var modulesVersion = {},
    versioned = false;

  var I4WImportExportModule = {
    /**
     * `I4W.version`
     * Set versions of modules globally. Versions are concantenated to the module's
     * source path everytime it's loaded.
     */
    set version(obj) {
      if (typeof obj == "object" && null != obj && !versioned) {
        setFreezedObjectProperties(modulesVersion, obj);
        versioned = true;
      }
    },
    /**
     * `I4W.export`
     * Export specific named files that can only be imported by name.
     */
    set export(obj) {
      var currentFilename = symbolIdentifier + "currentPathname";
      if (this[currentFilename] == "" /** Resolves to export globally*/) {
        this.global = obj;
      } else {
        var path = symbolIdentifier + this[currentFilename];
        if (
          !this.exports[path]
          /** Ignore if a file tries to export under an existing filename */
          /**Can't export multiple times under the same filename */
        ) {
          setFreezedObjectProperty(
            this.exports,
            path,
            obj
          );
          var importsKey = symbolIdentifier + "imports",
            i;
          var dependants = I4W[importsKey][path];
          if (dependants) {
            //Send successful message to all modules
            //that depends on this particular module.
            for (i = 0; i < dependants.length; i++) {
              this.import[dependants[i].pathname].successful.push(
                dependants[i].position
              );
              modulesCallback(true, dependants[i]);
            }
          }
        }
      }
      this[currentFilename] = "";
      versioned = true;
    },
    /**
     * `I4W.global`
     * Export modules that can be imported without providing the file name of the exporter.
     * These type of exports may be overwritten if there exist name collissions between
     * previuos export and new exports.
     */
    set global(obj) {
      var keys = Object.keys(obj),
        i;
      for (i = 0; i < keys.length; i++) {
        setWritableObjectProperty(this.import.global, keys[i], obj[keys[i]]);
      }
    },
    /**
     * This is used to set file names
     * @param {string} pathname
     */
    set pathname(pathname) {
      if (typeof pathname == "string" && pathname.length > 0) {
        this[symbolIdentifier + "currentPathname"] = pathname;
        if (
          !this.import[symbolIdentifier + pathname]
          /** Ignore if a file tries to register its name as an existing filename */
        ) {
          setFreezedObjectProperty(this.import, symbolIdentifier + pathname, {
            setup: false,
            dependencies: [],
            loadResult: [],
            onload: null,
            onerror: null,
            onerrorOnce: null,
            main: pathname,
            successful: [],
          });
        }
      }
    },
    getPath() {
      return this[symbolIdentifier + "currentPathname"];
    },
    /**
     * Execute your code on load.
     * @param {() => void} cb
     */
    set onload(cb) {
      if (typeof cb == "function") {
        var currentFilename = symbolIdentifier + "currentPathname";
        var path = symbolIdentifier + this[currentFilename];
        if (
          this[currentFilename].length > 0 &&
          !this.import[path].setup &&
          this.import[path].dependencies.length > 0
        ) {
          this.import[path].setup = true;
          this.import[path].onload = cb;
          var docFragment = document.createDocumentFragment(),
            i;
          var returned = {
            requests: 0,
            expectedRequests: this.import[path].dependencies.length,
          };
          var importsKey = symbolIdentifier + "imports",
            dependency,
            inline;
          for (i = 0; i < this.import[path].dependencies.length; i++) {
            dependency = symbolIdentifier + this.import[path].dependencies[i];
            if (!I4W[importsKey][dependency]) {
              I4W[importsKey][dependency] = [];
            }
            if (
              this.import[dependency]
              /** This dependency-module has already been loaded by a different module. */
              /** No need to load again */
            ) {
              
              if (
                this.import[dependency].loadResult.indexOf(false) < 0
                /** Dependencies of the module was successfully loaded */
              ) {
                this.import[path].successful.push(i);
                modulesCallback(true, {
                  pathname: path,
                  position: i,
                  regulator: returned,
                });
              } else {
                /** Could not load all dependencies of the module successfully. Retry. */
                I4W[importsKey][dependency].push({
                  pathname: path,
                  position: i,
                  regulator: returned,
                });
                this.reloadModule(this.import[path].dependencies[i]);
              }
            } /** This dependency-module's file is not loaded at all */ else {
             
              I4W[importsKey][dependency].push({
                pathname: path,
                position: i,
                regulator: returned,
              });
              if (
                !this[symbolIdentifier + "requested"][dependency]
                /** If not in the process loading, request for it */
              ) {
                if (!this.inline_modules) {
                  this[symbolIdentifier + "requested"][dependency] = true;
                  docFragment.appendChild(
                    loadScripts(this.import[path].dependencies[i], dependency)
                  );
                } else {
                  if (
                    (inline =
                      this.inline_modules()[this.import[path].dependencies[i]])
                  ) {
                    inline();
                  } else {
                    this[symbolIdentifier + "requested"][dependency] = true;
                    docFragment.appendChild(
                      loadScripts(this.import[path].dependencies[i], dependency)
                    );
                  }
                }
              }
            }
          }
          document.head.appendChild(docFragment);
        }
        this[currentFilename] = "";
      }
    },
    /**
     *  File specific exports
     *
     * @param {() => void} cb
     */
    set onerror(cb) {
      if (typeof cb == "function") {
        var path =
          symbolIdentifier + this[symbolIdentifier + "currentPathname"];
        if (
          this[symbolIdentifier + "currentPathname"].length > 0 &&
          !this.import[path].setup &&
          this.import[path].dependencies.length > 0
        ) {
          this.import[path].onerror = cb;
        }
      }
    },
    /**
     * File specific exports
     *
     * @param {() => void} cb
     */
    set onerrorOnce(cb) {
      if (typeof cb == "function") {
        var path =
          symbolIdentifier + this[symbolIdentifier + "currentPathname"];
        if (
          this[symbolIdentifier + "currentPathname"].length > 0 &&
          !this.import[path].setup &&
          this.import[path].dependencies.length > 0
        ) {
          this.import[path].onerrorOnce = cb;
        }
      }
    },
  };
  setFreezedObjectProperty(
    setFreezedObjectProperty(window, "I4W", I4WImportExportModule).I4W,
    "loadPage",
    loadPage
  );
  setFreezedObjectProperty(
    setFreezedObjectProperty(I4W, "exports", {}),
    symbolIdentifier + "imports",
    {}
  );
  setFreezedObjectProperty(
    setFreezedObjectProperty(I4W, "import", {}),
    symbolIdentifier + "requested",
    {}
  );
  setFreezedObjectProperty(
    setWritableObjectProperty(I4W, symbolIdentifier + "currentPathname", ""),
    "reloadModule",
    reloadModule
  );
  setFreezedObjectProperty(
    setFreezedObjectProperty(I4W, "loadModule", loadModule),
    "include",
    function I4WExternalImports(src) {
      var currentFilename = symbolIdentifier + "currentPathname";
      var path = symbolIdentifier + I4W[currentFilename];
      if (I4W[currentFilename].length > 0 && !I4W.import[path].setup) {
        I4W.import[path].dependencies.push(
          typeof requireDict[src] == "string" ? requireDict[src] : src
        );
        I4W.import[path].loadResult.push(false);
      }
    }
  );
  setFreezedObjectProperty(
    setFreezedObjectProperty(I4W.import, "global", {}),
    "from",
    function I4WInternalImports(src) {
      var path =
        symbolIdentifier +
        (typeof requireDict[src] == "string" ? requireDict[src] : src);
      return I4W.exports[path];
    }
  );
  setFreezedObjectProperty(
    setFreezedObjectProperty(I4W, "useRequire", useRequire),
    "includesModule",
    function I4WIncludesModule(src) {
      return !!I4W.import[
        symbolIdentifier +
          (typeof requireDict[src] == "string" ? requireDict[src] : src)
      ];
    }
  );
  setFreezedObjectProperty(I4W, "require", I4W.import.from);
})();
