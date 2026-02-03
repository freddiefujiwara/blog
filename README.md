# Minimalist Blog Viewer

This project is a small web app that shows blog posts.
It loads post data from a Google Apps Script endpoint and renders the markdown in the browser.
The backend source code is available here: [https://github.com/freddiefujiwara/blog-gas](https://github.com/freddiefujiwara/blog-gas)

You can visit the blog home here: [https://freddiefujiwara.com/blog/](https://freddiefujiwara.com/blog/)

## How it works

- The app is built with **Vue 3** and **Vite**.
- It uses **Vue Router** to handle different pages and blog post URLs.
- When you open the page, it gets a list of all blog posts.
- It finds which post to show by looking at the URL.
- It fetches the post content and turns the markdown text into HTML using the **marked** library.
- It has a special `404.html` file. This helps the blog work correctly when hosted on GitHub Pages.

## Source Code (src folder)

Here is a simple explanation of the files inside the `src` folder:

### Folders

- **components/**: This folder contains the small pieces of the website.
  - `ArticleContent.vue`: Shows the title and the main text of a blog post.
  - `NavigationLinks.vue`: Shows the buttons to go to the previous or next post.
  - `StatusMessage.vue`: Shows messages like "Loading..." or error messages.
- **composables/**: This folder contains the logic for the app.
  - `useBlog.js`: Manages the blog data, handles loading, and manages errors.
- **pages/**: This folder contains the main pages of the app.
  - `BlogView.vue`: The main page that displays the blog post and navigation.
- **services/**: This folder handles talking to the internet.
  - `api.js`: Functions to fetch data from the Google Apps Script server.

### Files

- `App.vue`: The main container of the app that shows the site title and the current page.
- `router.js`: Defines the web addresses (routes) for the app.
- `articleNavigation.js`: A helper to decide which post is "next" or "previous".
- `constants.js`: Stores fixed values, like the API address.
- `main.js`: The starting point that starts the Vue app.
- `style.css`: Defines how the website looks (colors, fonts, etc.).

## Scripts

- `npm install`: Installs the tools needed for the project.
- `npm run dev`: Starts the website on your computer for development.
- `npm run build`: Prepares the website for the internet.
- `npm run preview`: Lets you check the final build on your computer.
- `npm test`: Runs the automated tests to make sure everything works.
