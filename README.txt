Parts Manager - Ready to upload to GitHub Pages
Files included:
- index.html
- script.js
- part.json (your data)
- README.txt (this file)

How to upload:
1. Create a new GitHub repository (public).
2. Upload all files (Add file → Upload files) to the repository root.
3. Commit changes.
4. Go to Settings → Pages and set source to:
   - Branch: main
   - Folder: / (root)
5. Save. Your site will be available at:
   https://<yourusername>.github.io/<repo-name>/

Default admin login:
- username: admin
- password: admin123
(Change the password after first login using "Change Admin Password" in Admin Controls.)

Export:
- When logged in as admin you can click "Export JSON" to download current data as part_export.json.

Notes:
- The app stores data in browser localStorage. It uses part.json only on first load (if localStorage empty), then saves to localStorage.
- This is a static, client-side app. Do NOT use this for sensitive/private data.
