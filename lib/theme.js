var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    hbs = require('express-hbs'),
    miniq = require('miniq'),
    extend = require('xtend');

var getConfig = require('./config-shim'),
    getHelpers = require('./ghost/helpers/helpers');

module.exports = Theme;

exports.render = function(opts) {
  var helpers = getHelpers(opts.configShim);

  Object.keys(helpers).forEach(function(name) {
    var fn = helpers[name];
    hbs.registerHelper(name, fn);
  });
  return hbs.express3(opts);
};

function getPartials(tpath) {
  return [
    tpath,
    __dirname + '/ghost/helpers/tpl/',
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
  // Ghost helpers detect context based on this field... it has no other use here.
  Object.keys(opts.meta.authors).forEach(function(key) {
    opts.meta.authors[key].status = 'active';
    opts.meta.authors[key].location = ' ';
  });

  this.meta = opts.meta;
  this.configShim = getConfig(this.meta);

  this._renderFn = exports.render({
    partialsDir: getPartials(this.templatePath),
    // undocumented, passed to handlebars templates as the options hash
    templateOptions: {
      data: { blog: this.meta.blog }
    },
    // pass in the config json
    configShim: this.configShim
  });
}

Theme.prototype.post = function(post, onDone) {
  var locals = extend({}, this._defaults, {
    post: post,
    relativeUrl: post.relativeUrl
  });
  this._renderFn(this.templatePath + '/post.hbs', locals, onDone);
};

Theme.prototype.page = function(post, onDone) {
  var locals = extend({}, this._defaults, {
    post: post,
    relativeUrl: post.relativeUrl
  });
  this._renderFn(this.templatePath + '/page.hbs', locals, onDone);
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


var RSS = require('rss');

Theme.prototype.rss = function(opts, onDone) {
  var self = this;
  var perPage = opts.perPage || 15, // seems to be the ghost default
      author = opts.author, // optional
      tag = opts.tag, // optional
      posts = opts.posts;

  var title = this.meta.blog.title,
      description = this.meta.blog.description,
      permalinks = '/:slug/',
      siteUrl = this.configShim.urlFor('home', {secure: false }, true),
      feedUrl = this.configShim.urlFor('rss', {secure: false }, true);

  if (tag) {
    title = tag.name + ' - ' + title;
    feedUrl = siteUrl + 'tag/' + tag.slug + '/rss/';
  }

  if (author) {
    title = author.name + ' - ' + title;
    feedUrl = siteUrl + 'author/' + author.slug + '/rss/';
  }

  // generate all the pages; Ghost does paginated RSS for all of the supported feeds
  var result = [];

  paginate(posts, perPage).forEach(function(page) {
    var feed = new RSS({
      title: title,
      description: description,
      generator: 'Ghost',
      feed_url: feedUrl,
      site_url: siteUrl,
      ttl: '60'
    });

    page.posts.forEach(function(post) {
      var item = {
        title: post.title,
        guid: post.uuid, // CAN USE URL INSTEAD
        url: self.configShim.urlFor('post', {post: post, permalinks: permalinks}, true),
        date: post.published_at,
        categories: _.pluck(post.tags, 'name'),
        author: post.author ? post.author.name : null
      };
      /*
      htmlContent = cheerio.load(post.html, {decodeEntities: false});

      // convert relative resource urls to absolute
      ['href', 'src'].forEach(function (attributeName) {
        htmlContent('[' + attributeName + ']').each(function (ix, el) {
          el = htmlContent(el);

          var attributeValue = el.attr(attributeName);
          attributeValue = url.resolve(siteUrl, attributeValue);

          el.attr(attributeName, attributeValue);
        });
      });

      item.description = htmlContent.html();
      */

      item.description = post.html;

      feed.item(item);
    });
    result.push(feed.xml());
  });
  onDone(null, result);
};
