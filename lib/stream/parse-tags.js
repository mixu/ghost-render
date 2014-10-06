var pi = require('pipe-iterators');

module.exports = function() {
  return pi.mapKey('tags', function(tags, file) {
    if (typeof tags !== 'string') {
      tags = '';
    }

    var splitBy = (tags.indexOf(',') > -1 ? ',' : ' '),
        parts = tags.split(splitBy).map(function(s) { return s.trim(); }).filter(Boolean);

    // post parsing must also set tags to an array!!
    return parts.map(function(name) { return {
      name: name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      // needed for isTag
      description: name,
      parent: null
    }; });
  });
};
