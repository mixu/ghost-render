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
    this.push(authors);
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
    this.push(tags);
    onDone();
  });
};
