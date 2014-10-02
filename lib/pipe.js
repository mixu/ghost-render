exports.Pipe = Pipe;

function Pipe(opts) {
  this.theme = opts.theme;
  this.outPath = opts.outPath;
}

Pipe.prototype.renderPost = function() {
  var theme = this.theme;
  return through.obj(function(file, enc, onDone) {
    var self = this;
    theme.post(file, function(err, html) {
      if (err) {
        throw err;
      }
      file.path = path.dirname(file.path) + '/' + path.basename(file.path, path.extname(file.path)) + '.html';
      file.contents = html;
      self.push(file);
      onDone();
    });
  });
};

Pipe.prototype.renderIndex = function() {
  var outPath = this.outPath,
      theme = this.theme,
      posts = [];
  return through.obj(function(file, enc, onDone) {
    // accumulate
    posts.push(file);
    onDone();
  }, function(onDone) {
    var self = this;

    theme.index(posts, function(err, pages) {
      if (err) {
        throw err;
      }
      // index
      self.push({
        path: path.normalize(outPath + '/index.html'),
        contents: pages[0]
      });

      pages.forEach(function(html, i) {
        self.push({
          path: path.normalize(outPath + '/page/' + (i + 1) + '/index.html'),
          contents: html
        });
      });
      onDone();
    });
  });
};

Pipe.prototype.renderAuthor = function() {
  var outPath = this.outPath,
      theme = this.theme,
      posts = [];
  return through.obj(function(file, enc, onDone) {
    // accumulate
    posts.push(file);
    onDone();
  }, function(onDone) {
    var self = this;

    var authors = {};

    posts.forEach(function(post) {
      var author = post.author.slug;
      if (!authors[author]) {
        authors[author] = [ post ];
      } else {
        authors[author].push(post);
      }
    });

    miniq(Infinity, Object.keys(authors).map(function(slug) {
      var author = theme.config.authors[slug] || theme.config.authors['default'],
          posts = authors[slug];
      return function(done) {
        theme.author(author, posts, function(err, pages) {
          if (err) { return onDone(err); }
          // index
          self.push({
            path: path.normalize(outPath + '/author/' + slug + '/index.html'),
            contents: pages[0]
          });

          pages.forEach(function(html, i) {
            self.push({
             path: path.normalize(outPath + '/author/' + slug + '/page/' + (i + 1) + '/index.html'),
              contents: html
            });
          });
          done();
        });
      };
    }), function(err) {
      onDone(err);
    });
  });
};

Pipe.prototype.renderTag = function() {
  var outPath = this.outPath,
      theme = this.theme,
      posts = [];
  return through.obj(function(file, enc, onDone) {
    // accumulate
    posts.push(file);
    onDone();
  }, function(onDone) {
    var self = this;

    var tags = {};

    posts.forEach(function(post, tmpIndex) {
      if (!post.tags) {
        return;
      }
      // tags are objects (in the Ghost format)
      post.tags.forEach(function(item) {
        var name = item.name;

        if (!tags[name]) {
          tags[name] = [ post ];
        } else {
          tags[name].push(post);
        }
      });
    });


    theme.tag(tags, function(err, tags) {
      if (err) {
        throw err;
      }

      Object.keys(tags).forEach(function(tag) {
        // index
        self.push({
          path: path.normalize(outPath + '/tag/' + tag + '/index.html'),
          contents: tags[tag][0]
        });

        tags[tag].forEach(function(html, i) {
          self.push({
            path: path.normalize(outPath + '/tag/' + tag + '/page/' + (i + 1) + '/index.html'),
            contents: html
          });
        });
      });
      onDone();
    });
  });
};
