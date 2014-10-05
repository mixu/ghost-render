var through = require('through2'),
    miniq = require('miniq');

exports.post = function(render) {
  return through.obj(function(file, enc, onDone) {
    var self = this;
    render(file, function(err, html) {
      if (err) {
        throw err;
      }
      file.contents = html;
      self.push(file);
      onDone();
    });
  });
};

exports.index = function(render) {
  var posts = [];
  return through.obj(function(file, enc, onDone) {
    posts.push(file);
    onDone();
  }, function(onDone) {
    var self = this;
    render(posts, function(err, pages) {
      if (err) {
        throw err;
      }
      self.push(pages);
      onDone();
    });
  });
};

exports.author = function(theme) {
  return through.obj(function(authors, enc, onDone) {
    var self = this;
    miniq(Infinity, Object.keys(authors).map(function(slug) {
      var author = theme.meta.authors[slug] || theme.meta.authors['default'],
          posts = authors[slug];
      return function(done) {
        theme.author(author, posts, function(err, pages) {
          if (pages) {
            self.push({ author: author, pages: pages });
          }
          done();
        });
      };
    }), function(err) {
      onDone(err);
    });
  });
};

exports.tag = function(render) {
  return through.obj(function(tags, enc, onDone) {
    var self = this;
    render(tags, function(err, tags) {
      if (err) {
        throw err;
      }

      Object.keys(tags).forEach(function(tag) {
        self.push({ tag: tag, pages: tags[tag] });
      });
      onDone();
    });
  });
};

exports.rss = function(render) {
  return through.obj(function(posts, enc, onDone) {
    var self = this;
    render({ posts: posts }, function(err, pages) {
      if (err) {
        throw err;
      }
      self.push(pages);
      onDone();
    });
  });
};
