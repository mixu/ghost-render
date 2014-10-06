var pi = require('pipe-iterators'),
    path = require('path');

function toBoolean(value) {
  switch((value || '').toString()) {
    case 'true':
    case 'yes':
    case '1':
    return true;
  }
  return false;
}

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
    relativeUrl: function(val, file) { return path.normalize(file.path.replace(inPath, '/')); },
    // extra metadata
    draft: function(val) { return toBoolean(val); },
    page: function(val) { return toBoolean(val); }
  });
};
