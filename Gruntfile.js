/*jslint node:true*/
/**
 * Gruntfile for freedom.js
 *
 * Here are the common tasks used:
 * build
 *  - Lint and compile freedom.js
 *  - (default Grunt task) 
 *  - This must be run before ANY karma task (because of connect:default)
 *  - Unit tests only run on PhantomJS
 * demo
 *  - Build freedom.js, and start a web server for seeing demos at
 *    http://localhost:8000/demo
 * test
 *  - Build freedom.js, and run all unit tests on 
 *    Chrome, Firefox, and PhantomJS
 * debug
 *  - Same as test, except keeps the browsers open 
 *    and reruns tests on watched file changes.
 *  - Used to debug unit tests
 * ci
 *  - Do everything that Travis CI should do
 *  - Lint, compile, and unit test freedom.js on phantom.js
 *  - Run all tests on saucelabs.com
 *  - Report coverage to coveralls.io
 * release
 *  - Bump npm package patch version, tag the commit, and publish to npm
 *  - Compile YUIdocs and publish docs, demos, and dist to website
 **/

var FILES = {
  specCoreUnit: [
    'spec/src/*.spec.js'
  ],
  specPlatformUnit: [
    'spec/providers/core/**/*.spec.js'
  ],
  specProviderUnit: [
    'spec/providers/social/**/*.unit.spec.js',
    'spec/providers/storage/**/*.unit.spec.js',
    'spec/providers/transport/**/*.unit.spec.js'
  ],
  specProviderIntegration: [
    'spec/providers/*.integration.spec.js',
    'spec/providers/storage/*.integration.spec.js'
  ]
};

var CUSTOM_LAUNCHER = {
  sauce_chrome_mac: {
    base: 'SauceLabs',
    browserName: 'chrome',
    version: 'beta',
    platform: 'OS X 10.8'
  },
  sauce_chrome_win: {
    base: 'SauceLabs',
    browserName: 'chrome',
    version: 'dev',
    platform: 'Windows 7'
  },
  sauce_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    version: ''
  }
};

