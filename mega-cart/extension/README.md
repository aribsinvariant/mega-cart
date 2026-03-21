# Damians instructions on how to install and use the extension
## Chrome
Docker compose up --build, then go to chrome://extensions/ . In the top right corner turn on 'Developer mode', then in the top left click 'Load unpacked'. Navigate to the extension within the mega-cart folder, then inside select the 'dist' folder. Then you should see the extension added to your chrome and you can click on it to start adding items after logging in.
## Other browsers
If you are using any other chromium based browser then the steps should be similar but with however you add extensions to that browser. This extension does not work with safari or other non-chromium based browsers, except firefox.

## Notes
If you change anything about the extension then you just need to docker compose again, you don't need to re-add it to the extensions.