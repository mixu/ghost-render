var moment = require('moment'),
    _ = require('lodash');

// A shim for the Ghost config object, which is a global, which makes rendering
// with different settings hard given that concurrent renders are possible and should not
// interact with each other.

module.exports = function getConfig(meta) {
  var config = {
    url: meta.blog.url,
    urlSSL: meta.blog.url,

    paths: {
      subdir: '', // if the blog is not hosted at the root
      availableThemes: {
        casper: {
          'package.json': { name: 'Casper', version: '1.0.0' }
        }
      }
    },
    theme: {
      url: meta.blog.url.replace(/\/$/, ''),
      title: meta.blog.title,
      description: meta.blog.description
    },

    fileStorage: false,
    apps: false
  };

  // ## urlFor
  // Synchronous url creation for a given context
  // Can generate a url for a named path, given path, or known object (post)
  // Determines what sort of context it has been given, and delegates to the correct generation method,
  // Finally passing to createUrl, to ensure any subdirectory is honoured, and the url is absolute if needed
  // Usage:
  // urlFor('home', true) -> http://my-ghost-blog.com/
  // E.g. /blog/ subdir
  // urlFor({relativeUrl: '/my-static-page/') -> /blog/my-static-page/
  // E.g. if post object represents welcome post, and slugs are set to standard
  // urlFor('post', {...}) -> /welcome-to-ghost/
  // E.g. if post object represents welcome post, and slugs are set to date
  // urlFor('post', {...}) -> /2014/01/01/welcome-to-ghost/
  // Parameters:
  // - context - a string, or json object describing the context for which you need a url
  // - data (optional) - a json object containing data needed to generate a url
  // - absolute (optional, default:false) - boolean whether or not the url should be absolute
  // This is probably not the right place for this, but it's the best place for now
  config.urlFor = function urlFor(context, data, absolute) {
    var urlPath = '/',
        secure,
        knownObjects = ['post', 'tag', 'author'],

    // this will become really big
    knownPaths = {
        home: '/',
        rss: '/rss/index.xml',
        api: '/ghost/api/v0.1'
    };

    // Make data properly optional
    if (_.isBoolean(data)) {
        absolute = data;
        data = null;
    }

    // Can pass 'secure' flag in either context or data arg
    secure = (context && context.secure) || (data && data.secure);

    if (_.isObject(context) && context.relativeUrl) {
        urlPath = context.relativeUrl;
    } else if (_.isString(context) && _.indexOf(knownObjects, context) !== -1) {

        if (context === 'post' && (!data.post || !data.post.preComputedRelativeUrl)) {
          console.error('Post object is missing the preComputedRelativeUrl property! This is expected in ' +
            'ghost-render, because we calculate blog urls in advance.');
          throw new Error('Post object is missing the preComputedRelativeUrl property!');
        }

        // trying to create a url for an object
        if (context === 'post' && data.post) {
            urlPath = data.post.preComputedRelativeUrl;
            secure = data.post.secure;
        } else if (context === 'tag' && data.tag) {
            urlPath = '/tag/' + data.tag.slug + '/';
            secure = data.tag.secure;
        } else if (context === 'author' && data.author) {
            urlPath = '/author/' + data.author.slug + '/';
            secure = data.author.secure;
        }
        // other objects are recognised but not yet supported
    } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
        // trying to create a url for a named path
        urlPath = knownPaths[context] || '/';
    }

    return createUrl(urlPath, absolute, secure);
  };

  // ## createUrl
  // Simple url creation from a given path
  // Ensures that our urls contain the subdirectory if there is one
  // And are correctly formatted as either relative or absolute
  // Usage:
  // createUrl('/', true) -> http://my-ghost-blog.com/
  // E.g. /blog/ subdir
  // createUrl('/welcome-to-ghost/') -> /blog/welcome-to-ghost/
  // Parameters:
  // - urlPath - string which must start and end with a slash
  // - absolute (optional, default:false) - boolean whether or not the url should be absolute
  // - secure (optional, default:false) - boolean whether or not to use urlSSL or url config
  // Returns:
  //  - a URL which always ends with a slash
  function createUrl(urlPath, absolute, secure) {
      urlPath = urlPath || '/';
      absolute = absolute || false;

      var output = '', baseUrl;

      // create base of url, always ends without a slash
      if (absolute) {
          baseUrl = (secure && config.urlSSL) ? config.urlSSL : config.url;
          output += baseUrl.replace(/\/$/, '');
      } else {
          output += config.paths.subdir;
      }

      // append the path, always starts and ends with a slash
      output += urlPath;

      return output;
  }

  // ## urlForPost
  // Get a URL for the given post
  // Parameters
  // - settings - passed reference to api.settings
  // - post - a json object representing a post
  // - absolute (optional, default:false) - boolean whether or not the url should be absolute

  config.urlForPost = function urlForPost(settings, post, absolute) {
    var result = config.urlFor('post', { post: post }, absolute);
    return result;
  };

  return config;
};
