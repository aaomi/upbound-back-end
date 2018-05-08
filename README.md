# Upbound at work - back-end

### Back End Priorities:
- Authentication/Authorization (user accounts and access rights)
- Job Seeker Form API
- Job Seeker Database
- Old Database Import
- Job Posting API
- Email notifications (relevant jobs/candidates, news, account info)

#### Tech Stack:
- NodeJS - for server-side logic
- PostgreSQL - Database - I'm open to switching to a different SQL library, but I'm most familiar with Postgres
- AWS - hosting, database, domain routing, caching layer?
- Lodash - JS toolset
- ES6+ and babel - ability to use new JS features - necessary?
- React Server Side Rendering - if we get to it
- Caching Layer?

#### Important things to consider:
- Encryption
- Security - protection from SQL injection, XSS, etc. (Helmet in Node helps, PG package for node automatically prevents SQL injection)
- Staying up to date on npm packages
- Ford and other companies linking to the site
- Importing existing database during transition to new database
- Integration with / Exportability to Google Sheets
- Accessibility
- Database backups
- Ability to pass development on to someone else (Good testing, comments, documentation, etc.)
