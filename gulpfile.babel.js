// generated on 2015-07-01 using generator-gulp-webapp 1.0.2

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import {stream as wiredep} from 'wiredep';
import {mkdirSync, statSync, readdirSync, createWriteStream} from 'fs';
import browserify from 'browserify';
import babelify from 'babelify';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

gulp.task('styles', () => {
	return gulp.src('app/styles/*.scss')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.sass.sync({
			outputStyle: 'expanded',
			precision: 10,
			includePaths: ['.']
		}).on('error', $.sass.logError))
		.pipe($.autoprefixer({browsers: ['last 1 version']}))
		.pipe($.sourcemaps.write())
		.pipe(gulp.dest('.tmp/styles'))
		.pipe(reload({stream: true}));
});

gulp.task('browserify', function () {
	try {
		mkdirSync('.tmp');
	} catch (e) {
		if (e.code !== 'EEXIST') {
			throw e;
		}
	}

	try {
		mkdirSync('.tmp/scripts');
	} catch (e) {
		if (e.code !== 'EEXIST') {
			throw e;
		}
	}

	return Promise.all(readdirSync('./app/scripts/').map(function (a) {
		var path = './app/scripts/' + a;
		if (!statSync(path).isDirectory()) {
			return new Promise(function (resolve, reject) {
				process.stdout.write('Browserify: Processing ' + a + '\n');
								var writer = createWriteStream('.tmp/scripts/' + a);
								writer.on('finish', function () {
									resolve(a);
								});
				browserify({ debug: true })
					.transform(babelify)
					.require(require.resolve(path), { entry: true })
					.bundle()
					.on('error', function(err) {
						this.emit('exit');
						reject(err);
					})
					.pipe(writer);
			}).then(function (a) {
				process.stdout.write('Browserify: Finished processing ' + a + '\n');
			});
		} else {
			return undefined;
		}
	})).then(function () {
		process.stdout.write('Browserify: Finished all\n');
	}, function (e) {
		process.stdout.write(e);
	});
});

function lint(files, options) {
	return () => {
		return gulp.src(files)
			.pipe(reload({stream: true, once: true}))
			.pipe($.eslint(options))
			.pipe($.eslint.format())
			.pipe($.if(!browserSync.active, $.eslint.failAfterError()));
	};
}

const testLintOptions = {
	env: {
		mocha: true
	},
	globals: {
		assert: false,
		expect: false,
		should: false
	}
};

gulp.task('lint', lint('app/scripts/**/*.js', {
	env: {
		"es6": true,
		"node": true
	},
	rules: require('./.eslintrc.json')
}));
gulp.task('lint:test', lint('test/spec/**/*.js', testLintOptions));

gulp.task('html', ['styles'], () => {
	const assets = $.useref.assets({searchPath: ['.tmp', 'app', '.']});

	return gulp.src('app/*.html')
		.pipe(assets)
		.pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
		.pipe(assets.restore())
		.pipe($.useref())
		.pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
		.pipe(gulp.dest('dist'));
});

gulp.task('images', () => {
	return gulp.src('app/images/**/*')
		.pipe($.if($.if.isFile, $.cache($.imagemin({
			progressive: true,
			interlaced: true,
			// don't remove IDs from SVGs, they are often used
			// as hooks for embedding and styling
			svgoPlugins: [{cleanupIDs: false}]
		}))
		.on('error', function (err) {
			console.log(err);
			this.end();
		})))
		.pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', () => {
	return gulp.src(require('main-bower-files')({
		filter: '**/*.{eot,svg,ttf,woff,woff2}'
	}).concat('app/fonts/**/*'))
		.pipe(gulp.dest('.tmp/fonts'))
		.pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', () => {
	return gulp.src([
		'app/*.*',
		'!app/*.html',
		'app/**/*.json'
	], {
		dot: true
	}).pipe(gulp.dest('dist'));
});

gulp.task('copy-tmp', ['browserify'], () => {
	return gulp.src([
		'.tmp/**/*.{js,css}'
	])
	.pipe(gulp.dest('dist'));
});

gulp.task('copy-tmp:dist', ['browserify'], () => {
	return Promise.all([gulp.src([
			'.tmp/**/*.css'
		])
		.pipe(gulp.dest('dist')),
		gulp.src([
			'.tmp/**/*.js'
		])
		.pipe($.uglify())
		.pipe(gulp.dest('dist'))
	]);
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['styles', 'browserify', 'fonts'], () => {
	browserSync({
		notify: false,
		port: 9000,
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/bower_components': 'bower_components'
			}
		}
	});

	gulp.watch([
		'app/*.html',
		'app/images/**/*',
		'.tmp/fonts/**/*',
		'.tmp/scripts/**/*',
	]).on('change', reload);

	gulp.watch('app/styles/**/*.scss', ['styles']);
	gulp.watch('app/fonts/**/*', ['fonts']);
	gulp.watch('bower.json', ['wiredep', 'fonts']);
	gulp.watch('app/scripts/**/*.js', ['browserify']);
});

gulp.task('serve:dist', () => {
	browserSync({
		notify: false,
		port: 9000,
		server: {
			baseDir: ['dist']
		}
	});
});

gulp.task('serve:test', () => {
	browserSync({
		notify: false,
		port: 9000,
		ui: false,
		server: {
			baseDir: 'test',
			routes: {
				'/bower_components': 'bower_components'
			}
		}
	});

	gulp.watch('test/spec/**/*.js').on('change', reload);
	gulp.watch('test/spec/**/*.js', ['lint:test']);
});

// inject bower components
gulp.task('wiredep', () => {
	gulp.src('app/styles/*.scss')
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)+/
		}))
		.pipe(gulp.dest('app/styles'));

	gulp.src('app/*.html')
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)*\.\./
		}))
		.pipe(gulp.dest('app'));
});

gulp.task('ship', function () {
	return gulp.src('./dist/**/*')
		.pipe(require('gulp-gh-pages')({
			origin: 'https://git.heroku.com/ftlabs-six-degrees-404.git',
			remoteUrl: 'https://git.heroku.com/ftlabs-six-degrees-404.git',
			branch: 'master'
		}));
});

gulp.task('deploy', ['build'], function () {
	return gulp.start('ship');
});

gulp.task('build', ['copy-tmp:dist', 'html', 'images', 'fonts', 'extras'], () => {
	return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], () => {
	gulp.start('build');
});
