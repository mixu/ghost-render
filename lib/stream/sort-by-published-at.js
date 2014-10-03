var pi = require('pipe-iterators');

module.exports = function() {
  var posts = [];
  return pi.through.obj(function(post, enc, onDone) {
    posts.push(post);
    onDone();
  }, function(onDone) {
    // sort posts
    posts.sort(function(a, b) {
      var aVal = (a.published_at ? a.published_at.getTime() : 0),
          bVal = (b.published_at ? b.published_at.getTime() : 0);
      return bVal - aVal; // newest first
    });
    // push each post back into the stream after sorting
    posts.forEach(function(post) {
      this.push(post);
    }, this);
    onDone();
  });
};
