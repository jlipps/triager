"use strict";

var gulp = require('gulp')
  , header = require('gulp-header')
  , filter = require('gulp-filter')
  , merge = require('merge-stream')
  , traceur = require('gulp-traceur');

gulp.task('default', function () {
  var traceurOpts = {
    asyncFunctions: true,
    blockBinding: true,
    modules: 'commonjs',
    annotations: true,
    arrayComprehension: true
  };
  var binFilter = filter(function (file) {
    return /(main|retro)\.js/.test(file.path);
  });
  var lib = gulp.src('lib/es6/**/*.js')
                .pipe(traceur(traceurOpts))
                .pipe(binFilter)
                   .pipe(header('#!/usr/bin/env node\n'))
                   .pipe(binFilter.restore())
                .pipe(gulp.dest('lib/es5'));
  var test = gulp.src('test/es6/**/*.js')
                 .pipe(traceur(traceurOpts))
                 .pipe(gulp.dest('test/es5'));
  return merge(lib, test);
});


