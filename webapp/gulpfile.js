const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const path = require('path');
const fs = require('fs');

function getOutputPath(fileType) {
    return path.resolve('./public/static/dist', fileType);
}

const srcPath = './public/static/src/';
const distPath = './public/static/dist/';

// Compile SCSS to CSS and minify it
gulp.task('sass', function() {
    return gulp.src(srcPath + 'css/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({
            compatibility: 'ie8',
            level: 2
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(distPath + 'css'));
});

// Handle CSS files - copy .min.css directly, process others
gulp.task('minify-css', function() {
    gulp.src(srcPath + '*.min.css')
        .pipe(gulp.dest(getOutputPath('css')));
    
    return gulp.src([srcPath + 'css/*.css', '!' + srcPath +'css/*.min.css'])
        .pipe(cleanCSS({
            compatibility: 'ie8',
            level: 2
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(getOutputPath('css')));
});

// Handle JS files - copy .min.js directly, process others
gulp.task('js', function() {
    gulp.src(srcPath + '/js/*.min.js')
        .pipe(gulp.dest(getOutputPath('js')));
    
    return gulp.src([srcPath + 'js/*.js', '!' + srcPath + 'js/*.min.js'])
        .pipe(uglify({
            compress: true,
            mangle: true,
            output: {
                comments: false
            }
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(getOutputPath('js')));
});

// Copy assets folder
gulp.task('copyFolders', function(done) {
    const dirs = ['fontawesome', 'uikit'];
    dirs.forEach(dir => {
        const srcDir = path.join(srcPath, dir);
        const destDir = path.join(distPath, dir);
        fs.cpSync(srcDir, destDir, { recursive: true });
    });

    done();
});

// Delete files from dist if they no longer exist in src
function cleanDeletedFiles(done) {
    const srcDirs = [srcPath + 'css', srcPath + 'js'];
    const distDirs = [distPath + 'css', distPath + 'js'];

    distDirs.forEach((distDir, index) => {
        const srcDir = srcDirs[index];
        fs.readdirSync(distDir).forEach(file => {
            const srcFilePath = path.join(srcDir, file);
            const distFilePath = path.join(distDir, file);
            if (!fs.existsSync(srcFilePath)) {
                fs.rmSync(distFilePath, { recursive: true, force: true });
            }
        });
    });
    done();
}

// Watch files for changes
gulp.task('watch', function() {
    gulp.watch(srcPath + 'css/*.scss', gulp.series('sass'));
    gulp.watch(srcPath + 'css/*.css', gulp.series('minify-css'));
    gulp.watch(srcPath + 'js/*.js', gulp.series('js'));
    gulp.watch([srcPath + '**/*'], gulp.series(cleanDeletedFiles));
});

// Default task
gulp.task('default', gulp.series('sass', 'minify-css', 'js', 'copyFolders', 'watch'));
