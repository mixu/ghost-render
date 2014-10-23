
### Enhancements to Ghost functionality

*Code syntax highlighting*.

*Table of contents helper*.

*Per-heading anchors*.

*Archives by year, month and day*.

*Google sitemap generation*.


### Missing features

- If you want to have a custom template for a specific page you can do so by creating a template with the name page-{{slug}}.hbs. For example if you have a page called 'About' that lives at /about/ then you can add a template called page-about.hbs and this template will be used to render only the about page.
- Supported: everything except the `home.hbs` special page for the first render of the index...


## TODO

- pluggability similar to generate-md 
  - TOC generation

- Preview your site as you work. Includes a built in dev server with rebuild on demand.

- remove first heading if it matches title
- use a proper yaml parser (if it exists)
- be more lenient about metadata delimitation, for example accept:

```
foo: bar
bar: baz

Lorem ipsum ...
```

as a valid config block

- Link rewriting.
  - rewrite `.md` links to the correct file
  - do a bit of work to try to find the correct file intelligently
  - Add support to linking to a specific section e.g. [project license](about.md#license) by adding predictable anchors in the converted markdown
- check whether copied non-md files already exist
- be more lenient about date formats for date fields
- URL customization options
- directorify - rename a file from whatever/name.html to whatever/name/index.html.
- features:
  - archives by year, month, day (/archives? or directly under yyyy/mm/ etc.)
  - sitemap
- S3 deploy example
- allow YAML config (JSON is a subset of YAML)
- relative URLs
- server + watch + live reload
- plugins via subarg, helpers via subarg
- config file in addition to cli opts
- Google sitemap generation
- `--drafts`: build drafts. To preview your site with drafts, simply add the `--drafts` CLI option.
- `--future`: build future dated posts + support for queueing posts for publication later.
- pagination: set items per page
