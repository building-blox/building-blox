/** !
 * @fileOverview A Javascript library for easily creating static websites. BuildingBlox
 * manages project template files for generation of an optimised public directory. Apart from the
 * use of Nunjucks, BuildingBlox is unopinionated, leaving felxibility for the developer to specify
 * dependencies.
 * @version 0.1.0
 * @license
 * Copyright (c) 2019 Richard Lovell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
; (function () {
  'use strict'
  const fs = require('fs')
  const path = require('path');
  var yaml = require('js-yaml');
  const axios = require('axios');
  const write = require('write-data');
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const chalk = require('chalk');
  const info = chalk.keyword('lightblue')
  const success = chalk.keyword('lightgreen')

  const fsUtil = require('./util/fs-util')

  /**
   * Blox class. Prepares building blocks for static site generation including pages, 
   * partials and components. Connects styles, scripts and images for each block.
   */
  class Blox {
    page = {};
    pages = [];
    entry = {};
    bloxConfig = {
      js: `require('../src/assets/js/main.js');\n`,
      images: ''
    };
    itemsPerPage;
    context;
    options;

    projectRoot = path.join(__dirname, '../');
    templatesPath = `${this.projectRoot}src/templates`;
    pagesPath = `${this.templatesPath}/pages`;
    dataPath = `${this.projectRoot}src/data/`;
    sassPath = `${this.projectRoot}/.blox/scss`;
    db = require(`${this.dataPath}db.json`);
    data;

    patterns = {
      sass: /\.(sa|sc|c)ss$/,
      js: /\.js$/,
      images: /\images$/,
      detail: /-detail.njk$/
    }

    defaultEntryPaths = [
      "./.blox/index.js"
    ];
    defaultItemsPerPage = 50;

    constructor(options = {}) {
      this.options = options;
      this.entryPaths = options.entryPaths ? options.entryPaths : this.defaultEntryPaths;
      this.itemsPerPage = options.itemsPerPage ? options.itemsPerPage : this.defaultItemsPerPage;
      this.data = options.data || {};

    }

    /**
     * Set up before template preparation and block connection.
     */
    async setup() {
      fs.closeSync(fs.openSync(`${this.projectRoot}/.blox/index.js`, 'w'))
      await fsUtil.makeDir(`${this.projectRoot}/.blox/scss`);
    }

    /**
     * Load data from external resource. Data will be written to src/data/db.json.
     */
    loadData() {
      return new Promise((resolve, reject) => {
        if (!this.options.dataFetchType || this.options.dataFetchType === "remote") {
          if (!this.options.apiEndpoint) {
            throw new Error('Please provide "apiEndpoint" or set "dataFetchType" to "local"');
          }
          if (!this.options.apiKey) {
            throw new Error('Please provide "apiKey" or set "dataFetchType" to "local"');
          }
        } else {
          if (this.options.dataFetchType !== 'local') {
            throw new Error('Value of dataFetchType must be either "remote" or "local"');
          } else {
            return;
          }
        }

        let dataUrl = `${this.options.apiEndpoint}?apikey=${this.options.apiKey}`;
        axios
          .get(dataUrl)
          .then(async (response) => {
            await write.sync(`${this.dataPath}db.json`, response.data);
            console.log(
              success('Blox: Remote data successfully written to src/data/db.json')
            );
            resolve();
          })
          .catch(function (err) {
            console.log(
              info('Blox: Unable to retreive data. Falling back to local data.', err)
            );
            resolve();
          })
      });
    }

    /**
     * Create context data object to be available for templates.
     */
    async createContext() {
      const appData = await this.getAppData();
      return {
        app: { ...appData },
        db: this.db,
        page: {},
        ...this.data
      };
    }

    /**
     * Create paths for Webpack entry.
     * @param {String} blockName 
     */
    createEntryPaths(blockName) {
      let newEntryPaths = [...this.entryPaths];
      const entryPath = `./.blox/scss/${blockName}.scss`;
      newEntryPaths.push(entryPath);
      this.entry[blockName] = newEntryPaths;
      return newEntryPaths;
    }

    /**
     * Connect images for Blox config.
     * @param {String} blockName 
     * @param {String} path - path to current block
     */
    connectImages(blockFullName, path) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        let fullPath = `${self.templatesPath}${path}/${blockFullName}`;
        let hasImages = await fsUtil.contains(fullPath, self.patterns.images);
        if (hasImages) {
          fs.readdir(`${fullPath}/images`, function (err, files) {
            if (err) {
              return console.log('Unable to scan directory: ' + err);
            }
            files.forEach(function (file) {
              let imagePath = `../src/templates${path}/${blockFullName}/images/${file}`;
              self.bloxConfig.images += `require('${imagePath}');\n`;
            });
            //write JS imports to auto-generated .blox/index.js file
            self.bloxConfig.js += `${self.bloxConfig.images}\n`;
            self.bloxConfig.images = '';
            console.log(
              info(`Blox: Connected ${files.length} images from ${blockFullName}`)
            );
            resolve();
          });
        } else {
          resolve();
        }
      });
    }

    /**
     * Connect the partials and components that are subdirectories of the page directory (local blocks).
     * @param {String} pageName 
     * @param {String} currentBlockPath - Current block path
     * @param {String} blockType 
     */
    async connectPageLocalBlocks(pageFullName, pageName, currentBlockPath, blockType) {
      let self = this;
      return new Promise(function (resolve, reject) {
        let blockPath = `${self.templatesPath}${currentBlockPath}/${blockType}/`;
        fs.stat(blockPath, async function (err, stat) {
          if (err == null) {
            var dirs = fs.readdirSync(blockPath, []);
            if (dirs) {
              for (let i = 0; i < dirs.length; i++) {
                let blockFullName = dirs[i];
                let blockName = self.getShortBlockName(blockFullName);
                await self.connectImages(blockFullName, `${currentBlockPath}/${blockType}`);

                let hasSass = await fsUtil.contains(`${self.templatesPath}${currentBlockPath}/${blockType}/${blockFullName}`, self.patterns.sass);
                if (hasSass) {
                  self.bloxConfig[pageName].sass += self.getSassContent(
                    `local ${blockFullName} block of ${pageFullName}`,
                    `${currentBlockPath}/${blockType}/${blockFullName}/${blockName}`
                  );
                }
                await self.processEntryPoint(pageName, `${self.templatesPath}${currentBlockPath}/${blockType}/${blockFullName}/${blockName}`, `${blockPath}${blockFullName}`)
              }
              console.log(
                info(`Blox: Connected ${dirs.length} ${blockType} for ${pageName} page`)
              );
              resolve()
            }
          } else if (err.code === 'ENOENT') {
            resolve()
          } else {
            resolve()
          }
        });
      })
    }

    /**
     * Connect partial and component blocks that are in the packages directory (global blocks).
     * @param {Array} blocks 
     * @param {String} pageName 
     * @param {String} blockPath 
     */
    connectGlobalBlocks(blocks, connectConfig, blockPath) {
      let self = this;

      return new Promise(async function (resolve, reject) {
        let basePath = `${self.projectRoot}/src/templates/packages${blockPath}`;
        for (let i = 0; i < blocks.length; i++) {
          const blockFullName = blocks[i].name;
          const blockName = self.getShortBlockName(blockFullName);
          await self.connectImages(blockFullName, `/packages${blockPath}`);
          self.bloxConfig[connectConfig.pageName].sass += self.getSassContent(
            `global ${blockFullName} block of ${connectConfig.pageFullName}`,
            `/packages${blockPath}/${blockFullName}/${blockName}`);
          await self.processEntryPoint(connectConfig.pageName, `${self.templatesPath}/packages${blockPath}/${blockFullName}/${blockName}`, `${basePath}/${blockFullName}`)
        }
        console.log(
          info(`Blox: Connected ${blocks.length} global block(s) for ${connectConfig.pageFullName}`)
        );
        resolve();
      });

    }

    /**
     * Get the content for connecting Sass.
     * @param {String} pageName 
     * @param {String} forText 
     * @param {String} pathText 
     */
    getSassContent(forText, pathText) {
      return `\n\n/************\nAuto-generated Sass for ${forText}\n*************/\n@import "../../src/templates${pathText}";`;
    }

    /**
     * Connect all packages of global partial and component blocks as specified in the page's .yaml file.
     * @param {Object} connectConfig 
     */
    connectPagePackages(connectConfig) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        for (let i = 0; i < connectConfig.partialPackages.length; i++) {
          const partialSet = connectConfig.partialPackages[i];
          await self.connectGlobalBlocks(partialSet.blocks, connectConfig, `/partials/${partialSet.name}`);
        }

        for (let i = 0; i < connectConfig.componentPackages.length; i++) {
          const componentSet = connectConfig.componentPackages[i];
          await self.connectGlobalBlocks(componentSet.blocks, connectConfig, `/components/${componentSet.name}`);
        }
        resolve();
      });

    }

    /**
     * Create object used for connecting blocks.
     */
    createBlockConnectionConfig() {
      return {
        sass: '@import "../../src/assets/scss/main";\n',
        images: '',
        hasScripts: false
      }
    }

    /**
     * Connect the local and global partial and component blocks of a page.
     * @param {String} pageName 
     * @param {String} pagePath 
     * @param {Object} sassConfig 
     */
    async connectPage(pageFullName, pageName, currentPagePath, sassConfig) {
      await this.connectImages(pageFullName, `${currentPagePath}`);
      let hasSass = await fsUtil.contains(`${this.pagesPath}${currentPagePath}/${pageFullName}`, this.patterns.sass);
      if (hasSass) {
        //connect page Sass
        this.bloxConfig[pageName].sass += this.getSassContent(
          sassConfig.forText,
          `/pages${currentPagePath}/${pageFullName}${sassConfig.pathText}`
        );
      }

      const layoutPath = '/layout'
      const pagesPath = '/pages'
      //connect layout-scoped partial and component blocks
      await this.connectPageLocalBlocks(pageFullName, pageName, `${layoutPath}`, 'partials');
      await this.connectPageLocalBlocks(pageFullName, pageName, `${layoutPath}`, 'components');

      //connect page-scoped partial and component blocks
      await this.connectPageLocalBlocks(pageFullName, pageName, `${pagesPath}${currentPagePath}/${pageFullName}`, 'partials');
      await this.connectPageLocalBlocks(pageFullName, pageName, `${pagesPath}${currentPagePath}/${pageFullName}`, 'components');

      //connect blocks that have global (project-level) scope
      let connectConfig = await this.getConnectConfig(pageFullName, pageName);
      await this.connectPagePackages(connectConfig);


      //write Sass imports to generated page Sass file
      fs.writeFileSync(`${this.sassPath}/${pageName}.scss`,
        this.bloxConfig[pageName].sass, null, 4);
      console.log(
        success(`Blox: Finished connecting blocks for ${pageName} page`)
      );
    }

    getShortBlockName(fullBlockName) {
      if (!fullBlockName.match(/^((packages)|(blox.(page|partial|component|package).[a-z0-9]+))/)) {
        throw new Error(`Blox: Full block name "${fullBlockName}" should start with this format "blox.<block-type>.<block-name>"`)
      }
      const startSubstring = fullBlockName.substring(fullBlockName.indexOf('.', fullBlockName.indexOf('.') + 1) + 1, fullBlockName.length);//fullBlockName.substring(fullBlockName.indexOf('.') + 1, fullBlockName.length)
      const dotIndex = startSubstring.indexOf('.');
      const endIndex = dotIndex !== -1 ? dotIndex : startSubstring.length;
      return startSubstring.substring(0, endIndex);
    }

    /**
    * Prepare all templates for generation.
    */
    async prepareTemplates(pageDirs, currentPagePath = '/') {
      let self = this;
      return new Promise(async (resolve) => {
        for (let i = 0; i < pageDirs.length; i++) {
          const dirName = pageDirs[i];
          //recursively loop through packages of pages
          if (dirName === 'packages') {
            let packagesPath = `${self.pagesPath}${currentPagePath}packages`;
            //get packages
            const packages = await fsUtil.getDirectories(packagesPath);
            //for each package...
            for (let j = 0; j < packages.length; j++) {
              const currentPath = `${currentPagePath}packages/${packages[j]}`;
              //get package pages
              const packagePages = await fsUtil.getDirectories(`${self.pagesPath}${currentPath}`);
              //prepare the package's pages
              await self.prepareTemplates(packagePages, currentPath);
            }
          } else {
            const pageName = self.getShortBlockName(dirName);
            // let pagePath = self.pagesPath + '/' + dirName;
            let pagePath = `${self.pagesPath}${currentPagePath}/${dirName}`;
            self.entry[pageName] = self.createEntryPaths(pageName);
            let entryConfig = await self.processEntryPoint(pageName, `${pagePath}/${pageName}`, pagePath);

            // let entryConfig = await self.processEntryPoint(pageName, `./src/templates/pages/${dirName}/${pageName}`, pagePath);
            self.bloxConfig[pageName] = self.createBlockConnectionConfig();
            self.bloxConfig[pageName].hasScripts = entryConfig.hasScripts;
            await self.preparePage(dirName, pageName, currentPagePath, entryConfig);
            await self.connectPage(
              dirName,
              pageName,
              `${currentPagePath}`,
              {
                forText: `${dirName} page`,
                pathText: `/${pageName}`
              });

            //process master-detail pattern

            let subDirs = await fsUtil.getDirectories(`${self.pagesPath}${currentPagePath}/${dirName}`);
            // let isMasterDetail = false;
            // find a subfolder with the name "detail"
            for (let i = 0; i < subDirs.length; i++) {
              let subDir = subDirs[i]

              if (subDir === 'detail') {
                let detailPath = `${self.pagesPath}${currentPagePath}${pageName}/${subDir}`;///path.join(self.pagesPath, pageName, subDir)
                if (self.context.db[pageName] && self.context.db[pageName].items) {
                  await self.prepareMasterDetailPages(dirName, pageName, currentPagePath, entryConfig);
                  let detailName = `${pageName}-detail`;
                  self.bloxConfig[detailName] = self.createBlockConnectionConfig();
                  await self.connectPage(
                    dirName,
                    detailName,
                    `${currentPagePath}/detail/`,
                    {
                      forText: `detail page of ${dirName} master page`,
                      pathText: `/detail/${detailName}`
                    });
                  // isMasterDetail = true;
                  break;
                }
              }
            }
          }

        }
        resolve()
      });
    }

    /**
       * Prepare a Page block for generation.
       * @param {String} pageName 
       * @param {Object} entryConfig 
       */
    async preparePage(pageFullName, pageName, currentPagePath, entryConfig) {
      let self = this;
      return new Promise(async (resolve) => {
        self.context = await self.createContext();
        let newPage = {
          name: pageName,
          title: self.context.db[pageName] ? self.context.db[pageName].contentType.pluralName : '',
          rootPage: pageName,
          path: pageName === 'home' ? '' : '../',
          ...entryConfig,
        }
        self.context.page = newPage;
        self.context.db = self.db;
        let page = new HtmlWebpackPlugin({
          blox: self.context,
          filename: pageName === 'home' ? 'index.html' : `${pageName}/index.html`,
          template: `src/templates/pages${currentPagePath}/${pageFullName}/${pageName}.njk`,
          cache: false,
          inject: false
        })
        self.pages.push(page);
        resolve();
        console.log(
          success(`Blox: Prepared ${pageFullName} page`)
        );
      });
    }

    /**
     * Write the connections for Javascript and images.
     */
    async writeBlockConfig() {
      fs.writeFileSync(`${this.projectRoot}/.blox/index.js`,
        this.bloxConfig.js, null, 4);
    }

    /**
     * Get pages for generation.
     * @param {Object} options 
     * @param {String} mode 
     */
    getPages(options, mode) {
      let self = this;
      return new Promise(async (resolve) => {
        await self.setup();
        if (self.options.mode && self.options.mode === 'production') {
          await self.loadData();
        }

        const pageDirs = await fsUtil.getDirectories(this.pagesPath);
        self.prepareTemplates(pageDirs)
          .then(() => {
            self.writeBlockConfig();
            console.log(
              success(`Blox: Finished preparation. Ready to bundle...`)
            );
            resolve(self.pages);
          });
      });
    }

    /**
     * Prepare a pagination page for generation.
     * @param {Object} paginationOptions 
     */
    prepareMasterPage(paginationOptions, currentPagePath, entryConfig) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        let folderPath = paginationOptions.pagesPath + '/' + paginationOptions.folder;
        let i = paginationOptions.index;
        if (i === 0 || i === (paginationOptions.currentPage - 1) * self.itemsPerPage) {
          let offset = i === 0 ? 0 : (paginationOptions.currentPage - 1) * self.itemsPerPage;
          self.context = await self.createContext();
          let newPage = {
            name: paginationOptions.pageName,
            title: self.context.db[paginationOptions.pageName].contentType.pluralName,
            rootPage: paginationOptions.pageName,
            path: '../../',
            ...entryConfig,
            pagination: {
              currentPage: paginationOptions.currentPage,
              total: paginationOptions.noOfItems,
              itemsPerPage: self.itemsPerPage,
              offset: offset
            }
          }
          self.context.page = newPage;
          self.context.db = self.db;
          let page = new HtmlWebpackPlugin({
            blox: self.context,
            filename: `${paginationOptions.pageName}/page-${paginationOptions.currentPage}/index.html`,
            template: `src/templates/pages${currentPagePath}/${paginationOptions.pageFullName}/${paginationOptions.pageName}.njk`,
            cache: false,
            inject: false
          })

          self.pages.push(page);
          resolve();
          console.log(
            success(`Blox: Prepared ${paginationOptions.pageFullName} pagination page`)
          );
        } else {
          resolve();
        }
      })
    }

    getConnectConfig(pageFullName, pageName) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        const pagePath = `src/templates/pages/${pageName}`;
        //page blocks
        const pageYamlPath = `./src/templates/pages/${pageFullName}/${pageName}.yaml`;
        let pageConnectConfig = await self.processBlockConfig(pageName, pageFullName, pageYamlPath);
        //layout blocks
        const layoutYamlPath = `./src/templates/layout/layout.yaml`;
        let layoutConnectConfig = await self.processBlockConfig(pageName, 'layout', layoutYamlPath);
        pageConnectConfig.partialPackages = [...pageConnectConfig.partialPackages, ...layoutConnectConfig.partialPackages];
        pageConnectConfig.componentPackages = [...pageConnectConfig.componentPackages, ...layoutConnectConfig.componentPackages];
        resolve(pageConnectConfig);
      })
    }

    processBlockConfig(pageName, pageFullName, path) {
      return new Promise((resolve, reject) => {
        let blockConfig = {
          partialPackages: [],
          componentPackages: [],
          pageName: pageName,
          pageFullName: pageFullName
        };
        try {
          let file = fs.readFileSync(path, 'utf8');
          yaml.safeLoadAll(file, function (doc) {
            if (!doc.partialPackages && !doc.componentPackages) {
              resolve(blockConfig);
            }
            let newBlockConfig = {
              partialPackages: [],
              componentPackages: [],
              pageName: blockConfig.pageName,
              pageFullName: blockConfig.pageFullName
            };
            newBlockConfig.partialPackages = !doc.partialPackages || !Array.isArray(doc.partialPackages) ? blockConfig.partialPackages : [...doc.partialPackages, ...blockConfig.partialPackages];
            newBlockConfig.componentPackages = !doc.componentPackages || !Array.isArray(doc.componentPackages) ? blockConfig.partialPackages : [...doc.componentPackages, ...blockConfig.componentPackages];
            resolve(newBlockConfig)
          });
        } catch (err) {
          resolve(blockConfig)
        }
      })
    }

    getAppData() {
      let self = this;
      return new Promise(async function (resolve, reject) {
        const appYamlPath = `${self.templatesPath}/app.yaml`;
        let appData = {};
        try {
          let file = fs.readFileSync(appYamlPath, 'utf8');
          yaml.safeLoadAll(file, function (doc) {
            if (!doc.app) {
              resolve(appData);
            }
            appData = { ...doc.app };
            resolve(appData)
          });
        } catch (err) {
          resolve(appData)
        }
      })
    }

    prepareDetailPage(item, detailName, pageName, pageFullName, currentPagePath, detailEntryConfig) {
      let self = this;
      return new Promise(async (resolve) => {
        if (!item.slug) {
          throw new Error('Blox: All items must have a slug');
        }
        self.context = await self.createContext();
        let newPage = {
          name: detailName,
          title: item.title,
          rootPage: pageName,
          path: '../../',
          item: item,
          ...detailEntryConfig
        }

        self.context.page = newPage;
        self.context.db = self.db;
        let page = new HtmlWebpackPlugin({
          blox: self.context,
          filename: `${pageName}/${item.slug}/index.html`,
          template: `src/templates/pages${currentPagePath}/${pageFullName}/detail/${detailName}.njk`,
          cache: false,
          inject: false
        })

        self.pages.push(page);
        resolve();
      });
    }

    /**
     * Prepare master-detail pages for generation.
     * @param {String} pageName 
     * @param {String} subfolder 
     */
    async prepareMasterDetailPages(pageFullName, pageName, currentPagePath, entryConfig) {
      let self = this;
      return new Promise(async (resolve) => {
        const folderPath = path.join(self.pagesPath, currentPagePath, pageFullName, 'detail')
        let hasDetail = await fsUtil.contains(folderPath, self.patterns.detail);
        let items = self.context.db[pageName].items;
        let detailName;
        let detailEntryConfig;
        detailName = `${pageName}-detail`;
        self.entry[detailName] = self.createEntryPaths(detailName);
        detailEntryConfig = await self.processEntryPoint(detailName, `${folderPath}/${detailName}`, folderPath);

        let currentPage = 1;
        for (let i = 0; i < items.length; i++) {
          if (hasDetail) {
            await self.prepareDetailPage(items[i], detailName, pageName, pageFullName, currentPagePath, detailEntryConfig);
          }
          currentPage = Math.ceil((i + 1) / self.itemsPerPage);
          let paginationOptions = {
            pageName: pageName,
            pageFullName: pageFullName,
            templatesPath: self.templatesPath,
            noOfItems: items.length,
            currentPage: currentPage,
            index: i
          };
          await self.prepareMasterPage(paginationOptions, currentPagePath, entryConfig)
        }
        console.log(
          success(`Blox: Prepared ${pageName} detail page`)
        );
        resolve();
      });
    }

    async processEntryPoint(folder, folderPath, basePath) {
      let self = this;
      let hasScripts = await fsUtil.contains(basePath, self.patterns.js);
      if (hasScripts) {
        self.entry[folder].push(`${folderPath}.js`);
      }
      return { hasScripts: hasScripts };
    }

    getContext() {
      return this.context;
    }

    getEntry() {
      return this.entry;
    }
  }

  module.exports = Blox
})()