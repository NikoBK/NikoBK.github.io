# My Personal Website
Deployed with github pages using Jekyll layouts, points to DNS for 'nikolajbjoernager.dk'.

## Jekyll Local Dev
My local environment that uses ruby is made to match the current version of jekyll that github pages uses (see the gemfile). Bundler detects gems in `vendor/bundle` on my system.

Start the local jekyll server at `http://localhost:4000` by running the command:\
`bundle exec jekyll serve --livereload`

`--livereload` allows you to just refresh the site on every save (just like html normally)\
Stop the jekyll server with ctrl+c interrupt.

### Setting up the bundle install path
Use the following command to set up a local environment for bundle to install gems to:
`bundle config set --local path 'vendor/bundle'`

Then run
`bundle install`
