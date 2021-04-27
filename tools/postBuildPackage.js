/**
 * Alias subpath import (`cjs/*`) to top-level path mapping (`faunadb/*`)
 * Build uses `cjs` as explicit output subpath so we generate top-level alias here instead.
 */
const fs = require('fs-extra')
const path = require('path')
const pkg = require('../package.json')

const commonPkgFields = {
  name: pkg.name,
  version: pkg.version,
  apiVersion: pkg.apiVersion,
  description: pkg.description,
  browser: pkg.browser,
}

// rewrite type="modules" for esm5 to support NodeJS
writePkg({
  rootPath: 'esm5',
  pkgManifest: {
    type: 'module',
  },
})

const rootAliases = [
  {
    alias: 'query',
    main: 'query/index.js',
    aliasForFiles: true,
  },
  {
    alias: 'stream',
    main: 'stream.js',
  },
]

rootAliases.forEach(({ alias, aliasForFiles, main }) => {
  ensureDir(alias)
  writePkg({
    rootPath: alias,
    pkgManifest: {
      name: `faunadb/${alias}`,
      types: `../src/types/${alias}.d.ts`,
      main: `../cjs/${main}`,
      module: `../esm5/${main}`,
      es2015: `../src/${main}`,
      sideEffects: false,
    },
  })

  if (aliasForFiles) {
    fs.readdirSync(path.resolve(__dirname, `../cjs/${alias}`)).forEach(file => {
      const [subAlias, ext] = file.split('.')
      if (ext !== 'js' || alias === 'index') return

      const subPath = [alias, subAlias].join('/')
      ensureDir(subPath)
      writePkg({
        rootPath: subPath,
        pkgManifest: {
          name: `faunadb/${subPath}`,
          main: `../../cjs/${subPath}.js`,
          module: `../../esm5/${subPath}.js`,
          es2015: `../../src/${subPath}.js`,
          sideEffects: false,
        },
      })
    })
  }
})

function ensureDir(alias) {
  const rootPath = path.resolve(__dirname, `../${alias}`)
  if (fs.existsSync(rootPath)) {
    fs.removeSync(rootPath)
  }
  fs.ensureDirSync(rootPath)
}

function writePkg({ rootPath, pkgManifest }) {
  fs.writeJSON(
    path.resolve(__dirname, `../${rootPath}/package.json`),
    { ...commonPkgFields, ...pkgManifest },
    { spaces: 2 }
  )
}