module.exports = function (grunt) {
  'use strict';
  /**
   * GRUNT CONFIG
   **/
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    karma: {
      options: {
        // NOTE: need to run 'connect:default' to serve files
        configFile: 'karma.conf.js',
        singleRun: true,
        autoWatch: false
      },
      browsers: {
        browsers: ['Chrome', 'Firefox']
      },
      phantom: {
        browsers: ['PhantomJS']
      },
      saucelabs: {
        browsers: ['sauce_chrome_mac', 'sauce_chrome_win', 'sauce_firefox'],
        reporters: ['dots', 'saucelabs'],
        sauceLabs: {
          testName: 'freedom.js',
          username: 'freedomjs',
          accessKey: process.env.SAUCEKEY,
          build: process.env.TRAVIS_BUILD_NUMBER,
          tags: [
            '<%= gitinfo.local.branch.current.name %>',
            '<%= gitinfo.local.branch.current.shortSHA %>',
            '<%= gitinfo.local.branch.current.currentUser %>',
            '<%= gitinfo.local.branch.current.lastCommitAuthor %>',
            '<%= gitinfo.local.branch.current.lastCommitTime %>'
          ]
        },
        customLaunchers: CUSTOM_LAUNCHER
      }
    },
    'create-interface-bundle': {
      freedom: {
        files: {
          'dist/bundle.compiled.js': ['interface/*.json']
        }
      }
    },
    jshint: {
      src: ['src/**/*.js'],
      grunt: ['Gruntfile.js'],
      providers: ['providers/**/*.js'],
      demo: ['demo/**/*.js', '!demo/**/third-party/**'],
      options: {
        jshintrc: true
      }
    },
    browserify: {
      freedom: {
        files: {
          'build/freedom.worker.js': ['src/util/workerEntry.js']
        }
      },
      frame: {
        files: {
          'build/freedom.frame.js': ['src/util/frameEntry.js']
        }
      },
      jasmine_unit: {
        files: {
          'spec.js': FILES.specCoreUnit.concat(
            FILES.specPlatformUnit,
            FILES.specProviderUnit
          )
        }
      },
      jasmine_coverage: {
        files: {
          'spec.js': FILES.specCoreUnit.concat(
            FILES.specPlatformUnit,
            FILES.specProviderUnit
          )
        },
        options: {
          transform: [['browserify-istanbul', {
            ignore: ['**/spec/**']
          }]]
        }
      },
      jasmine_full: {
        files: {
          'spec.js': FILES.specCoreUnit.concat(
            FILES.specPlatformUnit,
            FILES.specProviderUnit,
            FILES.specProviderIntegration
          )
        }
      },
      options: {
        browserifyOptions: {
          debug: true
        }
      }
    },
    // Exorcise, Uglify, Concat are used to create a minimized freedom.js with
    // correct sourcemap. Uglify needs an explicit 'sourceMapIn' argument,
    // requiring that exorcise be used before hand. Concat is able to properly
    // attach a banner while maintaining the correct source-map offsets.
    exorcise: {
      dist: {
        files: {
          'build/freedom.worker.js.map': ['build/freedom.worker.js']
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'build/freedom.worker.min.js': ['build/freedom.worker.js']
        },
        options: {
          sourceMap: true,
          sourceMapIn: 'build/freedom.worker.js.map',
          sourceMapIncludeSources: true,
          drop_console: true
        }
      }
    },
    concat: {
      options: {
        sourceMap: true,
        banner: require('fs').readFileSync('src/util/header.txt').toString()
      },
      full: {
        src: 'build/freedom.worker.js',
        dest: 'freedom.js',
        options: {
          sourceMapStyle: 'inline'
        }
      },
      min: {
        src: 'build/freedom.worker.min.js',
        dest: 'dist/freedom.min.js'
      }
    },
    clean: [
      'freedom.*',
      'spec.js',
      'dist/*',
      'build/*'
    ],
    yuidoc: {
      compile: {
        name: '<%= pkg.name %>',
        description: '<%= pkg.description %>',
        version: '<%= pkg.version %>',
        options: {
          paths: 'src/',
          outdir: 'build/doc/'
        }
      }
    },
    coveralls: {
      report: {
        src: 'build/coverage/PhantomJS**/*lcov.info'
      }
    },
    codeclimate: {
      options: {
        file: 'unset: use `grunt prepare_codeclimate` to set.',
        token: process.env.CODECLIMATETOKEN || 'unknown'
      }
    },
    connect: {
      freedom: {
        options: {
          port: 8000,
          keepalive: false
        }
      },
      keepalive: {
        options: {
          port: 8000,
          keepalive: true
        }
      },
      demo: {
        options: {
          port: 8000,
          keepalive: true,
          base: ["./", "demo/"],
          open: "http://localhost:8000/demo/"
        }
      }
    },
    gitinfo: {},
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'bower.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin'
      }
    },
    'npm-publish': {
      options: {
        // list of tasks that are required before publishing
        requires: [],
        // if the workspace is dirty, abort publishing (to avoid publishing local changes)
        abortIfDirty: true
      }
    },
    prompt: {
      tagMessage: {
        options: {
          questions: [
            {
              config: 'bump.options.tagMessage',
              type: 'input',
              message: 'Enter a git tag message:',
              default: 'v%VERSION%'
            }
          ]
        }
      }
    },
    shell: {
      options: {},
      publishWebsite: {
        command: 'bash tasks/publishWebsite.sh'
      }
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-codeclimate-reporter');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-yuidoc');
  grunt.loadNpmTasks('grunt-coveralls');
  grunt.loadNpmTasks('grunt-exorcise');
  grunt.loadNpmTasks('grunt-gitinfo');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadTasks('tasks');

  grunt.registerTask('prepare_watch', 'Run browserify and karma in watch mode.',
    function () {
      grunt.config.merge({
        browserify: {
          options: {
            debug: true,
            watch: true
          }
        },
        karma: {
          options: {
            singleRun: false,
            autoWatch: true,
            reporters: ['progress', 'html'],
            coverageReporter: {}
          }
        }
      });
    });
  grunt.registerTask('dynamic_codeclimate', 'Run codeclimate with correct lcov.',
    function () {
      var file = require("glob").sync("build/coverage/PhantomJS**/lcov.info");
      if (file.length !== 1) {
        return grunt.log.error("lcov file not present or distinguishable for code climate");
      }
      require('fs').renameSync(file[0], "build/coverage/lcov.info");
      grunt.config.merge({
        codeclimate: {
          report: {
            src: "build/coverage/lcov.info",
            options: {
              file: "build/coverage/lcov.info",
              token: process.env.CODECLIMATETOKEN
            }
          }
        }
      });
      grunt.task.run('codeclimate:report');
    });
  
  // Default tasks.
  grunt.registerTask('build', [
    'jshint',
    'create-interface-bundle',
    'browserify:freedom',
    'concat:full',
    'exorcise',
    'uglify',
    'concat:min'
  ]);
  grunt.registerTask('unit', [
    'create-interface-bundle',
    'browserify:frame',
    'browserify:jasmine_unit',
    'connect:freedom',
    'karma:phantom'
  ]);
  grunt.registerTask('test', [
    'jshint',
    'create-interface-bundle',
    'browserify:frame',
    'browserify:jasmine_full',
    'connect:freedom',
    'karma:browsers'
  ]);
  grunt.registerTask('debug', [
    'prepare_watch',
    'jshint',
    'create-interface-bundle',
    'browserify:frame',
    'browserify:jasmine_full',
    'connect:freedom',
    'karma:browsers'
  ]);
  grunt.registerTask('demo', [
    'build',
    'connect:demo'
  ]);
  grunt.registerTask('website', [
    'yuidoc',
    'shell:publishWebsite'
  ]);

  if (process.env.TRAVIS_JOB_NUMBER) {
    var jobParts = process.env.TRAVIS_JOB_NUMBER.split('.');
    //When run from Travis from jobs *.1
    if (jobParts.length > 1 && jobParts[1] === '1') {
      grunt.registerTask('ci', [
        'build',
        'browserify:frame',
        'browserify:jasmine_coverage',
        'connect:freedom',
        'karma:phantom',
        'gitinfo',
        'karma:saucelabs',
        'coveralls:report',
        'dynamic_codeclimate'
      ]);
    } else {  //When run from Travis from jobs *.2, *.3, etc.
      grunt.registerTask('ci', [
        'build',
        'browserify:frame',
        'browserify:jasmine_unit',
        'connect:freedom',
        'karma:phantom'
      ]);
    }
  } else {  //When run from command-line
    grunt.registerTask('ci', [
      'build',
      'browserify:frame',
      'browserify:jasmine_unit',
      'connect:freedom',
      'karma:phantom',
      'gitinfo',
      'karma:saucelabs'
    ]);
  }
  
  grunt.registerTask('release', function (arg) {
    if (arguments.length === 0) {
      arg = 'patch';
    }
    grunt.task.run([
      'default',
      'prompt:tagMessage',
      'bump:' + arg,
      'npm-publish',
      'website'
    ]);
  });

  grunt.registerTask('default', ['build', 'unit']);
};
