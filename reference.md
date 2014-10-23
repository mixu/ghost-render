# Misc

Post fields

- id – post id
- title – post title
- url – the relative URL for a post
- content – post HTML
- published_at – date the post was published
- author – full details of the post author (see below for more details)


Post Tags

When inside the context of a single post, the following tag data is available

{{tag.name}} – the name of the tag
You can use {{tags}} to output a customisable list of tags

Globals 

{{@blog.url}} – the url specified for this env in config.js
{{@blog.title}} – the blog title from the settings page
{{@blog.description}} – the blog description from the settings page
{{@blog.logo}} – the blog logo from the settings page


DB:

            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
            title: {type: 'string', maxlength: 150, nullable: false},
            slug: {type: 'string', maxlength: 150, nullable: false, unique: true},
            markdown: {type: 'text', maxlength: 16777215, fieldtype: 'medium', nullable: true},
            html: {type: 'text', maxlength: 16777215, fieldtype: 'medium', nullable: true},
            image: {type: 'text', maxlength: 2000, nullable: true},
            featured: {type: 'bool', nullable: false, defaultTo: false, validations: {isIn: [[0, 1, false, true]]}},
            page: {type: 'bool', nullable: false, defaultTo: false, validations: {isIn: [[0, 1, false, true]]}},
            status: {type: 'string', maxlength: 150, nullable: false, defaultTo: 'draft'},
            language: {type: 'string', maxlength: 6, nullable: false, defaultTo: 'en_US'},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            author_id: {type: 'integer', nullable: false},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true},
            published_at: {type: 'dateTime', nullable: true},
            published_by: {type: 'integer', nullable: true}

Users

            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
            name: {type: 'string', maxlength: 150, nullable: false},
            slug: {type: 'string', maxlength: 150, nullable: false, unique: true},
            password: {type: 'string', maxlength: 60, nullable: false},
            email: {type: 'string', maxlength: 254, nullable: false, unique: true, validations: {isEmail: true}},
            image: {type: 'text', maxlength: 2000, nullable: true},
            cover: {type: 'text', maxlength: 2000, nullable: true},
            bio: {type: 'string', maxlength: 200, nullable: true},
            website: {type: 'text', maxlength: 2000, nullable: true, validations: {isEmptyOrURL: true}},
            location: {type: 'text', maxlength: 65535, nullable: true},
            accessibility: {type: 'text', maxlength: 65535, nullable: true},
            status: {type: 'string', maxlength: 150, nullable: false, defaultTo: 'active'},
            language: {type: 'string', maxlength: 6, nullable: false, defaultTo: 'en_US'},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            last_login: {type: 'dateTime', nullable: true},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}

Tags

            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
            name: {type: 'string', maxlength: 150, nullable: false},
            slug: {type: 'string', maxlength: 150, nullable: false, unique: true},
            description: {type: 'string', maxlength: 200, nullable: true},
            image: {type: 'text', maxlength: 2000, nullable: true},
            hidden: {type: 'bool', nullable: false, defaultTo: false, validations: {isIn: [[0, 1, false, true]]}},
            parent_id: {type: 'integer', nullable: true},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}
