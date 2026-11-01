# Blog Viewer

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

## Guide for Beginners: Make Your Own Blog

This guide is for people who are new to GitHub.
It explains everything step by step, in simple words.
If you follow this guide, you can make your own blog for free.
You do not need a server.

### What you will make

Your blog has two parts:

1. **The back side (the "backend")**: A Google Apps Script project.
   It reads your Google Docs and sends the text to the web page.
   The backend project is here: [blog-gas](https://github.com/freddiefujiwara/blog-gas)
2. **The front side (this project)**: A web page.
   It gets the text from the back side and shows it as a blog.

You write blog posts in Google Docs. You do not write HTML.

### What you need

- A Google account (for Google Drive, Google Docs, and Apps Script)
- A GitHub account (for the web page)
- A computer with a web browser

Both accounts are free.

### Step 1: Make a GitHub account

1. Open [https://github.com](https://github.com) in your browser.
2. Click **Sign up**.
3. Write your email address, and click **Continue**.
4. Make a password, and click **Continue**.
5. Choose a username. This name is part of your blog address.
   Example: if your username is `taro`, your blog address will have `taro` in it.
   Use only small letters, numbers, and `-`.
6. Answer the simple questions on the screen, and click **Create account**.
7. GitHub sends you an email with a number (a code).
   Write the number on the GitHub page. Now your account is ready.

### Step 2: Set up the back side first

The back side sends your Docs to the web page, so set it up first.
Follow the **Setup** section in the backend README:
[blog-gas README](https://github.com/freddiefujiwara/blog-gas#setup)

At the end of that setup, you get a long web address (URL).
It looks like this:

```
https://script.google.com/macros/s/xxxxx/exec
```

Copy it and keep it in a safe place. You need it in Step 4.

### Step 3: Make your own copy of this project

This project is saved on GitHub in a place called a "repository".
You need your own copy, so you can change the settings.

1. Open this repository's page on GitHub.
2. Click the **Fork** button (near the top right of the page).
   "Fork" means "make my own copy".
3. Click **Create fork**.
4. Now you have the same project in your account.
   The address looks like this: `https://github.com/YOUR-USERNAME/blog`

You can change files in your copy on the GitHub website.
To change a file: open the file, click the pencil icon (**Edit**),
make your change, and click **Commit changes**.
"Commit" means "save the change".

### Step 4: Change the settings in your copy

You need to change a few things. All of them are your own information.

1. **Your back side address**
   - Open the file `src/constants.js`.
   - Find the long address that starts with `https://script.google.com/macros/s/`.
   - Change it to your Web App URL from Step 2.
2. **Your blog name and links**
   - Open the file `src/App.vue`.
   - Change the site name, the menu links, and the links at the bottom
     of the page (the "footer") to yours.
   - Open the files `index.html` and `404.html`.
   - Change the title and the web address in them to yours.
3. **Your blog address (the last part)**
   - Open the file `vite.config.js`.
   - There is a line: `base: '/blog/'`.
   - `/blog/` is the last part of the blog address.
   - If your blog address is `https://YOUR-USERNAME.github.io/blog/`,
     do not change this line.
   - If you use a different last part, change `/blog/` to your part.

### Step 5: Turn on GitHub Pages

GitHub Pages shows your web page on the internet. It is free.

This project has an automatic system (in the folder `.github/workflows`).
When you save a change in the `main` branch, the system builds your web page
and puts it on a special branch called `gh-pages`.
You only need to allow GitHub Pages to show that branch.

1. In your repository, click **Settings** (at the top of the page).
2. On the left side, click **Pages**.
3. Find **Build and deployment**. Under **Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **gh-pages** and **/ (root)**, and click **Save**.
   Note: The `gh-pages` branch is made by the automatic system.
   If you cannot see `gh-pages`, wait for the first run to finish
   (see Step 6), and then try again.
5. After a few minutes, your blog is on the internet at:
   `https://YOUR-USERNAME.github.io/blog/`

### Step 6: Check the automatic system

1. In your repository, click **Actions** (at the top of the page).
2. You can see a list of runs. A green check mark means "OK".
   A red X means "there is a problem".
3. The first run starts when you change a file in Step 4.
   Wait until you see the green check mark.

### Step 7: Write your first post

1. Make a new Google Doc in the folder you made in the back side setup.
2. The name of the Doc is the title of the post. Write your text in the Doc.
3. Wait about 10 minutes. The blog checks for new posts every few minutes.
4. Open your blog address. Your post is there.

### If something is wrong

- **The page is white (empty)**: Check the address in `src/constants.js` (Step 4).
  It must be your Web App URL from Step 2.
- **The posts do not show**: In the back side, check the deploy setting.
  "Who has access" must be **Anyone**. See the backend README.
- **Your change does not show on the blog**: Wait a few minutes,
  and check the **Actions** page (Step 6) for a green check mark.
- **The address is "404 Not Found"**: Check the GitHub Pages setting (Step 5)
  and the `base:` line in `vite.config.js` (Step 4).

### Words in this guide

- **Repository**: A place on GitHub that saves a project and its files.
- **Fork**: To make your own copy of a project.
- **Commit**: To save a change to a file.
- **Branch**: A copy of the files for a special use. `main` is the normal one.
- **Deploy**: To put a web page on the internet.
- **URL**: A web address.

## Source Code (src folder)

Here is a simple explanation of the files inside the `src` folder:

### Folders

- **components/**: This folder contains the small pieces of the website.
  - `ArticleContent.vue`: Shows the title and the main text of a blog post.
  - `NavigationLinks.vue`: Shows the buttons to go to the previous or next post.
  - `StatusMessage.vue`: Shows messages like "Loading..." or error messages.
- **composables/**: This folder contains the logic for the app.
  - `useBlog.js`: Manages the blog data, handles loading, and manages errors.
  - `useRSS.js`: Gets the RSS feed data for the RSS link and copy button.
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
