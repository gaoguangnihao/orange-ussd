var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  resolve: {
    modules: [
      path.join(__dirname, './src'),
      path.join(__dirname, './scss'),
      path.resolve(__dirname, 'node_modules')
    ],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'soft-key-store': path.resolve('./node_modules/soft-key-store'),
      'base-component': path.resolve('./node_modules/base-component'),
      'base-module': path.resolve('./node_modules/base-module'),
      'settings-manager': path.resolve('./node_modules/settings-manager'),
      'service': path.resolve('./node_modules/service')
    }
  },
  entry: {
    app: './src/app.js'
  },
  output: {
    path: path.resolve('./dist'),
    filename: 'bundle.js',
    publicPath: 'dist/'
  },
  module: {
    rules: [
      {
        test: /.jsx?$/,
        use: [{
          loader: 'babel-loader',
          query: {
            presets: ['react', 'es2015', 'stage-0']
          }
        }]
      },
      {
        test: /\.(scss|css)$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [{
            loader: 'css-loader' // translates CSS into CommonJS
          }, {
            loader: 'sass-loader' // compiles Sass to CSS
          }],
          publicPath: './'
        })
      },
      {
        test: /\.(ttf|eot|png|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name]-[hash:6].[ext]'
          }
        }]
      },
      {
        test: /\.properties$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]'
          }
        }]
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin({
      filename: 'style.css',
      allChunks: true
    })
  ],
  devtool: '#source-map'
};
