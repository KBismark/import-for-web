/* These lines of code are importing the `fs` and `path` modules from the Node.js standard library. */
const fs = require('fs');
const path = require('path');
/* The line `const { parseStylesDirectory, baseDirectory } = require('./parse.js');` is importing the
`parseStylesDirectory` and `baseDirectory` variables from the `parse.js` file. This allows the
current file to access and use these variables in its own code. */
const { parseStylesDirectory, baseDirectory } = require('./parse.js');

//Parse styles
parseStylesDirectory();

const fileExtensions = ["css"];

var watchersFD = {};
/**
 * The function `watcher` is a recursive function that watches a directory for changes and can also
 * watch individual files within that directory.
 * @param dir - The `dir` parameter is a string that represents the directory path where the files or
 * directories are located.
 * @param watch - A boolean value indicating whether to start or stop watching the directory.
 * @param isFile - The `isFile` parameter is a boolean value that indicates whether the current
 * directory being watched is a file or a directory. If `isFile` is true, it means the current
 * directory is a file and the function will return without further processing. If `isFile` is false,
 * it means
 * @returns If the `watch` parameter is false and `isFile` is true, the function will return without
 * any value. Otherwise, it will not return anything.
 */
function watcher(dir,watch,isFile){
    /* The code block is checking if the `watch` parameter is `false`. If it is `false`, it means that
    the function is being called to stop watching the directory. */
    if(!watch){
        try {
            // Close watcher if file is already being watched
            watchersFD[dir].close();
        } catch (error) {
            // Closing unwatched file would cause error.
            // Catch error
        }
        if(isFile){
            return
        }
    }
    /* This code block is responsible for watching a directory for changes and performing certain
    actions when a change is detected. */
    var contents,pathname,mainPath,err=false;
    try {
        contents = fs.readdirSync(dir,"utf8");
    } catch (error) {
        err = true;
    }
    if(!err){
        if(watch){
            /* The code block is iterating over the `contents` array, which contains the names of files
            and directories in the specified directory (`dir`). */
            for(var i = 0;i<contents.length;i++){
                pathname = contents[i].split(".").pop();
                var is_dir = !(fileExtensions.includes(pathname));
                if(is_dir){
                    watcher(path.join(dir,"/"+contents[i]),true);
                }else{
                    watchFile(path.join(dir,"/"+contents[i]));
                }
            }

            let emitted = false;
            /* The code block is creating a watcher for a specific directory (`dir`). The watcher
            listens for changes in the directory and performs certain actions when a change is
            detected. */
            watchersFD[dir] = fs.watch(dir,function(event,filename){
                    if(!emitted){
                        emitted = true;
                        var is_dir = !(fileExtensions.includes(filename.split(".").pop()));
                        try {
                            if(is_dir){
                                fs.readdirSync(path.join(dir,filename));
                            }
                        } catch (error) {
                            // Encounted error testing if it was a directory 
                            //TODO: 
                            // - Handle situation
                            
                        }
                        //watcher(dir,false,false);
                        if (!fs.existsSync(dir)) {
                           try {
                            watchersFD[dir].close()
                            } catch (error) { }
                            watchersFD[dir] = null;
                            delete watchersFD[dir];
                        } else {
                            setTimeout(() => {
                                //watcher(dir,true);
                                emitted = false;
                            }, 50);
                        }
                        
                    }
                
            }).on("error",function(error){
                if(error.code=='EPERM'&&error.syscall=='watch'&&error.filename===null){

                }
            }).on("close", function () {
                watchersFD[dir] = null;
                delete watchersFD[dir];
            });

        }else{
            /* The code block is iterating over the `contents` array, which contains the names of files
            and directories in the specified directory (`dir`). */
            for(var i = 0;i<contents.length;i++){
                pathname = contents[i].split(".").pop();
                var is_dir = !(fileExtensions.includes(pathname));
                mainPath = path.join(dir,"/"+contents[i]);
                if(is_dir){
                    if(watchersFD[mainPath]){
                        watcher(mainPath,false);
                    }
                }else{
                    if(watchersFD[mainPath]){
                        watcher(mainPath,false,true);
                    }
                }
            }
        }
    } else {
        // system error
    }
}

/**
 * The function `watchFile` is used to watch a file for changes and perform certain actions when the
 * file is modified.
 * @param filename - The filename parameter is the name of the file that you want to watch for changes.
 * @param wait - The `wait` parameter is a boolean value that determines whether the function should
 * wait for a certain period of time before executing the code inside the `setTimeout` function. If
 * `wait` is `true`, the function will wait for 50 milliseconds before executing the code inside the
 * `setTimeout` function.
 */
function watchFile(filename,wait){
    let emmited = false;
   /* This code block is checking if there is already a watcher for the specified file (`filename`) in
   the `watchersFD` object. If there is, it closes the existing watcher by calling the `close()`
   method on the watcher object. This is done to ensure that only one watcher is active for each
   file at a time. */
    if(watchersFD[filename]){
        try {
            watchersFD[filename].close()
        } catch (error) {
            
        }
    }
    /* The code block is creating a watcher for a specific file (`filename`). */
    watchersFD[filename] = fs.watch(filename,function(event,f_name){
        if(!emmited){
            emmited = true;
            //watcher(filename,false,true);
            if (!fs.existsSync(filename)) {
                try {
                 watchersFD[filename].close()
                 } catch (error) { }
                 watchersFD[filename] = null;
                 delete watchersFD[filename];
            } else {
                setTimeout(() => {
                     // watchFile(filename);
                     emmited = false;
                }, 50);
                parseStylesDirectory();
             }
           
        }
    }).on("close", function () {
        watchersFD[filename] = null;
        delete watchersFD[filename];
    });
}

/* The line `watcher(path.join(baseDirectory, "/src/styles"), true, false);` is calling the `watcher`
function with three arguments: the directory path, a boolean value indicating whether to start
watching the directory, and a boolean value indicating whether the directory is a file or a
directory. */
watcher(path.join(baseDirectory, "/src/styles"), true, false);

module.exports = { };

