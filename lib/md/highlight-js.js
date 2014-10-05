var hljs = require('highlight.js'),
    through = require('through2');


function hl(code, lang) {
  return '<pre class="hljs"><code>' + hljs.highlightAuto(code).value + '</code></pre>';
}

module.exports = function() {
  // code highlighting on lexer output
  return through.obj(function(file, enc, onDone) {
    file.contents.forEach(function(token, index) {
      if(token.type != 'code') {
        return;
      }
      file.contents[index] = { type: 'html', pre: false, text: hl(token.text, token.lang) };
    });
    this.push(file);
    onDone();
  });
};
