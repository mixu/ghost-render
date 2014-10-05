var _ = require('lodash'),
    pi = require('pipe-iterators'),
    path = require('path'),
    miniq = require('miniq'),
    through = require('through2'),
    stream = require('./stream');

module.exports = function(theme, inPath, outPath) {

  return {
    post: pi.pipeFirst([
      // render pipeline for individual posts
      stream.renderPost(theme.post.bind(theme)),
      pi.mapKey('path', function(p) {
        p = path.dirname(p) + '/' + path.basename(p, path.extname(p)) + '.html';
        return path.normalize(p.replace(inPath, outPath));
      }),
      pi.forEach(function(obj) { console.log('write post:', obj.path); }),
      stream.dest()
    ]),

    page: pi.pipeFirst([
      // pages pipeline: only pages
      pi.filter(function(post) { return post.page; }),
      stream.renderPost(theme.post.bind(theme)),
      pi.mapKey('path', function(p) {
        p = path.dirname(p) + '/' + path.basename(p, path.extname(p)) + '.html';
        return path.normalize(p.replace(inPath, outPath));
      }),
      pi.forEach(function(obj) { console.log('write page:', obj.path); }),
      stream.dest()
    ]),

    index: pi.pipeFirst([
      // render pipeline for indexes
      stream.renderIndex(theme.index.bind(theme)),
      through.obj(function(pages, enc, onDone) {
        // index
        this.push({
          path: path.normalize(outPath + '/index.html'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
            path: path.normalize(outPath + '/page/' + (i + 1) + '/index.html'),
            contents: html
          });
        }, this);
        onDone();
      }),
      pi.forEach(function(obj) { console.log('write index:', obj.path); }),
      stream.dest()
    ]),

    tag: pi.pipeFirst([
      // render pipeline for tag pages
      stream.renderTag(theme.tag.bind(theme)),
      through.obj(function(result, enc, onDone) {
        var tag = result.tag,
            pages = result.pages;
        // index
        this.push({
          path: path.normalize(outPath + '/tag/' + tag + '/index.html'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
            path: path.normalize(outPath + '/tag/' + tag + '/page/' + (i + 1) + '/index.html'),
            contents: html
          });
        }, this);
      }),
      pi.forEach(function(obj) { console.log('write tag:', obj.path); }),
      stream.dest()
    ]),

    author: pi.pipeFirst([
      // render pipeline for author pages
      stream.renderAuthor(theme),
      through.obj(function(result, enc, onDone) {
        var author = result.author,
            slug = author.slug,
            pages = result.pages;
        // index
        this.push({
          path: path.normalize(outPath + '/author/' + slug + '/index.html'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
           path: path.normalize(outPath + '/author/' + slug + '/page/' + (i + 1) + '/index.html'),
            contents: html
          });
        }, this);
        onDone();
      }),
      pi.forEach(function(obj) { console.log('write author:', obj.path); }),
      stream.dest()
    ]),

    // posts RSS pipeline
    postRSS: pi.pipeFirst([
      pi.reduce(function(posts, post) { return posts.concat(post); }, []),
      through.obj(function(posts, enc, onDone) {
        var self = this;
        theme.rss({ posts: posts }, function(err, pages) {
          if (err) {
            throw err;
          }
          self.push(pages);
          onDone();
        });
      }),

      through.obj(function(pages, enc, onDone) {
        // index
        this.push({
          path: path.normalize(outPath + '/rss/index.xml'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
            path: path.normalize(outPath + '/rss/' + (i + 1) + '/index.xml'),
            contents: html
          });
        }, this);
        onDone();
      }),
      pi.forEach(function(obj) { console.log('write index RSS:', obj.path); }),
      stream.dest()
    ]),

    tagRSS: pi.pipeFirst([
      through.obj(function(tags, enc, onDone) {
        var self = this;
        miniq(1, Object.keys(tags).map(function(tag) {
          return function(done) {
            theme.rss({ tag: tag, posts: tags[tag] }, function(err, pages) {
              if (pages) {
                self.push({ tag: tag, pages: pages });
              }
              done(err);
            });
          };
        }), onDone);
      }),
      through.obj(function(result, enc, onDone) {
        var tag = result.tag,
            pages = result.pages;
        // index
        this.push({
          path: path.normalize(outPath + '/tag/' + tag + '/rss/index.xml'),
          contents: pages[0]
        });

        this.push({
          path: path.normalize(outPath + '/tag/' + tag + '/feed/index.xml'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
            path: path.normalize(outPath + '/tag/' + tag + '/rss/' + (i + 1) + '/index.xml'),
            contents: html
          });
        }, this);
        onDone();
      }),
      pi.forEach(function(obj) { console.log('write tag RSS:', obj.path); }),
      stream.dest()
    ]),

    authorRSS: pi.pipeFirst([
      through.obj(function(authors, enc, onDone) {
        var self = this;
        miniq(1, Object.keys(authors).map(function(slug) {
          var author = theme.meta.authors[slug] || theme.meta.authors['default'],
              posts = authors[slug];
          return function(done) {
            theme.rss({ author: author, posts: posts }, function(err, pages) {
              if (pages) {
                self.push({ author: author, pages: pages });
              }
              done(err);
            });
          };
        }), onDone);
      }),
      through.obj(function(result, enc, onDone) {
        var author = result.author,
            slug = author.slug,
            pages = result.pages;
        // index
        this.push({
          path: path.normalize(outPath + '/author/' + slug + '/rss/index.xml'),
          contents: pages[0]
        });

        pages.forEach(function(html, i) {
          this.push({
            path: path.normalize(outPath + '/author/' + slug + '/rss/' + (i + 1) + '/index.xml'),
            contents: html
          });
        }, this);
        onDone();
      }),
      pi.forEach(function(obj) { console.log('write authors RSS:', obj.path); }),
      stream.dest()
    ])
  };
};
