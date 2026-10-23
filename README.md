# Pyro's Gateway (with real channel name and picture)

## 1. Get a free YouTube API key (one time)
1. Go to https://console.cloud.google.com and create a project.
2. Open "APIs & Services" > "Library", search "YouTube Data API v3", press Enable.
3. Open "APIs & Services" > "Credentials" > "Create credentials" > "API key". Copy it.
4. Keep the key secret. Never paste it into the HTML page.

## 2. Run it
Install Node.js 18 or newer from https://nodejs.org, then in this folder:

    Mac/Linux:   YT_API_KEY=your_key node server.js
    Windows PowerShell:   $env:YT_API_KEY="your_key"; node server.js

Open http://localhost:3000, paste a channel link, and the real picture and name appear.

## 3. Put it online so anyone can open it (free, Render.com)
1. Create a free account at https://github.com. Make a new repository and upload all files from this folder (drag and drop works). Do not upload your API key.
2. Create a free account at https://render.com and sign in with GitHub.
3. Press New > Web Service, pick your repository.
4. Set: Runtime = Node, Build Command = `npm install`, Start Command = `npm start`, Instance Type = Free.
5. Open "Environment", add a variable named `YT_API_KEY` with your key as the value.
6. Press Deploy. After a minute you get a public link like `https://pyros-gateway.onrender.com`. Send it to anyone.
7. In Google Cloud > Credentials, open your API key and under "API restrictions" choose only "YouTube Data API v3".

The free plan sleeps after about 15 minutes without visitors. The next visit takes 30 to 60 seconds to wake it.

## Notes
- The free quota is 10,000 units a day. A normal lookup costs 1 unit. `/c/name` links cost 100 (search), then are cached for 6 hours.
- If the backend is not running, the page still works and shows the first letter instead of the picture.
