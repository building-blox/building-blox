# Jen

> Jen is a lightweight Javascript library for rapid development of static websites. It was built with a focus on ease of use for developers and working seamlessly with headless APIs and static website hosting.

This project was originally conceived to enable producing a static website from an existing HTML template an easy and intuitive process.

## How does it work?
Jen leverages Mozilla's rich and powerful [Nunjucks](https://mozilla.github.io/nunjucks/) templating language together with Gulp tasks to manage project template files and generate a public directory. Data for the application is retrieved from a JSON data file in the project, making it especially suitable for building API driven websites. The data file can be populated on-demand during development or on-build for in-production static websites.

Aside from Nunjucks and Gulp, Jen is completely unopinionated about what technologies are used, putting the control in the hands of the developer. 

A starter project for Jen is available here: [Jen Starter](https://github.com/appyay/jen-starter). The build process for this project includes:
* Sass preprocessing
* Nunjucks/HTML for templating
* CSS concatenation and minification
* Javascript concatenation and uglification
* Multi-browser live browser reload
* Master-detail pattern with pagination
* A modular, reusable design

## Installation
Install the dependencies:
````
npm install
````

## Project setup
First, create a ```gulpfile.js``` in the root of your project and include the following:

### Require the dependencies:
````
const gulp = require('gulp');
require('jen')(gulp, {
  dataUrl: process.env.DATA_URL
});
````
If there is a DATA_URL specified, Jen will use it to retrieve data.

### Development Gulp task:
````
gulp.task(
  'default',
  gulp.series('jen:dev') //include other gulp tasks as you wish
);
````

### Build Gulp task:
````
gulp.task('build', gulp.series('jen:build'));
````

### Project structure
Jen assumes the following project structure:
````
|--src // required
    |--data // required, but folder and contents will be auto-generated if you supply a dataUrl
        |--db.json // required
    |--templates //required
        |--pages //required
            |--home //required. This is the homepage folder. Other pages can be added in the same manner
                |--index.html //required
|--gulpfile.js // required
````

### Load the data
Data can be loaded in three ways:
1. Manually add a JSON data file to the data folder.
2. Load remote data by running ````gulp jen:load --dataUrl 'http://example.com/api/whatever'````
3. Load remote data and build the project by running ````gulp jen:build````

## Running for development
````
gulp jen:dev
````

## Master-detail pattern
Jen enables facilitation of the master-detail pattern (i.e. a list pages and accompanying detail pages for each list item).

### Detail templates
If your website requires use of the master-detail pattern, you can achieve this by putting a "detail" folder inside your page folder. For example:
````
...
        |--pages
        ...
            |--blog // page folder
                |--detail
                    |--index.html // this is your detail template
                |--index.html //this is your list (master) template
...
````
So, if a blog entry has an ID of "abc123", the detail page would be accessible at:
````
/blogs/abc123
````

The item for display on the detail page can be accessed through the ```jen.item``` global variable (only available on detail pages).

### List (master) templates
The list template will be the ```index.html``` file in the root of the page folder. The items to needed to form the list can be accessed through the global ```jen.db``` variable. For example, in your list template:

````
{% for feature in jen.db.features.items %}
  <h2>{{feature.fields.title}}</h2>
{% endfor %}
````

#### Pagination
The following variables will be available in list templates for facilitating pagination of list items:
* jen.pagination.offset
* jen.pagination.currentPage
* jen.pagination.total
* jen.pagination.itemsPerPage

The default number of items per page is 50. To specify another value, pass it into Jen through the options object in ```gulpfile.js```:

````
const itemsPerPage = 20;
require('@richjava/jen')(gulp, {
  itemsPerPage: itemsPerPage
});
````

In your template, you can loop through items in a range like so:
````
{% for i in range(jen.pagination.offset, jen.pagination.offset + jen.pagination.itemsPerPage ) %}
    <h2>{{db.features.items[i].fields.title}}</h2>
{% endfor %}
````

See the [Jen Starter](https://github.com/appyay/jen-starter) for an example of how to implement a pagination component and more!