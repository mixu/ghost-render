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

module.exports = function(meta) {
  var id = 1;
  return pi.mapKey({
    id: function() { return id++; },
    title: function(val, file) {
      if (val) {
        return val;
      } else if (file.headings && file.headings[0] && file.headings[0].text) {
        return file.headings[0].text;
      }
      return path.basename(file.path, path.extname(file.path));
    },
    html: function(val, file) { return file.contents; },
    url: function(val, file) { return val || file.path; },
    author: function(val) {
      if (typeof val !== 'string' || !meta.authors[val]) {
        return meta.authors['default'];
      }
      return meta.authors[val];
    },
    // slugs are not used because posts don't generate URLs using a template, but
    // rather based on their name in the file system.
    slug: 'placeholder',
    // more: (these are needed for schema isPost)
    markdown: 'placeholder',
    // extra metadata
    draft: function(val) { return toBoolean(val); },
    page: function(val) { return toBoolean(val); }
  });
};
