var pi = require('pipe-iterators');

module.exports = function(meta, inPath) {
  var id = 1;
  return pi.mapKey({
    id: function() { return id++; },
    title: function(val, file) { return val || file.headings[0].text; },
    html: function(val, file) { return file.contents; },
    url: function(val, file) { return val || file.path; },
    author: function(val) {
      if (typeof val !== 'string' || !meta.authors[val]) {
        return meta.authors['default'];
      }
      return meta.authors[val];
    },
    slug: function(val, file) { return file.post_name; },
    // more: (these are needed for schema isPost)
    markdown: 'placeholder',
    relativeUrl: function(val, file) { return file.path.replace(inPath, '/'); }
  });
};
