# WP Downloader

Download WP stories for e-book readers, smartphones, desktop and more for free!

This software based on Node.js and Express.js can fetch stories from Wattpad and convert it into an EPUB file or a full functional HTML reader for offline availability.

> ⚠ Important information  
> [Statement of WattP.EU / WattPad.CC](https://www.reddit.com/r/wattpad_downloader/comments/1adulkg/statement_for_wattpeu_wattpadcc/)

## Prerequisites and information
**This is a server software and NOT a simple app!**  
It means that this software is meant to be installed on a server by a system administrator and then hooked into a network (for example, the Internet) so that other people can access the website through a browser.  
The Wattpad Downloader is not a program or an app that everyone downloads individually and then simply executes.

However, you can install it for local use on a PC with Windows, Mac or Linux.
For that, you need to install the [Node.js Framework](https://nodejs.org/en/).
Then follow the installation steps below.

If you have set it up properly, your terminal should output the URL that you can open in a web browser.

## Installation
1. Clone / download the repository
2. Go to the root directory of the project
3. (optional) Make sure to set up the environment variables properly
4. Run `npm install` in your terminal
5. Then run `npm start` in your terminal

## Project structure
- `/lang` Contains JSON files with language translations. The file name corresponds to the 2-3 letters language tag from the *Accept-Language* http header.
- `/routes` Contains js files with express routers.
- `/services` Contains js files with static classes that provides some functionalities.
- `/static` Contains multiple files that will be hostet as static assets by express.
- `/templates` Contains the templates to convert the wattpad stories to the specific formats.
- `/views` Contains Pug template files that will be rendered by express.

## API Endpoints
**Important:** Do not use this automated! The endpoint have a high response time because the backend have to fetch all data and texts from the wattpad books.

### `/api/:id/download/:format`
**Params:**
- `id` The id of a wattpad story
- `format` The format for a download *epub|html*

**Querystring:**
- `token` A user response from ReCaptcha

**Returns:**
- `.epub` file download (Content-disposition: attachment)
- `.html` file download (Content-disposition: attachment)
- `{ "error": "book_not_found" }`

## File formats for story conversion

### EPUB
EPUB is an e-book file format that uses the ". epub" file extension.
The term is short for electronic publication and is sometimes styled ePub.
EPUB is supported by many e-readers, and compatible software is available for most smartphones, tablets, and computers.

### HTML
The HTML file features an entire reader including the story (so people can read it offline).

## Main developers
- [Feuerhamster](https://github.com/Feuerhamster)
- [BluemediaGER](https://github.com/BluemediaGER)

*We are not associated with Wattpad Corp. in any way.*
