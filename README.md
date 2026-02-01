# Minimalist Blog Viewer

This project is a small web app that shows blog posts.
It loads post data from a Google Apps Script endpoint and renders the markdown in the browser.
The page lets you move to the previous or next post and keeps the current post in the URL hash.

You can visit the blog home here: [https://freddiefujiwara.com/blog/](https://freddiefujiwara.com/blog/)

## How it works

- The app is built with Vue and Vite.
- When the page loads, it requests the list of article IDs.
- It chooses the right article ID from the URL path, query, or hash.
- It fetches the article and turns the markdown into HTML.
- Navigation links let you go to older or newer posts.

## Scripts

- `npm install` installs dependencies.
- `npm run dev` starts the local development server.
- `npm run build` builds the production files.
- `npm run preview` previews the production build.
