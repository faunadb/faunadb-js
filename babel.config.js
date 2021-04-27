module.exports = {
  env: {
    umd: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'umd',
            useBuiltIns: 'usage',
            targets: {
              browsers: ['>0.2%', 'not dead', 'not op_mini all'],
            },
            bugfixes: true,
            corejs: 3,
            debug: true,
          },
        ],
      ],
    },
    cjs: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'cjs',
            targets: {
              node: '10.24.0',
            },
            useBuiltIns: 'usage',
            corejs: 3,
          },
        ],
      ],
    },
    esm: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            targets: {
              node: '10.24.0',
            },
            useBuiltIns: 'usage',
            corejs: 3,
          },
        ],
      ],
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'cjs',
            targets: {
              node: 'current',
            },
            useBuiltIns: 'usage',
            corejs: 3,
          },
        ],
      ],
    },
  },
}
