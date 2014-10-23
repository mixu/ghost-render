var path = require('path'),
    pi = require('pipe-iterators');

module.exports = function(inPath) {

  function computeUrl(val, file) {
    var relUrl = path.normalize(file.path.replace(inPath, '/'));
    // change the extension from .md to .html
    relUrl = path.dirname(relUrl) + '/' + path.basename(relUrl, path.extname(relUrl)) + '.html';
    return relUrl;
  }

  return pi.mapKey({
    relativeUrl: computeUrl,
    preComputedRelativeUrl: computeUrl
  });
};
