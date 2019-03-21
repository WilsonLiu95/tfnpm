const path = require('path')
const fs = require('fs')
const camelize = require('camelize')

const buble = require('rollup-plugin-buble')
const cjs = require('rollup-plugin-commonjs')
// const babel = require('rollup-plugin-babel')
const node = require('rollup-plugin-node-resolve')
const replace = require('rollup-plugin-replace')



module.exports = function (repoPath) {
  const packageJson = require(path.join(repoPath, 'package.json'))
  const version = process.env.VERSION || packageJson.version
  const resolve = _path => path.resolve(repoPath, _path);
  const {
    name,
    author,
    description
  } = packageJson
  const moduelName = name.replace('@tencent/', '')
  const banner = `/*!
    * ${name} v${version}
    * (c) ${new Date().getFullYear()} ${author}
    * @description ${description}
    * @license MIT
    */`
  if (!fs.existsSync(resolve('dist'))) {
    fs.mkdirSync(resolve('dist'))
  }

  function genConfig(opts) {
    const config = {
      input: {
        input: resolve('src/index.js'),
        plugins: [
          node(),
          cjs(),
          replace({
            __VERSION__: version
          }),
          // babel()
          buble()
        ]
      },
      output: {
        file: opts.file,
        format: opts.format,
        banner,
        name: camelize(moduelName)
      }
    }

    if (opts.env) {
      config.input.plugins.unshift(replace({
        'process.env.NODE_ENV': JSON.stringify(opts.env)
      }))
    }

    return config
  }

  return [
    // browser dev
    {
      file: resolve(`dist/${moduelName}.js`),
      format: 'umd',
      env: 'development'
    }, {
      file: resolve(`dist/${moduelName}.min.js`),
      format: 'umd',
      env: 'production'
    }, {
      file: resolve(`dist/${moduelName}.common.js`),
      format: 'cjs'
    }, {
      file: resolve(`dist/${moduelName}.esm.js`),
      format: 'es'
    }
  ].map(genConfig)
}
