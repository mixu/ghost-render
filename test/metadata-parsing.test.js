var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    glob = require('wildglob'),
    pi = require('pipe-iterators'),
    fixture = require('file-fixture');

var stream = require('../index.js').stream,
    md = require('../index.js').md;

var meta = {
  authors: {
    'default': {
      'name': 'AUTHOR NAME',
      'bio': 'AUTHOR BIO',
      'website': 'http://localhost:5000/author/foo',
      'image': 'http://lorempixel.com/155/155/people/',
      'cover': 'http://lorempixel.com/1100/425/animals/',
      'slug': 'foo'
    }
  }
};

describe('test metadata defaults', function() {

  function pipeline() {
    return pi.pipeline(
      stream.read(),
      md.parseHeader(),
      md.parseMd(),
      md.annotateMdHeadings(),
      md.highlightJs(),
      md.convertMd(),
      stream.fileToPost(meta),
      stream.parsePublishedAt(),
      stream.parseTags()
    );
  }

  it('if title is not set, the first heading will be used', function(done) {
    var tmpFile = fixture.file([ '# Hello world', 'YOLO' ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        // console.log(require('util').inspect(result, null, 20, true));
        assert.equal(result.title, 'Hello world');
        assert.equal(result.page, false);
        assert.equal(result.draft, false);
        done();
      }));
  });

  it('if title is not set, and there are no headings, the file name will be used', function(done) {
    var tmpFile = fixture.file([ 'YOLO' ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        assert.equal(result.title, path.basename(tmpFile, path.extname(tmpFile)));
        done();
      }));
  });

  it('if published_at is set, it is used', function(done) {
    var tmpFile = fixture.file([
      '---',
      'published_at: 2014-01-30 11:26:04',
      '---',
      ' ',
      'YOLO'
      ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        assert.equal(result.published_at.getTime(), new Date('2014-01-30 11:26:04').getTime());
        done();
      }));

  });

  it('if published_at is not set, and the file path has no date, ' +
    'the creation time of the file is used', function(done) {
    var tmpFile = fixture.file([ 'YOLO' ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        assert.equal(result.published_at.getTime(), fs.statSync(tmpFile).ctime.getTime());
        done();
      }));
  });

  it('if published_at is not set and the file path has a date, ' +
    'set the date from the file path', function(done) {
    var tmpDir = fixture.dir({
      '2014-01-30-hello.md': 'YOLO',
      '2014/02/30/foo.md': 'YOLO',
      '30-03-2014-bar.md': 'YOLO',
      '30/04/2014/baz.md': 'YOLO'
    });

    var files = glob.sync(tmpDir + '/**');

    pi.fromArray(files)
        .pipe(pipeline())
        .pipe(stream.sortByPublishedAt())
        .pipe(pi.toArray(function(results) {
          // console.log(require('util').inspect(results, null, 20, true));
          assert.equal(results[0].published_at.getTime(), new Date(2014, 3, 30).getTime());
          assert.equal(results[1].published_at.getTime(), new Date(2014, 2, 30).getTime());
          assert.equal(results[2].published_at.getTime(), new Date(2014, 1, 30).getTime());
          assert.equal(results[3].published_at.getTime(), new Date(2014, 0, 30).getTime());
          done();
        }));
  });

  it('if author is not set, the default author is used', function(done) {
    var tmpFile = fixture.file([ '# Hello world', 'YOLO' ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        // console.log(require('util').inspect(result, null, 20, true));
        assert.equal(result.author, meta.authors['default']);
        done();
      }));
  });

  it('parses space-separated tags', function(done) {
    var tmpFile = fixture.file([
      '---',
      'tags: foo bar baz',
      '---',
      ' ',
      'YOLO'
      ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        assert.deepEqual(result.tags.map(function(t) { return t.name; }), [ 'foo', 'bar', 'baz' ]);
        done();
      }));
  });

  it('parses comma-separated tags', function(done) {
    var tmpFile = fixture.file([
      '---',
      'tags: foo,bar,baz',
      '---',
      ' ',
      'YOLO'
      ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results) {
        var result = results[0];
        assert.deepEqual(result.tags.map(function(t) { return t.name; }), [ 'foo', 'bar', 'baz' ]);
        done();
      }));
  });

  it('if tags are not set, the tags property is an empty array', function(done) {
    var tmpFile = fixture.file([
      'YOLO'
      ], { ext: '.md'});

    pi.fromArray(tmpFile)
      .pipe(pipeline())
      .pipe(pi.toArray(function(results
        ) {
        var result = results[0];
        assert.deepEqual(result.tags.map(function(t) { return t.name; }), [ ]);
        done();
      }));
  });

  it('parses metadata blocks even if they have no --- block, but newlines instead');

  it('parses metadata blocks even if they only have the ending ---');

  it('parses metadata blocks even if they only have the beginning --- and a newline');

});
