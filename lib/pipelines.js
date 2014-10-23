var _ = require('lodash'),
    pi = require('pipe-iterators'),
    path = require('path'),
    miniq = require('miniq'),
    through = require('through2'),
    stream = require('./stream'),
    xtend = require('xtend'),
    clone = require('clone'),
    hbs = require('handlebars');

function paginate(key, perPage, makeUrl) {
  return through.obj(function(entry, enc, done) {
    var items = entry[key],
        total = items.length,
        pageCount = Math.max(1, Math.ceil(total / perPage)),
        page = 1,
        i;

    for (i = 0; i < total; i += perPage) {
      this.push(xtend(clone(entry), {
        posts: items.slice(i, i + perPage),
        pagination: {
          limit: 5,
          pages: pageCount,
          total: total,

          page: page,
          next: (page < pageCount ? page + 1 : null),
          prev: (page !== 1 ? page - 1 : null)
        },
        // assign the relativeUrl because ghost wants one to exist for everything
        // that uses ghost_head. In ghost, this is done by the express server btw.
        relativeUrl: makeUrl(entry, page - 1),
        preComputedRelativeUrl: makeUrl(entry, page - 1)
      }));
      page++;
    }
    done();
  });
}

module.exports = function(theme, inPath, outPath) {

  return {
    // render pipeline for individual posts
    post: pi.head([
      pi.map(function(entry) { entry.post = entry; return entry; }),
      // { contents: md } -> { contents: html }
      theme.stream('post'),
      pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
      pi.forEach(function(obj) { console.log('Write post:', obj.path); }),
      // { path: ... , contents: html } -> file
      stream.dest()
    ]),

    page: pi.head([
      pi.map(function(entry) { entry.post = entry; return entry; }),
      // { contents: md } -> { contents: html }
      theme.stream('page'),
      pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
      pi.forEach(function(obj) { console.log('Write page:', obj.path); }),
      // { path: ... , contents: html } -> file
      stream.dest()
    ]),

    // render pipeline for indexes
    index: pi.head([
      // { contents: md } -> [ { contents: md } ]
      pi.reduce(function(acc, curr) { acc.posts.push(curr); return acc; }, { posts: [] }),
      paginate('posts', 5, function(entry, index) {
        return (index === 0 ? '/index.html' : '/page/' + (index + 1) + '/index.html');
      }),
      theme.stream('index'),
      // { pages: [ html ] } -> { path: ..., contents: html }
      pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
      pi.forEach(function(obj) { console.log('Write index:', obj.path); }),
      // { path: ... , contents: html } -> file
      stream.dest()
    ]),

    tags: pi.head([
      stream.groupByTag(),
      // { contents: html } -> { tag: name, posts: ALL }
      pi.fork(
        // render pipeline for tag pages
        pi.head([
          pi.mapKey('tag', function(tag) {
            return {
              name: tag,
              slug: tag.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              // needed for isTag
              description: tag,
              parent: null
            };
          }),

          paginate('posts', 5, function(entry, index) {
            return '/tag/' + entry.tag +
                  (index === 0 ? '/index.html' : '/page/' + (index + 1) + '/index.html');
          }),
          // { tag: name, posts: ALL } -> { tag: name, posts: subset, pagination: ... }
          theme.stream('tag'),
          // { tag: name, posts: subset, pagination: ... } -> { tag: tag, contents: html }
          pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
          // { tag: tag, contents: html } -> { path: ..., contents: html }
          pi.forEach(function(obj) { console.log('Write tag:', obj.path); }),
          // { path: ... , contents: html } -> file
          stream.dest()
        ]),
        // tag rss
        pi.head([
          paginate('posts', 15, function(entry, index) {
            return '/tag/' + entry.tag + '/rss/' +
                  (index === 0 ? 'index.xml' : (index + 1) + '/index.xml');
          }),
          theme.stream('rss'),
          pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
           pi.forEach(function(obj) { console.log('Write tag RSS:', obj.path); }),
          stream.dest()
        ])
      )
    ]),

    authors: pi.head([
      stream.groupByAuthor(),
      // { contents: html } -> { author: name, posts: ALL }
      pi.mapKey('author', function(slug) {
        return theme.meta.authors[slug] || theme.meta.authors['default'];
      }),
      pi.fork(
        // render pipeline for author pages
        pi.head([
          // { author: name, posts: ALL } -> { author: name, posts: subset, pagination: ... }
          paginate('posts', 5, function(entry, index) {
            return '/author/' + entry.author.slug + '/' +
                  (index === 0 ? 'index.html' : 'page/' + (index + 1) + '/index.html');
          }),
          // { author: ... , posts: [ .. ] } -> { contents: html }
          theme.stream('author'),
          // { contents: html } -> { path: ..., contents: html }
          pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
          pi.forEach(function(obj) { console.log('Write author:', obj.path); }),
          // { path: ... , contents: html } -> file
          stream.dest()
        ]),
        pi.head([
          paginate('posts', 15, function(entry, index) {
            return '/author/' + entry.author.slug + '/rss/' +
                    (index === 0 ? 'index.xml' : (index + 1) + '/index.xml');
          }),
          theme.stream('rss'),
          pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
          pi.forEach(function(obj) { console.log('Write authors RSS:', obj.path); }),
          stream.dest()
        ])
      )
    ]),
    // posts RSS pipeline
    postRSS: pi.head([
      pi.reduce(function(acc, curr) { acc.posts.push(curr); return acc; }, { posts: [] }),
      paginate('posts', 15, function(entry, index) {
        return '/rss/' + (index === 0 ? 'index.xml' : (index + 1) + '/index.xml');
      }),
      theme.stream('rss'),
      pi.mapKey('path', function(path, entry, index) { return outPath + entry.relativeUrl; }),
      pi.forEach(function(obj) { console.log('Write index RSS:', obj.path); }),
      stream.dest()
    ])
  };
};
