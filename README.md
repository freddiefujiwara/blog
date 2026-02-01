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

## Source Code (src folder)

Here is a simple explanation of the files inside the `src` folder:

### Folders

- **components/**: This folder contains the UI pieces of the website.
  - `ArticleContent.vue`: Shows the title and text of a blog post.
  - `NavigationLinks.vue`: Shows the buttons to go to the previous or next post.
  - `StatusMessage.vue`: Shows messages like "Loading..." or errors.
- **composables/**: This folder contains the shared logic for the app.
  - `useBlog.js`: This is the "brain" of the app. It manages the blog data and handles the state (like loading or errors).
- **services/**: This folder handles communication with the outside world.
  - `api.js`: Contains functions to fetch data from the Google Apps Script server.

### Files

- `App.vue`: The main layout of the app. It organizes the components on the page.
- `articleNavigation.js`: A helper that decides which blog post to show based on the URL.
- `constants.js`: Stores fixed values, such as the API web address.
- `main.js`: The starting point of the application. It initializes Vue.
- `style.css`: Contains the CSS rules that define how the website looks.

## Scripts

- `npm install`: Installs the tools needed for the project.
- `npm run dev`: Starts the website on your computer for development.
- `npm run build`: Prepares the website for the internet.
- `npm run preview`: Lets you check the final build on your computer.
