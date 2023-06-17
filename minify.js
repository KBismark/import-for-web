const fs = require('fs');
const path = require('path')
const terser = require('terser')
// Minify code
let min = terser.minify(fs.readFileSync(path.join(__dirname,'/web.js'),'utf8'), {
    sourceMap: {
        filename:`web.js.map`,
        url: `web.js.map`
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
        "quote_style": 0
    },
    mangle: { }
});

min.then(function (output) {
    fs.writeFileSync(
        path.join(__dirname,'/web.min.js'),
        output.code
    )
    output.map = JSON.parse(output.map)
    output.map.sources[0] = `web.js`;
    output.map = JSON.stringify(output.map)
    fs.writeFileSync(
        path.join(__dirname,'/web.js.map'),
        output.map
    )
})
    .catch(function (err) {
    console.log(err);
    throw new Error("Faced problems while minifying code")
})