var downsize = require('downsize'),
    hbs = require('express-hbs'),
    moment = require('moment'),
    _ = require('lodash'),
    handlebars = require('handlebars'),
    downzero = require('../utils/downzero'),
    template = require('./template'),
    schema = require('../data/schema').checks,

    assetTemplate = _.template('<%= source %>'),
    linkTemplate = _.template('<a href="<%= url %>"><%= text %></a>'),
    scriptTemplate = _.template('<script src="<%= source %>"></script>');

// Note for upgrading helpers: In order to avoid having a global config object,
// the full set of functions is wrapped in a function which takes the config object
// as a parameter and returns all the helper functions.
//
// Additionally, all async helpers have been converted to sync. The way express-hbs
// does async helpers is horrible (inject string then replace it later with the result) and
// async helpers are a bad idea (RE: https://github.com/wycats/handlebars.js/issues/717 ).
//
// I'd rather either 1) provide the necessary data eagerly (e.g. load the necessary config options
// and always pass them to the helpers) or if doing work eagerly is too expensive, then
// 2) parse the template once to determine what helpers it uses (could probably just use
// the "missingHelper" helper there) and from then on always fetch and provide the data
// needed for those template helpers since we're rendering them anyway. Vanilla Handlebars FTW.
// But the place to fix this is ghost-core, not here, all I can do is a bunch of workarounds.

