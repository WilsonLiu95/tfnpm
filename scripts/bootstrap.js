// create package.json and README for packages that don't have one yet

const fs = require('fs')
const path = require('path')
const baseVersion = '1.0.0'

const packagesDir = path.resolve(__dirname, '../packages/')
const files = fs.readdirSync(packagesDir)

files.forEach(pkg => {
  if (pkg.charAt(0) === '.') return

  const desc = `前端基础模块-${pkg}`

  const pkgPath = path.join(packagesDir, pkg, `package.json`)
  if (!fs.existsSync(pkgPath)) {
    const json = {
      'name': `${pkg}`,
      'version': baseVersion,
      'description': desc,
      "license": "MIT",
      "main": "dist/assets-realod.common.js",
      "module": "dist/assets-realod.esm.js",
      "unpkg": "dist/assets-realod.js",
      "jsdelivr": "dist/assets-realod.js",
      'publishConfig': {
        'access': 'public'
      },
      "repository": {
        "type": "git",
        "url": "git@github.com:WilsonLiu95/tfnpm.git"
      },
      'keywords': [
        'tencent',
        'lct','fmp'
      ],
      "author": "wilsonsliu@tencent.com",
      'bugs': {
        'url': 'https://github.com/WilsonLiu95/tfnpm/issues'
      },
      "homepage": "https://github.com/WilsonLiu95/tfnpm#readme",
    }
    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2))
  }

  const readmePath = path.join(packagesDir, pkg, `README.md`)
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# @tencnet/${pkg}\n\n> ${desc}`)
  }

})
