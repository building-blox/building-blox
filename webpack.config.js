 const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
// const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const path = require('path');
const BuildingBlox = require('building-blox');

module.exports = async (env, argv) => {
  const blox = new BuildingBlox({
    mode: argv.mode,
    apiEndpoint: 'http://localhost:3000/cd/v1/environments/5dcd631170e43026b85628fe/export',
    apiKey: 'FFASSPRFNQQVIMBBJYXEYVBBLI7E4T3RNM4TWOJXOI2X23BWOMYA',
    // apiEndpoint: 'http://api.appyay.com/cd/v1/environments/<appyay_environment_id>/export',
    // apiKey: '<appyay_api_key>',
    itemsPerPage: 2
  });
  
  const pages = await blox.getPages();
  console.log('>>>>>>>>>entry:::', blox.getEntry())
  return {
    mode: argv.mode,
    entry: blox.getEntry(),
    devServer: {
      contentBase: './src',
      open: true
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'assets/js/[name].js'
    },
    module: {
      rules: [
        {
          test: /\.njk$/,
          use: [
            {
              loader: `nunjucks-isomorphic-loader`,
              query: {
                root: [path.resolve(__dirname, './src/templates')]
              }
            }
          ]
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            {
              loader: "sass-loader", options: {
                sassOptions: {
                  sourceMap: true,
                  includePaths: [
                    path.join(__dirname, 'src')
                  ]
                }
              }
            }
          ]
        },
        {
          test: /\.ts(x?)$/,
          enforce: 'pre',
          exclude: /node_modules/,
          use: [
            {
              loader: 'tslint-loader'
            }
          ]
        },
        {
          test: /\.ts(x?)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              query: {
                presets: [
                  '@babel/preset-env'
                ]
              }
            },
            {
              loader: 'ts-loader'
            }
          ]
        },
        {
          enforce: 'pre',
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'eslint-loader'
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          query: {
            presets: [
              '@babel/preset-env'
            ]
          }
        },
        // {
        //   test: /\.(jpe?g|png|gif|svg)$/i,
        //   /* Exclude fonts while working with images, e.g. .svg can be both image or font. */
        //   // exclude: path.resolve(__dirname, '../src/assets/fonts'),
        //   use: [{
        //     loader: 'file-loader',
        //     options: {
        //       name: '[name].[ext]',
        //       outputPath: 'images/'
        //     }
        //   }]
        // },
        // {
        //   test: /\.(woff(2)?|ttf|eot|svg|otf)(\?v=\d+\.\d+\.\d+)?$/,
        //   /* Exclude images while working with fonts, e.g. .svg can be both image or font. */
        //   exclude: path.resolve(__dirname, '../src/assets/images'),
        //   use: [{
        //     loader: 'file-loader',
        //     options: {
        //       name: '[name].[ext]',
        //       outputPath: 'fonts/'
        //     },
        //   },
        {
          test: /\.(png|jpg|gif)$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 8192,
                name: "assets/images/[name].[ext]"
              }
            }
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }]
        }
      ]
    },
    stats: {
      colors: true
    },
    devtool: 'source-map',
    plugins: [
      ...pages,
      new MiniCssExtractPlugin({
        filename: 'assets/css/[name].css'
      }),
      new BrowserSyncPlugin({
        host: 'localhost',
        port: 3000,
        server: { baseDir: ['dist'] }
      }),
      new ExtraWatchWebpackPlugin({
        dirs: ['templates']
      }),
      new RemovePlugin({
        before: {
          include: [
            'dist'
          ],
          trash: false,
          allowRootAndOutside: true
        },
        after: {
          include: [
            'temp'
          ],
          trash: false,
          allowRootAndOutside: true
        }
      }),
      new CopyWebpackPlugin([
        {
          from: './src/assets/images/*',
          to: 'assets/images/',
          flatten: true,
          force: true
        }
      ], { copyUnmodified: true }),
      // new CleanWebpackPlugin()
    ],
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          sourceMap: true,
          parallel: true
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            map: {
              inline: false
            }
          }
        })
      ]
    }
  };
};
