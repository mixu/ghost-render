var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    hbs = require('express-hbs'),
    miniq = require('miniq'),
    xtend = require('xtend'),
    through = require('through2');

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
    partialsDir:
      [
        this.templatePath,
        __dirname + '/ghost/helpers/tpl/',
        fs.existsSync(this.templatePath + '/partials/') ?
            this.templatePath + '/partials/' : false
      ].filter(Boolean),
    // undocumented, passed to handlebars templates as the options hash
    templateOptions: {
      data: { blog: this.meta.blog }
    },
    // pass in the config json
    configShim: this.configShim
  });

  this._templatePaths = {
    index: this.templatePath + '/index.hbs',
    post: this.templatePath + '/post.hbs',
    page: fs.existsSync(this.templatePath + '/page.hbs') ? this.templatePath + '/page.hbs' : this.templatePath + '/post.hbs',
    tag: fs.existsSync(this.templatePath + '/tag.hbs') ? this.templatePath + '/tag.hbs' : this.templatePath + '/index.hbs',
    author: fs.existsSync(this.templatePath + '/author.hbs') ? this.templatePath + '/author.hbs' : this.templatePath + '/index.hbs',
  };

}

Theme.prototype.post = function(entry, onDone) {
  var locals = xtend({}, this._defaults, entry);
  this._renderFn(this._templatePaths.post, locals, onDone);
};

Theme.prototype.page = function(entry, onDone) {
  var locals = xtend({}, this._defaults, entry);
  this._renderFn(this._templatePaths.page, locals, onDone);
};

Theme.prototype.index = function(entry, done) {
  var locals = xtend({}, this._defaults, entry);
  this._renderFn(this._templatePaths.index, locals, done);
};

Theme.prototype.author = function(entry, done) {
  // entry must have: author, posts, pagination
  var locals = xtend({}, this._defaults, entry);
  this._renderFn(this._templatePaths.author, locals, done);
};

Theme.prototype.tag = function(entry, done) {
  var locals = xtend({}, this._defaults, entry);
  this._renderFn(this._templatePaths.tag, locals, done);
};

Theme.prototype.stream = function(name) {
  var theme = this;
  return through.obj(function(entry, enc, done) {
    var self = this;
    theme[name](entry, function(err, html) {
      if (err) { throw err; }
      entry.contents = html;
      self.push(entry);
      done();
    });
  });
};

var RSS = require('rss');

Theme.prototype.rss = function(entry, onDone) {
 var self = this;
 var author = entry.author, // optional
      tag = entry.tag, // optional
      posts = entry.posts;

  var title = this.meta.blog.title,
      description = this.meta.blog.description,
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

  var feed = new RSS({
    title: title,
    description: description,
    generator: 'Ghost',
    feed_url: feedUrl,
    site_url: siteUrl,
    ttl: '60'
  });

  posts.forEach(function(post) {
    var item = {
      title: post.title,
      guid: post.uuid, // CAN USE URL INSTEAD
      url: post.preComputedRelativeUrl,
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

  return onDone(null, feed.xml());
};
