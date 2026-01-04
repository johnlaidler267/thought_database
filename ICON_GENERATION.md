# Icon Generation

The PWA requires icon files in PNG format. You can generate these from the provided SVG:

1. Use an online tool like [CloudConvert](https://cloudconvert.com/svg-to-png) or [Convertio](https://convertio.co/svg-png/)
2. Or use ImageMagick: `convert icon.svg -resize 192x192 icon-192.png`
3. Create both 192x192 and 512x512 versions
4. Place them in the `public/` directory

Alternatively, you can use any image editor to create simple icons with a "T" or your preferred design.

