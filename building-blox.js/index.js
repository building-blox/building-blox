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

  class Blox {
    page = {};
    pages = [];
    pageNames = [];
    entry = {};
    blockUtilConfig = { images: '' };
    itemsPerPage;
    context;
    options;

    projectRoot = path.join(__dirname, '../')
    templatesPath = `${this.projectRoot}src/templates`
    pagesPath = `${this.templatesPath}/pages`
    dataPath = `${this.projectRoot}src/data/`;
    db = require(`${this.dataPath}db.json`);
    data = this.data;

    patterns = {
      sass: /\.(sa|sc|c)ss$/,
      js: /\.js$/,
      images: /\images$/
    }

    defaultEntryPaths = [
      "./src/assets/js/main.js"
    ];
    defaultItemsPerPage = 50;

    constructor(options = {}) {
      this.options = options;
      this.entryPaths = options.entryPaths ? options.entryPaths : this.defaultEntryPaths;
      this.itemsPerPage = options.itemsPerPage ? options.itemsPerPage : this.defaultItemsPerPage;
      this.data = options.data || {};

    }

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
          .catch(function (error) {
            reject(error)
          })
      });
    }

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
     * Get directory names (Blocks are directories within the templates directory).
     * @param {String} dir
     */
    getDirectories(dir) {
      return new Promise((resolve) => {
        let directories = fs.readdirSync(dir).filter(function (file) {
          return fs.statSync(path.join(dir, file)).isDirectory()
        })
        resolve(directories);
      });
    }

    createEntryPaths(blockName) {
      let newEntryPaths = [...this.entryPaths];
      const entryPath = `./temp/scss/${blockName}.scss`;
      newEntryPaths.push(entryPath);
      this.entry[blockName] = newEntryPaths;
      return newEntryPaths;
    }

    makeDir(path) {
      return new Promise(async function (resolve, reject) {
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        resolve();
      });
    }

    connectImages(blockName, path) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        let fullPath = `${self.templatesPath}${path}/${blockName}`;
        console.log('full path:', fullPath)
        let hasImages = await self.contains(fullPath, self.patterns.images);
        if (hasImages) {
          console.log('has images:', fullPath)
          fs.readdir(`${fullPath}/images`, function (err, files) {
            if (err) {
              return console.log('Unable to scan directory: ' + err);
            }
            files.forEach(function (file) {
              self.blockUtilConfig.images += `require("../src/templates${path}/${blockName}/images/${file}");\n`;
            });
            //write JS imports to auto-generated temp/temp.js file
            fs.writeFileSync(`${self.projectRoot}/temp/temp.js`,
              self.blockUtilConfig.images, null, 4);
            console.log(
              info(`Blox: Connected ${blockName} images`)
            );
            resolve();
          });
        } else {
          resolve();
        }
      });
    }

    async connectPageLocalBlocks(pageName, path, blockType) {
      let self = this;
      return new Promise(function (resolve, reject) {
        let blockPath = `${self.projectRoot}/src/templates${path}/${blockType}/`;
        fs.stat(blockPath, async function (err, stat) {
          if (err == null) {
            var dirs = fs.readdirSync(blockPath, []);
            if (dirs) {
              for (let i = 0; i < dirs.length; i++) {
                let blockName = dirs[i];
                await self.connectImages(blockName, `/pages/${pageName}/${blockType}`);
                let hasSass = await self.contains(`${blockPath}/${blockName}`, self.patterns.sass);
                if (hasSass) {
                  self.blockUtilConfig[pageName].sass += self.getSassContent(
                    pageName,
                    `${blockName} block of ${pageName} page`,
                    `${path}${blockType}/${blockName}/${blockName}`
                  );
                }
                await self.processEntryPoint(pageName, `./src/templates/pages${path}${blockType}/${blockName}/${blockName}`, `${blockPath}${blockName}`)
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

    async connectGlobalBlocks(blocks, pageName, blockPath) {
      let basePath = `${this.projectRoot}/src/templates/sets${blockPath}`;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        this.blockUtilConfig[pageName].sass += this.getSassContent(
          pageName,
          `global ${block.name} block of ${pageName} page`,
          `/sets${blockPath}/${block.name}/${block.name}`);
        await this.processEntryPoint(pageName, `./src/templates/sets${blockPath}/${block.name}/${block.name}`, `${basePath}/${block.name}`)
      }
      console.log(
        info(`Blox: Connected ${blocks.length} global block(s) for ${pageName} page`)
      );
    }

    getSassContent(pageName, forText, pathText) {
      return `\n\n/************\nAuto-generated Sass for ${forText}\n*************/\n@import "../../src/templates${pathText}";`;
    }

    async connectPageGlobalBlocks(setConfig) {
      for (let i = 0; i < setConfig.partialSets.length; i++) {
        const partialSet = setConfig.partialSets[i];
        this.connectGlobalBlocks(partialSet.blocks, setConfig.pageName, `/partials/${partialSet.name}`);
      }

      for (let i = 0; i < setConfig.componentSets.length; i++) {
        const componentSet = setConfig.componentSets[i];
        this.connectGlobalBlocks(componentSet.blocks, setConfig.pageName, `/components/${componentSet.name}`);
      }
    }

    createBlockUtilConfig() {
      return {
        sass: '@import "../../src/assets/scss/main";\n@import "../../src/templates/layout/layout";\n',
        // sass: '@import "../main";\n@import "../../../templates/layout/layout";\n',
        images: '',
        hasScripts: false
      }
    }

    async connectPage(pageName, pagePath, sassConfig) {

      await this.connectImages(pageName, '/pages');
      let hasSass = await this.contains(`${this.pagesPath}/${pageName}`, this.patterns.sass);
      if (hasSass) {
        //connect page Sass
        this.blockUtilConfig[pageName].sass += this.getSassContent(
          pageName,
          sassConfig.forText,
          sassConfig.pathText
        );
      }

      const layoutPath = '/layout/'
      //connect layout-scoped partial and component blocks
      await this.connectPageLocalBlocks(pageName, layoutPath, 'partials');
      await this.connectPageLocalBlocks(pageName, layoutPath, 'components');

      //connect page-scoped partial and component blocks
      await this.connectPageLocalBlocks(pageName, pagePath, 'partials');
      await this.connectPageLocalBlocks(pageName, pagePath, 'components');

      //connect blocks that have global (project-level) scope
      let blockConfig = await this.getBlockConfig(pageName);
      await this.connectPageGlobalBlocks(blockConfig);
      const sassPath = `${this.projectRoot}/temp/scss`;
      await this.makeDir(`${this.projectRoot}/temp/scss`);
      //write Sass imports to generated page Sass file
      fs.writeFileSync(`${sassPath}/${pageName}.scss`,
        this.blockUtilConfig[pageName].sass, null, 4);
      console.log(
        success(`Blox: Finished connecting blocks for ${pageName} page`)
      );
    }

    /**
    * Prepare all templates for generation.
    */
    async prepareTemplates() {
      let self = this;
      return new Promise(async (resolve) => {
        for (let i = 0; i < self.pageNames.length; i++) {
          const pageName = self.pageNames[i]
          let pagePath = self.pagesPath + '/' + pageName;

          self.entry[pageName] = self.createEntryPaths(pageName);
          let entryConfig = await self.processEntryPoint(pageName, `./src/templates/pages/${pageName}/${pageName}`, pagePath);
          self.blockUtilConfig[pageName] = self.createBlockUtilConfig();
          self.blockUtilConfig[pageName].hasScripts = entryConfig.hasScripts;
          await self.preparePage(pageName, entryConfig);
          await self.connectPage(
            pageName,
            `/pages/${pageName}/`,
            {
              forText: `${pageName} page`,
              pathText: `/pages/${pageName}/${pageName}`
            });

          //process master-detail pattern

          let subDirs = await self.getDirectories(self.pagesPath + '/' + pageName)
          let isMasterDetail = false;
          // find a subfolder with the name "detail"
          for (let i = 0; i < subDirs.length; i++) {
            let subDir = subDirs[i]
            if (subDir === 'detail') {
              let detailPath = path.join(self.pagesPath, pageName, subDir)
              if (self.context.db[pageName] && self.context.db[pageName].items) {
                await self.prepareDetailPages(pageName, entryConfig);
                let detailName = `${pageName}-detail`;
                self.blockUtilConfig[detailName] = self.createBlockUtilConfig();
                await self.connectPage(
                  detailName,
                  `/pages/${pageName}/detail/`,
                  {
                    forText: `detail page of ${pageName} master page`,
                    pathText: `/pages/${pageName}/detail/${detailName}`
                  });
                isMasterDetail = true;
                break;
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
    async preparePage(pageName, entryConfig) {
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
          template: `src/templates/pages/${pageName}/${pageName}.njk`,
          cache: false,
          inject: false
        })
        self.pages.push(page);
        resolve();
        console.log(
          success(`Blox: Prepared ${pageName} page for generation`)
        );
      });
    }

    getPages(options, mode) {
      let self = this;
      return new Promise(async (resolve) => {
        if (self.options.mode && self.options.mode === 'production') {
          await self.loadData();
        }

        this.pageNames = await this.getDirectories(this.pagesPath);
        self.prepareTemplates()
          .then(() => {
            console.log(
              success(`Blox: Finished preparation. Ready for generation...`)
            );
            resolve(self.pages);
          });
      });
    }

    /**
     * Prepare a pagination page for generation.
     * @param {Object} paginationOptions 
     */
    preparePaginationPage(paginationOptions, entryConfig) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        let folderPath = paginationOptions.pagesPath + '/' + paginationOptions.folder;
        let i = paginationOptions.index;
        if (i === 0 || i === (paginationOptions.currentPage - 1) * self.itemsPerPage) {
          let offset = i === 0 ? 0 : (paginationOptions.currentPage - 1) * self.itemsPerPage;
          self.context = await self.createContext();
          let newPage = {
            name: paginationOptions.folder,
            title: self.context.db[paginationOptions.folder].contentType.pluralName,
            rootPage: paginationOptions.folder,
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
            filename: `${paginationOptions.folder}/page-${paginationOptions.currentPage}/index.html`,
            template: `src/templates/pages/${paginationOptions.folder}/${paginationOptions.folder}.njk`,
            cache: false,
            inject: false
          })

          self.pages.push(page);
          resolve();
          console.log(
            success(`Blox: Prepared ${paginationOptions.folder} pagination psuccessage for generation`)
          );
        } else {
          resolve();
        }
      })
    }

    contains(path, pattern) {
      let self = this;
      return new Promise(function (resolve, reject) {
        try {
          let files = fs.readdirSync(`${path}`).filter(function (file) {
            return file.match(pattern);
          });
          resolve(files.length > 0);
        } catch (error) {
          resolve(false);
        }

      })
    }

    getBlockConfig(pageName) {
      let self = this;
      return new Promise(async function (resolve, reject) {
        const pagePath = `./src/templates/pages/${pageName}`;
        let blockConfig = {
          partialSets: [],
          componentSets: [],
          pageName: pageName
        };
        const pageYamlPath = `${self.projectRoot}${pagePath}/${pageName}.yaml`;
        blockConfig = await self.processBlockConfig(blockConfig, pageYamlPath);
        resolve(blockConfig);
      })
    }

    processBlockConfig(blockConfig, path) {
      return new Promise((resolve, reject) => {
        try {
          let file = fs.readFileSync(path, 'utf8');
          yaml.safeLoadAll(file, function (doc) {
            if (!doc.partialSets && !doc.componentSets) {
              resolve(blockConfig);
            }
            let newBlockConfig = {
              partialSets: [],
              componentSets: [],
              pageName: blockConfig.pageName
            };
            newBlockConfig.partialSets = !doc.partialSets || !Array.isArray(doc.partialSets) ? blockConfig.partialSets : [...doc.partialSets, ...blockConfig.partialSets];
            newBlockConfig.componentSets = !doc.componentSets || !Array.isArray(doc.componentSets) ? blockConfig.partialSets : [...doc.componentSets, ...blockConfig.componentSets];
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

    /**
     * Prepare detail pages for generation.
     * @param {String} pageName 
     * @param {String} subfolder 
     */
    async prepareDetailPages(pageName, entryConfig) {
      let self = this;
      return new Promise(async (resolve) => {
        const folderPath = path.join(self.templatesPath, pageName, 'detail')
        let items = self.context.db[pageName].items;
        let detailName = `${pageName}-detail`;

        self.entry[detailName] = self.createEntryPaths(detailName);
        let detailEntryConfig = await self.processEntryPoint(detailName, `${folderPath}/${detailName}`, folderPath);

        let currentPage = 1;
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
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

          currentPage = Math.ceil((i + 1) / self.itemsPerPage);
          let paginationOptions = {
            folder: pageName,
            templatesPath: self.templatesPath,
            noOfItems: items.length,
            currentPage: currentPage,
            index: i
          };

          let page = new HtmlWebpackPlugin({
            blox: self.context,
            filename: `${pageName}/${item.slug}/index.html`,
            template: `src/templates/pages/${pageName}/detail/${detailName}.njk`,
            cache: false,
            inject: false
          })

          self.pages.push(page);
          await self.preparePaginationPage(paginationOptions, entryConfig)
        }
        console.log(
          success(`Blox: Prepared ${pageName} detail page for generation`)
        );
        resolve();
      });
    }

    async processEntryPoint(folder, folderPath, basePath) {
      let self = this;
      let hasScripts = await self.contains(basePath, self.patterns.js);
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