const fse = require('fs-extra')
const path = require('path')

const packagesDir = path.resolve(__dirname, '../packages/@tencent')
const docsDir = path.resolve(__dirname, '../docs/guide')

const files = fse.readdirSync(packagesDir)

files.forEach(pkg => {
  if (pkg.charAt(0) === '.') return

  const readmePath = path.join(packagesDir, pkg, `README.md`)
  const pkdDocPath = path.join(packagesDir, pkg, 'docs');
  if(fse.existsSync(pkdDocPath)){
    fse.copy(path.join(pkdDocPath, pkg),  path.join(docsDir, 'docs', pkg))
  }
  if (fse.existsSync(readmePath)) {
    fse.copyFileSync(readmePath, path.join(docsDir, `${pkg}.md`));
  }
})
console.log(files)
fse.copyFileSync(path.resolve(__dirname, '../README.md'), path.resolve(__dirname, '../docs/README.md'))
