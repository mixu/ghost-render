var pi = require('pipe-iterators');

function getMonthAndDay(a, b) {
  var firstIsGreaterThanTwelve = a > 12;
  // js dates have months from 0..11
  return firstIsGreaterThanTwelve ? [ b - 1, a ] : [ a - 1, b ];
}

var dateParseExpr = [
  // yyyy-mm-dd or yyyy-dd-mm
  { re: /(\d\d\d\d)[^\d](\d?\d)[^\d](\d?\d)/,
    parse: function(result) {
      var mmdd = getMonthAndDay(result[2], result[3]);
      return new Date(result[1], mmdd[0], mmdd[1]);
    }
  },
  // dd-mm-yyyy or mm-dd-yyyy
  { re: /(\d?\d)[^\d](\d?\d)[^\d](\d\d\d\d)/,
    parse: function(result) {
      var mmdd = getMonthAndDay(result[1], result[2]);
      return new Date(result[3], mmdd[0], mmdd[1]);
    }
  }
];

module.exports = function() {
  // parse date from file name
  return pi.map(function(file) {
    if (file.published_at) {
      if (typeof file.published_at === 'string') {
        file.published_at = new Date(file.published_at);
      }
      return file;
    }

    dateParseExpr.forEach(function(expr) {
      if (file.published_at) {
        return;
      }
      var result = expr.re.exec(file.path);
      if (result) {
        file.published_at = expr.parse(result);
      }
    });

    if (!file.published_at) {
      if (file.stat && file.stat.ctime) {
        file.published_at = file.stat.ctime;
      } else {
        file.published_at = new Date();
      }
    }
    return file;
  });
};
