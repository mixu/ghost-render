var through = require('through2');

exports.author = function() {
  var posts = [];
  return through.obj(function(file, enc, onDone) {
    posts.push(file);
    onDone();
  }, function(onDone) {
    var authors = {};
    posts.forEach(function(post) {
      var author = post.author.slug;
      if (!authors[author]) {
        authors[author] = [post];
      } else {
        authors[author].push(post);
      }
    });

    Object.keys(authors).forEach(function(slug) {
      this.push({
        author: slug,
        posts: authors[slug]
      });
    }, this);

    onDone();
  });
};

exports.tag = function() {
  var posts = [];
  return through.obj(function(file, enc, onDone) {
    posts.push(file);
    onDone();
  }, function(onDone) {
    var tags = {};
    posts.forEach(function(post, tmpIndex) {
      if (!post.tags) {
        return;
      }
      // tags are objects (in the Ghost format)
      post.tags.forEach(function(item) {
        var name = item.name;

        if (!tags[name]) {
          tags[name] = [post];
        } else {
          tags[name].push(post);
        }
      });
    });

    Object.keys(tags).forEach(function(tag) {
      this.push({
        tag: tag,
        posts: tags[tag]
      });
    }, this);

    onDone();
  });
};