module.exports = function getHelpers(config) {
    var isProduction = true,
        coreHelpers = {};

     // [ description]
     //
     // @param  {Object} context date object
     // @param  {*} options
     // @return {Object} A Moment time / date object

    coreHelpers.date = function(context, options) {
        if (!options && context.hasOwnProperty('hash')) {
            options = context;
            context = undefined;

            // set to published_at by default, if it's available
            // otherwise, this will print the current date
            if (this.published_at) {
                context = this.published_at;
            }
        }

        // ensure that context is undefined, not null, as that can cause errors
        context = context === null ? undefined : context;

        var f = options.hash.format || 'MMM Do, YYYY',
            timeago = options.hash.timeago,
            date;

        if (timeago) {
            date = moment(context).fromNow();
        } else {
            date = moment(context).format(f);
        }
        return date;
    };

    //
    // ### URI Encoding helper
    //
    // *Usage example:*
    // `{{encode uri}}`
    //
    // Returns URI encoded string
    //
    coreHelpers.encode = function(context, str) {
        var uri = context || str;
        return new hbs.handlebars.SafeString(encodeURIComponent(uri));
    };

    // ### Page URL Helper
    //
    // *Usage example:*
    // `{{page_url 2}}`
    //
    // Returns the URL for the page specified in the current object
    // context.
    //
    coreHelpers.page_url = function(context, block) {
        /*jshint unused:false*/
        var url = config.paths.subdir;

        if (this.tagSlug !== undefined) {
            url += '/tag/' + this.tagSlug;
        }

        if (this.authorSlug !== undefined) {
            url += '/author/' + this.authorSlug;
        }

        if (context > 1) {
            url += '/page/' + context;
        }

        url += '/';

        return url;
    };

    // ### Page URL Helper: DEPRECATED
    //
    // *Usage example:*
    // `{{pageUrl 2}}`
    //
    // Returns the URL for the page specified in the current object
    // context. This helper is deprecated and will be removed in future versions.
    //
    coreHelpers.pageUrl = function(context, block) {
        console.error('Warning: pageUrl is deprecated, please use page_url instead\n' +
                        'The helper pageUrl has been replaced with page_url in Ghost 0.4.2, ' +
                        'and will be removed entirely in Ghost 0.6\n' +
                        'In your theme\'s pagination.hbs file, pageUrl should be renamed to page_url');

        /*jshint unused:false*/
        var self = this;

        return coreHelpers.page_url.call(self, context, block);
    };

    // ### Asset helper
    //
    // *Usage example:*
    // `{{asset "css/screen.css"}}`
    // `{{asset "css/screen.css" ghost="true"}}`
    // Returns the path to the specified asset. The ghost
    // flag outputs the asset path for the Ghost admin
    coreHelpers.asset = function(context, options) {
        var output = '',
            isAdmin = options && options.hash && options.hash.ghost;

        output += config.paths.subdir + '/';

        if (!context.match(/^favicon\.ico$/) && !context.match(/^shared/) && !context.match(/^asset/)) {
            if (isAdmin) {
                output += 'ghost/';
            } else {
                output += 'assets/';
            }
        }

        // Get rid of any leading slash on the context
        context = context.replace(/^\//, '');
        output += context;

        if (!context.match(/^favicon\.ico$/)) {
            output = assetTemplate({ source: output });
        }

        return new hbs.handlebars.SafeString(output);
    };

    // ### Author Helper
    //
    // *Usage example:*
    // `{{author}}`
    //
    // Returns the full name of the author of a given post, or a blank string
    // if the author could not be determined.
    //
    coreHelpers.author = function(context, options) {
        if (_.isUndefined(options)) {
            options = context;
        }

        if (options.fn) {
            return hbs.handlebars.helpers['with'].call(this, this.author, options);
        }

        var autolink = _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true,
            output = '';

        if (this.author && this.author.name) {
            if (autolink) {
                output = linkTemplate({
                    url: config.urlFor('author', {author: this.author}),
                    text: _.escape(this.author.name)
                });
            } else {
                output = _.escape(this.author.name);
            }
        }

        return new hbs.handlebars.SafeString(output);
    };

    // ### Tags Helper
    //
    // *Usage example:*
    // `{{tags}}`
    // `{{tags separator=' - '}}`
    //
    // Returns a string of the tags on the post.
    // By default, tags are separated by commas.
    //
    // Note that the standard {{#each tags}} implementation is unaffected by this helper
    // and can be used for more complex templates.
    coreHelpers.tags = function(options) {
        options = options || {};
        options.hash = options.hash || {};

        var autolink = options.hash && _.isString(options.hash.autolink) &&
            options.hash.autolink === 'false' ? false : true,
            separator = options.hash && _.isString(options.hash.separator) ? options.hash.separator : ', ',
            prefix = options.hash && _.isString(options.hash.prefix) ? options.hash.prefix : '',
            suffix = options.hash && _.isString(options.hash.suffix) ? options.hash.suffix : '',
            output = '';

        function createTagList(tags) {
            var tagNames = _.pluck(tags, 'name');

            if (autolink) {
                return _.map(tags, function(tag) {
                    return linkTemplate({
                        url: config.urlFor('tag', {tag: tag}),
                        text: _.escape(tag.name)
                    });
                }).join(separator);
            }
            return _.escape(tagNames.join(separator));
        }

        if (this.tags && this.tags.length) {
            output = prefix + createTagList(this.tags) + suffix;
        }

        return new hbs.handlebars.SafeString(output);
    };

    // ### Content Helper
    //
    // *Usage example:*
    // `{{content}}`
    // `{{content words="20"}}`
    // `{{content characters="256"}}`
    //
    // Turns content html into a safestring so that the user doesn't have to
    // escape it or tell handlebars to leave it alone with a triple-brace.
    //
    // Enables tag-safe truncation of content by characters or words.
    //
    // **returns** SafeString content html, complete or truncated.
    //
    coreHelpers.content = function(options) {
        var truncateOptions = (options || {}).hash || {};
        truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
        _.keys(truncateOptions).map(function(key) {
            truncateOptions[key] = parseInt(truncateOptions[key], 10);
        });

        if (truncateOptions.hasOwnProperty('words') || truncateOptions.hasOwnProperty('characters')) {
            // Legacy function: {{content words="0"}} should return leading tags.
            if (truncateOptions.hasOwnProperty('words') && truncateOptions.words === 0) {
                return new hbs.handlebars.SafeString(
                    downzero(this.html)
                );
            }

            // Due to weirdness in downsize the 'words' option
            // must be passed as a string. refer to #1796
            // TODO: when downsize fixes this quirk remove this hack.
            if (truncateOptions.hasOwnProperty('words')) {
                truncateOptions.words = truncateOptions.words.toString();
            }
            return new hbs.handlebars.SafeString(
                downsize(this.html, truncateOptions)
            );
        }

        return new hbs.handlebars.SafeString(this.html);
    };

    coreHelpers.title = function() {
        return new hbs.handlebars.SafeString(hbs.handlebars.Utils.escapeExpression(this.title || ''));
    };

    // ### Excerpt Helper
    //
    // *Usage example:*
    // `{{excerpt}}`
    // `{{excerpt words="50"}}`
    // `{{excerpt characters="256"}}`
    //
    // Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
    //
    // Defaults to words="50"
    //
    // **returns** SafeString truncated, HTML-free content.
    //
    coreHelpers.excerpt = function(options) {
        var truncateOptions = (options || {}).hash || {},
            excerpt;

        truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
        _.keys(truncateOptions).map(function(key) {
            truncateOptions[key] = parseInt(truncateOptions[key], 10);
        });

        /*jslint regexp:true */
        excerpt = String(this.html).replace(/<\/?[^>]+>/gi, '');
        excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
        /*jslint regexp:false */

        if (!truncateOptions.words && !truncateOptions.characters) {
            truncateOptions.words = 50;
        }

        return new hbs.handlebars.SafeString(
            downsize(excerpt, truncateOptions)
        );
    };

    // ### Filestorage helper
    //
    // *Usage example:*
    // `{{file_storage}}`
    //
    // Returns the config value for fileStorage.
    coreHelpers.file_storage = function(context, options) {
        /*jshint unused:false*/
        if (config.hasOwnProperty('fileStorage')) {
            return _.isObject(config.fileStorage) ? 'true' : config.fileStorage.toString();
        }
        return 'true';
    };

    // ### Apps helper
    //
    // *Usage example:*
    // `{{apps}}`
    //
    // Returns the config value for apps.
    coreHelpers.apps = function(context, options) {
        /*jshint unused:false*/
        if (config.hasOwnProperty('apps')) {
            return config.apps.toString();
        }
        return 'false';
    };

    // ### Blog Url helper
    //
    // *Usage example:*
    // `{{blog_url}}`
    //
    // Returns the config value for url.
    coreHelpers.blog_url = function(context, options) {
        /*jshint unused:false*/
        return config.theme.url.toString();
    };

    coreHelpers.ghost_script_tags = function() {
        var scriptList = isProduction ? scriptFiles.production : scriptFiles.development;

        scriptList = _.map(scriptList, function(fileName) {
            return scriptTemplate({
                source: config.paths.subdir + '/ghost/scripts/' + fileName,
                version: coreHelpers.assetHash
            });
        });

        return scriptList.join('');
    };

    // ### Has Helper
    // `{{#has tag="video, music"}}`
    // `{{#has author="sam, pat"}}`
    // Checks whether a post has at least one of the tags
    coreHelpers.has = function(options) {
        options = options || {};
        options.hash = options.hash || {};

        var tags = _.pluck(this.tags, 'name'),
            author = this.author ? this.author.name : null,
            tagList = options.hash.tag || false,
            authorList = options.hash.author || false,
            tagsOk,
            authorOk;

        function evaluateTagList(expr, tags) {
            return expr.split(',').map(function(v) {
                return v.trim();
            }).reduce(function(p, c) {
                return p || (_.findIndex(tags, function(item) {
                    // Escape regex special characters
                    item = item.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, '\\$&');
                    item = new RegExp(item, 'i');
                    return item.test(c);
                }) !== -1);
            }, false);
        }

        function evaluateAuthorList(expr, author) {
            var authorList = expr.split(',').map(function(v) {
                return v.trim().toLocaleLowerCase();
            });

            return _.contains(authorList, author.toLocaleLowerCase());
        }

        if (!tagList && !authorList) {
            errors.logWarn('Invalid or no attribute given to has helper');
            return;
        }

        tagsOk = tagList && evaluateTagList(tagList, tags) || false;
        authorOk = authorList && evaluateAuthorList(authorList, author) || false;

        if (tagsOk || authorOk) {
            return options.fn(this);
        }
        return options.inverse(this);
    };

    // ### Pagination Helper
    // `{{pagination}}`
    // Outputs previous and next buttons, along with info about the current page
    coreHelpers.pagination = function(options) {
        /*jshint unused:false*/
        if (!_.isObject(this.pagination) || _.isFunction(this.pagination)) {
            throw new Error('pagination data is not an object or is a function');
            return;
        }

        if (_.isUndefined(this.pagination.page) || _.isUndefined(this.pagination.pages) ||
                _.isUndefined(this.pagination.total) || _.isUndefined(this.pagination.limit)) {
            throw new Error('All values must be defined for page, pages, limit and total');
            return;
        }

        if ((!_.isNull(this.pagination.next) && !_.isNumber(this.pagination.next)) ||
                (!_.isNull(this.pagination.prev) && !_.isNumber(this.pagination.prev))) {
            throw new Error('Invalid value, Next/Prev must be a number');
            return;
        }

        if (!_.isNumber(this.pagination.page) || !_.isNumber(this.pagination.pages) ||
                !_.isNumber(this.pagination.total) || !_.isNumber(this.pagination.limit)) {
            throw new Error('Invalid value, check page, pages, limit and total are numbers');
            return;
        }

        var context = _.merge({}, this.pagination);

        if (this.tag !== undefined) {
            context.tagSlug = this.tag.slug;
        }

        if (this.author !== undefined) {
            context.authorSlug = this.author.slug;
        }

        return template.execute('pagination', context);
    };

    // ## Pluralize strings depending on item count
    // {{plural 0 empty='No posts' singular='% post' plural='% posts'}}
    // The 1st argument is the numeric variable which the helper operates on
    // The 2nd argument is the string that will be output if the variable's value is 0
    // The 3rd argument is the string that will be output if the variable's value is 1
    // The 4th argument is the string that will be output if the variable's value is 2+
    // coreHelpers.plural = function (number, empty, singular, plural) {
    coreHelpers.plural = function(context, options) {
        if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
            _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
            return errors.logAndThrowError('All values must be defined for empty, singular and plural');
        }

        if (context === 0) {
            return new hbs.handlebars.SafeString(options.hash.empty);
        } else if (context === 1) {
            return new hbs.handlebars.SafeString(options.hash.singular.replace('%', context));
        } else if (context >= 2) {
            return new hbs.handlebars.SafeString(options.hash.plural.replace('%', context));
        }
    };

    coreHelpers.foreach = function(context, options) {
        var fn = options.fn,
            inverse = options.inverse,
            i = 0,
            j = 0,
            columns = options.hash.columns,
            key,
            ret = '',
            data;

        if (options.data) {
            data = hbs.handlebars.createFrame(options.data);
        }

        function setKeys(_data, _i, _j, _columns) {
            if (_i === 0) {
                _data.first = true;
            }
            if (_i === _j - 1) {
                _data.last = true;
            }
            // first post is index zero but still needs to be odd
            if (_i % 2 === 1) {
                _data.even = true;
            } else {
                _data.odd = true;
            }
            if (_i % _columns === 0) {
                _data.rowStart = true;
            } else if (_i % _columns === (_columns - 1)) {
                _data.rowEnd = true;
            }
            return _data;
        }
        if (context && typeof context === 'object') {
            if (context instanceof Array) {
                for (j = context.length; i < j; i += 1) {
                    if (data) {
                        data.index = i;
                        data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                        data = setKeys(data, i, j, columns);
                    }
                    ret = ret + fn(context[i], {data: data});
                }
            } else {
                for (key in context) {
                    if (context.hasOwnProperty(key)) {
                        j += 1;
                    }
                }
                for (key in context) {
                    if (context.hasOwnProperty(key)) {
                        if (data) {
                            data.key = key;
                            data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                            data = setKeys(data, i, j, columns);
                        }
                        ret = ret + fn(context[key], {data: data});
                        i += 1;
                    }
                }
            }
        }

        if (i === 0) {
            ret = inverse(this);
        }

        return ret;
    };

    // CONVERTED FROM ASYNC

    coreHelpers.ghost_foot = function(options) {
        /*jshint unused:false*/
        var jquery = '/assets/js/jquery.min.js',
            foot = [];

        foot.push(scriptTemplate({ source: jquery }));

        var footString = _.reduce(foot, function(memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    };
    // ### URL helper
    //
    // *Usage example:*
    // `{{url}}`
    // `{{url absolute="true"}}`
    //
    // Returns the URL for the current object context
    // i.e. If inside a post context will return post permalink
    // absolute flag outputs absolute URL, else URL is relative
    coreHelpers.url = function(options) {
        var absolute = options && options.hash.absolute;

        if (schema.isPost(this)) {
            return config.urlForPost('UNUSED', this, absolute);
        }

        if (schema.isTag(this)) {
            return config.urlFor('tag', {tag: this}, absolute);
        }

        if (schema.isUser(this)) {
            return config.urlFor('author', {author: this}, absolute);
        }

        return config.urlFor(this, absolute);
    };

    coreHelpers.post_class = function(options) {
        /*jshint unused:false*/
        var classes = ['post'],
            tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
            featured = this.post && this.post.featured ? this.post.featured : this.featured || false,
            page = this.post && this.post.page ? this.post.page : this.page || false;

        if (tags) {
            classes = classes.concat(tags.map(function(tag) { return 'tag-' + tag.slug; }));
        }

        if (featured) {
            classes.push('featured');
        }

        if (page) {
            classes.push('page');
        }

        var classString = _.reduce(classes, function(memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    };

    coreHelpers.ghost_head = function(options) {
        /*jshint unused:false*/
        var self = this,
            blog = config.theme,
            head = [],
            majorMinor = /^(\d+\.)?(\d+)/,
            trimmedVersion = this.version,
            trimmedUrlpattern = /.+(?=\/page\/\d*\/)/,
            trimmedUrl, next, prev;

        trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

        head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');

        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            _.escape(blog.title) + '" href="' + config.urlFor('rss') + '">');

        var url = coreHelpers.url.call(self, {hash: {absolute: true}});

        head.push('<link rel="canonical" href="' + url + '" />');

        if (self.pagination) {
            trimmedUrl = self.relativeUrl.match(trimmedUrlpattern);
            if (self.pagination.prev) {
                prev = (self.pagination.prev > 1 ? prev = '/page/' + self.pagination.prev + '/' : prev = '/');
                prev = (trimmedUrl) ? '/' + trimmedUrl + prev : prev;
                head.push('<link rel="prev" href="' + config.urlFor({relativeUrl: prev}, true) + '" />');
            }
            if (self.pagination.next) {
                next = '/page/' + self.pagination.next + '/';
                next = (trimmedUrl) ? '/' + trimmedUrl + next : next;
                head.push('<link rel="next" href="' + config.urlFor({relativeUrl: next}, true) + '" />');
            }
        }

        var headString = _.reduce(head, function(memo, item) { return memo + '\n' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    };

    coreHelpers.body_class = function(options) {
        /*jshint unused:false*/
        var classes = [],
            post = this.post,
            tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
            page = this.post && this.post.page ? this.post.page : this.page || false;

        if (this.tag !== undefined) {
            classes.push('tag-template');
            classes.push('tag-' + this.tag.slug);
        }

        if (this.author !== undefined) {
            classes.push('author-template');
            classes.push('author-' + this.author.slug);
        }

        if (_.isString(this.relativeUrl) && this.relativeUrl.match(/\/(page\/\d)/)) {
            classes.push('paged');
            // To be removed from pages by #2597 when we're ready to deprecate this
            classes.push('archive-template');
        } else if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
            classes.push('home-template');
        } else if (post) {
            // To be removed from pages by #2597 when we're ready to deprecate this
            // i.e. this should be if (post && !page) { ... }
            classes.push('post-template');
        }

        if (page) {
            classes.push('page-template');
            // To be removed by #2597 when we're ready to deprecate this
            classes.push('page');
        }

        if (tags) {
            classes = classes.concat(tags.map(function(tag) { return 'tag-' + tag.slug; }));
        }

        var response = {
                settings: [{key: 'activeTheme', value: 'casper'}]
        };

        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value],
            view;

        var template = { getThemeViewForPost: getThemeViewForPost };
        function getThemeViewForPost(themePaths, post) {
            var customPageView = 'page-' + post.slug,
                view = 'post';

            if (post.page) {
                view = 'page';
            }

            return view;
        }

        if (post && page) {
            view = template.getThemeViewForPost(paths, post).split('-');

            if (view[0] === 'page' && view.length > 1) {
                classes.push(view.join('-'));
                // To be removed by #2597 when we're ready to deprecate this
                view.splice(1, 0, 'template');
                classes.push(view.join('-'));
            }
        }

        var classString = _.reduce(classes, function(memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    };

    coreHelpers.meta_title = function(options) {
        /*jshint unused:false*/
        var title = '',
            blog,
            page,
            pageString = '';

        if (_.isString(this.relativeUrl)) {
            blog = config.theme;

            page = this.relativeUrl.match(/\/page\/(\d+)/);

            if (page) {
                pageString = ' - Page ' + page[1];
            }

            if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
                title = blog.title;
            } else if (this.author) {
                title = this.author.name + pageString + ' - ' + blog.title;
            } else if (this.tag) {
                title = this.tag.name + pageString + ' - ' + blog.title;
            } else if (this.post) {
                title = this.post.title;
            } else {
                title = blog.title + pageString;
            }
        }
            title = title || '';
            return title.trim();
    };

    coreHelpers.meta_description = function(options) {
        /*jshint unused:false*/
        var description,
            blog;

        if (_.isString(this.relativeUrl)) {
            blog = config.theme;
            if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
                description = blog.description;
            } else if (this.author) {
                description = /\/page\//.test(this.relativeUrl) ? '' : this.author.bio;
            } else if (this.tag || this.post || /\/page\//.test(this.relativeUrl)) {
                description = '';
            }
        }

            description = description || '';
            return description.trim();
    };

    return coreHelpers;
};




