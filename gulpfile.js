"use strict";

var gulp = require('gulp')
  , traceur = require('gulp-traceur');

gulp.task('default', function () {
  var traceurOpts = {
    asyncFunctions: true,
    blockBinding: true,
    modules: 'commonjs',
    annotations: true,
    arrayComprehension: true
  };
  return gulp.src('lib/es6/**/*.js')
             .pipe(traceur(traceurOpts))
             .pipe(gulp.dest('lib/es5'));
});


