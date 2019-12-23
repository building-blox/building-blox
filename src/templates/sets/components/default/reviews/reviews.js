const $ = require('jquery');
require('slick-carousel');

$('.slider').slick({
  dots: true,
  infinite: true,
  speed: 500,
  fade: true,
  cssEase: 'linear'
});
console.log('Hi from reviews.js');
