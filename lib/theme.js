module.exports = Theme;


exports.render = function(opts) {
  var helpers = getHelpers(getConfig(opts.config));

  Object.keys(helpers).forEach(function(name) {
    var fn = helpers[name];
    hbs.registerHelper(name, fn);
  });
  return hbs.express3(opts);
};

function getPartials(tpath) {
  return [
    tpath,
    __dirname + '/lib/ghost/helpers/tpl/',
    fs.existsSync(tpath + '/partials/') ? tpath + '/partials/' : false
  ].filter(Boolean);
}

function paginate(items, perPage) {
  var pages = [],
      total = items.length,
      pageCount = Math.max(1, Math.ceil(total / perPage)),
      page = 1,
      i;

  for (i = 0; i < total - 1; i += perPage) {
    pages.push({
      posts: items.slice(i, i + perPage),
      pagination: {
        limit: 5,
        pages: pageCount,
        total: total,

        page: page,
        next: (page < pageCount ? page + 1 : null),
        prev: (page !== 1 ? page - 1 : null)
      }
    });
    page++;
  }
  pages.forEach(function(p) { console.log(p.pagination);});
  return pages;
}

// Each theme instance takes a bunch of Ghost settings and theme options
// and provides render functions that use that config.
function Theme(opts) {
  this.templatePath = opts.templatePath;
  // default values for locals
  this._defaults = {
    // ehbs
    settings: {
      views: this.templatePath,
      cache: true
    }
  };
  this.config = opts.config;

  this._renderFn = exports.render({
    partialsDir: getPartials(this.templatePath),
    // undocumented, passed to handlebars templates as the options hash
    templateOptions: {
      data: { blog: this.config.blog }
    },
    // pass in the config json
    config: opts.config
  });
};

Theme.prototype.post = function(post, onDone) {
  var locals = extend({}, this._defaults, {
    post: post,
    relativeUrl: post.relativeUrl
  });
  this._renderFn(this.templatePath + '/post.hbs', locals, onDone);
};

Theme.prototype.index = function(posts, onDone) {
  var self = this,
      result = [];

  miniq(1, paginate(posts, 5).map(function(item, index) {
    var page = index + 1;
    return function(done) {
      var locals = extend({}, self._defaults, item, { relativeUrl: '/' });
      self._renderFn(self.templatePath + '/index.hbs', locals, function(err, html) {
        if (!err && html) {
          result.push(html);
        }
        done(err);
      });
    };
  }), function(err) {
    onDone(err, result);
  });
};

Theme.prototype.author = function(author, posts, onDone) {
  var self = this,
      result = [];

  miniq(1, paginate(posts, 5).map(function(item, index) {
    return function(done) {
      var locals = extend({}, self._defaults, item, { author: author, relativeUrl: '/' });

      self._renderFn(self.templatePath + '/author.hbs', locals, function(err, html) {
        if (!err && html) {
          result.push(html);
        }
        done(err);
      });
    };
  }), function(err) { onDone(err, result); });
};

Theme.prototype.tag = function(tags, onDone) {
  var self = this,
      result = {},
      tasks = [];
  Object.keys(tags).forEach(function(tag) {
    // tags [ post, post, post ] -> tags [ subset, subset ]
    var posts = tags[tag];

    paginate(posts, 5).forEach(function(item, index) {
      var locals = extend({}, self._defaults, item, {
        tag: {
          name: tag,
          slug: tag.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          // needed for isTag
          description: tag,
          parent: null
        },
        relativeUrl: '/'
      });

      tasks.push(function(done) {
        self._renderFn(self.templatePath + '/tag.hbs', locals, function(err, html) {
          if (!err && html) {
            if (!result[tag]) {
              result[tag] = [html];
            } else {
              result[tag].push(html);
            }
          }
          done(err);
        });
      });
    });
  });
  miniq(1, tasks, function(err) {
    onDone(err, result);
  });
};
