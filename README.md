# Building Blox

[![Lighthouse score: 100/100](https://lighthouse-badge.appspot.com/?score=100)](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Finspiring-sammet-8f8ba9.netlify.com&tab=desktop)

This project is the starting point for creating Building Blox projects. Clone "Blocks" into this project to build your site. 

> Building Blox focuses on facilitating the rapid development of static websites, providing ease of use for developers and it works seamlessly with the [Appyay](https://appyay.com) headless content management system.

## What is a "Block"?

A block is a Github repository representing a:
- page
- partial
- component
- lambda

Page, partial and component blocks can be directly cloned into the project. The README.md file of each block provides additional infomation about installation and block dependencies.

A Lambda block is not the whole repository, just the Javascript file in it. 

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

## Getting Started
### 1. Use this template (click the green "Use this template" button") or,
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

### Data
#### Loading data
Data is kept in JSON format and can be added in three ways:
1. Manually add a ```db.json``` file with your JSON data to the ```data``` folder.
2. Uncomment the lines below in ```webpack.config.js``` and replace the placeholders with your [Appyay](https://appyay.com) credentials:
````
const blox = new BuildingBlox({
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
### Project structure
Building Blox assumes the following ```src``` directory structure:
````
|--src
    |--assets
        |--js
            |--main.js //entry point for global custom Javascript
        |--scss
            |--generated //auto-generated Sass files
            |--_main.scss //entry point for custom Sass styles
    |--data
        |--db.json 
    |--templates
        |--layout
            |--layout.njk
        |--pages
            |--home //home page block
                |--components //page level components go here
                |--home.njk
                |--partials //page level partials go here
    |--sets
        |--components
            |--default //global custom components go here
        |--partials
            |--default //global custom partials go here
````

### Creating Nunjucks templates
[Nunjucks](https://mozilla.github.io/nunjucks/) is used for compiling template files to HTML.

Templates are kept in "src/templates". To make a template, create a file in the templates directory with the ".njk" file extension. 

### Page blocks
Page blocks are added as sub-directories of the "pages" directory and include a .njk file with the same name as the page.

### Partial blocks
Partial blocks are blocks of content that make up a page. Partial blocks can be added to the project in two ways:
1. Inside the ```partials``` directory of a page block.
2. Inside the ```templates/sets/partials/<partial_set_name>``` directory. Use this directory if the partial will be used in more than one place in the project.

#### Component blocks
Component blocks are similar to partial blocks, but use [Nunjucks macros](https://mozilla.github.io/nunjucks/templating.html#macro) to allow for more powerful configuration. Component blocks can be added to the project in two ways:
1. Inside the ```components``` directory of a page block.
2. Inside the ```templates/sets/component/<component_set_name>``` directory. Use this directory if the component will be used in more than one place in the project.

#### Partial templates
Partial templates are HTML files that are preceded with an underscore, and they are defined with Nunjucks blocks:
````
{% block greeting %} 
  <h2>Hi</h2>
{% endblock %}
````
The partial can then be used in your page like so:
````
{% block hello %}{% endblock %}
````
### Layout templates
Each page extends the layout template, so needs to include this:

````
{% extends "layout/layout.html" %}
````
And the content should be wrapped with a content block:
````
{% block content %}
    <p>My page content</p>
{% endblock %}
````

### Frontmatter
The ```page``` object provides metadata about the page. It should be set at the top of every page HTML template file:
````
{% set page = { 
  name: 'home', // page name
  title: 'Home' // title of page
} %}
````
This object is used in the layout template. More properties can be added to this object as needed. 

## Master-detail pattern
Building Blox facilitates the master-detail pattern (i.e. list page and accompanying detail pages for each list item). This is achieved by:
1. Adding a ```detail``` directory to your page block
2. Adding a Nunjucks file to the ```detail``` directory that follows the following name convention: ```<page-name>-detail.njk```.

An example of this is illustrated below:

````
...
    |--pages
    ...
        |--features // page folder
            |--detail 
                |-- features-detail.njk // this is your detail page
            |--index.njk //this is your list (master) page
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
* blox.pagination.offset
* blox.pagination.currentPage
* blox.pagination.total
* blox.pagination.itemsPerPage

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
{% for i in range(blox.pagination.offset, blox.pagination.offset + blox.pagination.itemsPerPage ) %}
    <h2>{{blox.db.features.items[i].fields.title}}</h2>
{% endfor %}
````

### Assets
#### Sass
Sass files are stored in the ````src/assets/scss/```` directory and in the root of page directories. The root Sass file for custom styles is ````src/assets/scss/main.scss````.
Sass files kept at a page/partial/component level (in the templates directory) are automatically compiled and bundled.

#### Javascript
Javascript files can be imported into the ````src/assets/js/main.js```` file and will be bundled into ```public/js/<page-name>.js```.

Javascript files can also be included at page/component level (for example ```home.js```)and will be included in the bundled Javascript.

#### Images
Images can be added to the ````src/assets/images```` folder. This is an example of how to display an image in a template:
````
<img src="{{ blox.page.path }}images/my-image.png" alt="My image"/>
````