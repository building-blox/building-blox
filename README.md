# Building Blox

[![Lighthouse score: 100/100](https://lighthouse-badge.appspot.com/?score=100)](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Finspiring-sammet-8f8ba9.netlify.com&tab=desktop)

:white_check_mark: Static website generator

:white_check_mark: Reuse website components across projects (add them as git submodules!)

:white_check_mark: Content management system integration

This project is the starting point for creating Building Blox projects. Add git submodules "Blocks" into this project to build your site or remix existing Building Blox sites.

> Building Blox focuses on facilitating the rapid development of static websites, providing ease of use for developers and it works seamlessly with the [Appyay](https://appyay.com) headless content management system.


## Features

Building Blox features include: 

* Page templating (using Nunjucks)
* Sass preprocessing
* CSS concatenation and minification
* Javascript concatenation and uglification
* Multi-browser live browser reload
* Master-detail pattern
* Pagination
* Remote data fetching
* Optional content management system (using [Appyay Headless CMS](https://appyay.com))
* Netlify configuration file
* A modular, reusable design

### :bulb: What is a "Block"?

A block is a Github repository representing one of the following:
- page
- partial
- component
- lambda



## Getting Started
### 1. Use this template (click the green "Use this template" button) or,
#### Clone this repository
```
git clone https://github.com/Building-Blox/building-blox.git
cd building-blox
```

### 2. Install packages
```
npm install
```
NOTE: building-blox.js library is not an NPM package yet so to run the project, you'll need to run:
````
cd building-blox.js
````
````
npm link
````
````
cd ..
````
````
npm link building-blox
````

### 3. Run the development server
```
npm run dev
```
The website will be viewable at http://localhost:3000. On save of the project, output will be compiled and built to the "public" directory and the website will be reloaded.

## How to use

### Project structure
Building Blox assumes the following minimal directory structure:
````
|--src
    |--assets
        |--images
        |--js
            |--main.js
        |--scss
            |--_main.scss
    |--data
        |--db.json 
    |--templates
        |--layout
            |--layout.njk
        |--pages
            |--blox.page.home.<site_name>
                |--home.njk
````

### Adding a new block
Page, partial and component blocks can be added to this project as [git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules).

#### :bulb: Block names
Blocks follow a strict naming convention to make exporting blocks as git repositories easy.

Blocks have the following naming convention:
````
blox.<block_type>.<block_name>
````

:point_right: Example

````
blox.page.home
````
It can optionally be suffixed with the site name:
````
blox.<block_type>.<block_name>.<site_name>
````

#### Adding a page block
> Commands should be run in the *project directory*.

To add a page block, run:
````
git submodule add <git_clone_url> ./src/templates/pages/<block_full_name>
````
:point_right: Example

To add a new home page from the [blox.site.quiz](https://github.com/richjava/blox.site.quiz) site:
````
git submodule add https://github.com/richjava/blox.page.home.quiz.git ./src/templates/pages/blox.page.home.quiz
````

#### Adding a page partial or component block 
> Commands should be run in the *page block directory*.

To add a partial, run:
````
git submodule add <git_clone_url> ./partials/<partial_block_full_name>
````

And for a component, run:
````
git submodule add <git_clone_url> ./components/<component_block_full_name>
````

#### Adding a page package 
> Commands should be run in the *project directory*.

To add a page to a page package:
````
git submodule add <git_clone_url> ./src/templates/pages/packages/<page_package_block_full_name>/<page_block_full_name>
````

#### Adding a page to a page package
> Commands should be run in the *page package block directory*.

To add a page, run:
````
git submodule add <git_clone_url> ./<page_block_full_name>
````

#### Adding a global partial or component package
> Commands should be run in the *project directory*.

> Global blocks need to be specified in the pages ```<page_name>.yaml``` file.

To add a global partial package, run:
````
git submodule add <git_clone_url> ./src/templates/packages/partials/<partial_package_block_full_name>
````

And for a global component package, run:
````
git submodule add <git_clone_url> ./src/templates/packages/components/<component_package_block_full_name>
````

#### Adding a partial or component block to a global partial or component package
> Commands should be run in the *global partial or component package block directory* 
(i.e. src/templates/packages/<partials_or_components>/<partial_or_component_package_block>).

> Global blocks need to be specified in the pages ```<page_name>.yaml``` file.

TO add a global partial, run:
````
git submodule add <git_clone_url> ./<partial_block_full_name>
````

And for a global component, run:
````
git submodule add <git_clone_url> ./<component_block_full_name>
````

#### Adding a Lambda block

To add a Lambda block, just place the block's Javascript file this project's ```functions``` directory.

> The README.md file of each block provides additional infomation about installation and dependencies.

### Global packages
> Global packages allow you to reuse blocks across pages and use "libraries" of blocks.

#### Creating a global package
To create a global package, add a directory to the ```src/templates/packages/partials``` or ```src/templates/packages/components``` directory with the following naming convention for a partial package:
````
blox.partial-package.<partial_package_name>
````
And this convention for a component package:
````
blox.component-package.<component_package_name>
````

#### Connecting global blocks
Building Blox will connect styles and Javascript for the global blocks that you specify. You can configure which blocks to be connect in a page's ```<page_name>.yaml``` file:

````
---
### Uncomment below to connect global blocks
# partialPackages:
      #  - name: <partial_package_name, i.e. blox.partial-package.navigation>
      #    blocks:
      #       - name: <partial_block_name, i.e. blox.partial.nav.quiz>
# componentPackages:
      #  - name: <component_package_name, i.e. blox.package.bootstrap>
      #    blocks:
      #       - name: <component_block_name, i.e. blox.component.pagination>
````

### Page packages
> Page packages are used for keeping sets of related pages together.

#### Creating a page package
To create a page package add a directory to the ```src/templates/pages/packages``` directory with the following naming convention:
````
blox.page-package.<page_package_name>
````
Add pages to this directory and they will be processed in the same manner as those in the ```pages``` parent directory.

### Data
#### Loading data
Data is kept in JSON format and can be added in three ways:
1. Manually add a ```db.json``` file with your JSON data to the ```data``` folder.
2. Uncomment the lines below in ```webpack.config.js``` and replace the placeholders with your [Appyay](https://appyay.com) credentials:

````
const Blox = require('building-blox');
const blox = new Blox({
    mode: argv.mode,
    // apiEndpoint: 'http://api.appyay.com/cd/v1/environments/<appyay_environment_id>/export',
    // apiKey: '<appyay_api_key>'
  });
````

Then run ```npm run build``` to load the remote data.

#### Database
The database data for the application is located at data/db.json. This data can be repopulated every time the project builds, so you can have dynamic data if used in combination with static hosting services, webhooks and a headless CMS.

Data in this file should be in the following format (using "features" as an example):
````
{
    "features": {
        "items":  [
            {
                "id": "abc123",
                ...
            }
        ]
    }
}

````
#### The blox object
The global ```blox``` object should be set at the top of every page template and it will be available to all templates in the page:
{% set blox = htmlWebpackPlugin.options.blox %}

The ```blox``` object has the following properties:

| Property name | Description                                               |
| ------------- |:---------------------------------------------------------:|
| app           | Application related data from src/templates/app.yaml file |
| db            | Database data from src/data/db.json                       | 
| page          | Page related metadata                                     | 

### The page object
The ```blox.page``` object provides metadata about the page and can be accessed in any template.

The ```blox.page``` object has the following properties:

| Property name | Description                                               |
| ------------- |:---------------------------------------------------------:|
| name          | Page name (slug)                                          |
| rootPage      | Root page name for detail pages                           |
| title         | Page title (if available)                                 | 
| path          | Used to prefix paths for images, etc.                     |

### Creating Nunjucks templates
[Nunjucks](https://mozilla.github.io/nunjucks/) is used for compiling template files to HTML.

Template files end with the ".njk" file extension and share the name of the block.

:point_right: Example
````
home.njk
````
The exception to this is detail pages (see below);

### Page blocks
Page blocks are added as sub-directories of the "pages" directory and include a .njk file with the same name as the page.

#### Including global blocks in templates
You can include a global partial in a template like so:
````
{% include "packages/partials/blox.partial-package.<package>/blox.partial.<partial>/<partial>.njk" %}
````

:point_right: Example

````
{% include "packages/partials/blox.partial-package.navigation/blox.partial.nav.quiz/nav.njk" %}
````

And to add a global component:
````
{% include "packages/components/blox.component-package.<package>/blox.component.<component>/<component>.njk" %}
````

#### Page templates
Each page extends the layout template, so needs to include this:

````
{% extends "layout/layout.html" %}
````
And the content of every page should be wrapped with a content block:
````
{% block content %}
    <p>My page content</p>
{% endblock %}
````
 

### Master-detail pattern
Building Blox facilitates the master-detail pattern (i.e. list page and accompanying detail pages for each list item). This is achieved by:
1. Adding a ```detail``` directory to your page block
2. Adding a Nunjucks file to the ```detail``` directory that follows the following name convention: ```<page-name>-detail.njk```.

:point_right: Example

````
...
    |--pages
    ...
        |--features // page folder
            |--detail 
                |-- features-detail.njk // this is your detail page
                |-- ..
            |--features.njk //this is your list (master) page
            |-- ..
...
````

So, if a feature item from your database has an slug of "my-feature", the detail page would now be accessible at:

````
http://localhost:3000/features/my-feature
````
The item for display on the detail page can be accessed through the ```blox.db.item``` variable.

### List (master) templates
The list template will be the ```<page-name>.njk``` file in the root of the page folder. The items to needed to form the list can be accessed through the global ```blox.db``` global variable. For example, in your list template:

````
{% for feature in blox.db.features.items %}
  <h2>{{feature.fields.title}}</h2>
{% endfor %}
````

#### Pagination
The following variables will be available in list templates for facilitating pagination of list items:
* blox.page.pagination.offset
* blox.page.pagination.currentPage
* blox.page.pagination.total
* blox.page.pagination.itemsPerPage

The default number of items per page is 50. To specify another value, pass it into BuildingBlox in ```webpack.config.js```:

````
const itemsPerPage = 20;
const blox = new BuildingBlox({
    ...
    itemsPerPage: itemsPerPage,
    ...
  });
````

In your list template, you can loop through items in a range like so:

````
{% for i in range(blox.pagination.offset, blox.pagination.offset + blox.page.pagination.itemsPerPage ) %}
    <h2>{{blox.db.features.items[i].fields.title}}</h2>
{% endfor %}
````

### Assets
#### Sass
Sass files are stored in the ````src/assets/scss/```` directory and in the root of page directories. The root Sass file for custom styles is ````src/assets/scss/_main.scss````.
Sass files kept at a page/partial/component level (in the templates directory) are automatically compiled and bundled.

#### Javascript
Javascript files can be imported into the ````src/assets/js/main.js```` file and will be bundled into ```public/js/<page-name>.js```.

Javascript files can also be included at page/component level (for example ```home.js```)and will be included in the bundled Javascript.

#### Images
Images can be added to the ````src/assets/images```` folder. This is an example of how to display an image in a template:
````
<img src="{{ blox.page.path }}images/my-image.png" alt="My image"/>
````