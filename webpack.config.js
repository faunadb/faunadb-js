const path = require('path')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const TerserPlugin = require('terser-webpack-plugin')
const { ModifySourcePlugin } = require('modify-source-webpack-plugin')

const entry = path.resolve(__dirname, './src/index.js')

module.exports = env => ({
  entry: {
    faunadb: entry,
    'faunadb.min': entry,
  },
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: 'faunadb',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            envName: 'umd',
          },
        },
      },
    ],
  },
  plugins: [
    new ModifySourcePlugin({
      rules: [
        {
          test: /src\/index\.js$/,
          modify: src => {
            return src.replace(
              /\/\* @replace:umd_imports \(webpack will import all queries and stream api\) \*\//,
              [
                "import * as _query from './query'",
                'export const query = _query',

                "import * as _stream from './stream'",
                'export const Stream = _stream',
              ].join('\r\n')
            )
          },
        },
      ],
    }),
    ...(env.analyze
      ? [
          new BundleAnalyzerPlugin(
            env.stats
              ? {
                  analyzerMode: 'disabled',
                  generateStatsFile: true,
                }
              : {}
          ),
        ]
      : []),
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ test: /\min.js(\?.*)?$/i })],
  },
})
