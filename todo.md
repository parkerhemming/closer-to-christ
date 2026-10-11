# Bugs

- [x] Zooming breaks everything on mobile
- [x] Layers disappear after switching tabs (too much GPU memory)
- [x] Page crashes / lags on older phones (quality levels)
- [x] Bright lines across the city lights

# Sky

<br>

### Stars

- [x] Shooting Stars
- [x] Twinkle Stars
- [x] Star Brightness Differences
- [x] Outer Glow

### Clouds

- [x] Cloud Texture
- [x] Movement
- [nvm] Overcast v. Clear Skies

### Misc

- [x] Rain
- [?] Moon
- [x] Parallax
- [] Make ground taller!

# Loading & Performance

- [x] Loading screen (cross spinner, progress, D&C 88:63), shown at least 4 seconds
- [x] Images cached on the device so they only download once
- [x] Automatic quality (connection test before loading, frame rate check)
- [x] Smaller memory use (cropped city-light masks, smaller cloud layers)
- [x] Safari stutter fixed (small shadow masks, cheaper star/lightning glows); measured 58-60fps

# Settings

- [x] Gear button and Scene Settings panel (drops from the gear without hiding the time or caption)
- [x] Parallax on/off and smoothness (one small bounce on fast flicks)
- [x] Render details at the bottom of the panel
- [x] Phone motion prompt: Enable motion / Not now
- [x] Favicon

# Weather

- [x] `weatherIntensity` setting: 0 = clear sky, 1 = full storm (today's storm = 0.7)
- [x] Rain amount and wind slant follow the weather
- [x] Lightning only in stormy weather, more often in heavier storms
- [x] Clouds thin out and brighten in clear weather, thicken and darken in storms
- [x] Wind speed sets how fast the clouds drift
- [x] Weather slider in Scene Settings
- [x] Default weather is random: stormier when it's dark, calmer during the day

# Time of Day

- [x] Light levels from night to full day (the clock's hour picks the level)
- [x] Sky colors from night to sunrise (on the left horizon) to day
- [x] Stars and city lights fade out as it gets light
- [x] Every layer's lighting and color follows the time of day
- [x] Mountain shadows at sunrise that shift with the parallax
- [x] Time of day slider in Scene Settings
- [x] Time of day runs 6 AM to 3 PM (the day of the Crucifixion), starting at 6 AM; darkness from noon
- [x] Time in the top-left; caption at the bottom with < > to step between events and ^ to open the list of them all
- [x] Clock runs on its own (1 minute of the day per second), weather follows the hour

# Ground

- [x] Redo the two closest ground layers: higher quality, with plants and grass properly cut out
- [] Animate those plants and grass in the wind, following the weather intensity setting

# Christ Figure

- [x] New realistic figure (palm and wrist nails, hanging loincloth end)
- [] Replace the GIF with the new figure
- [] Hair and loincloth move with the wind (follows the weather setting)
- [] Breathing

# Tooltips

- [] Clickable circle markers on the cross and the scene
- [] Popups with LDS teaching and scripture (Book of Mormon, D&C, Pearl of Great Price first, then the Bible)
- [] Topics: palm and wrist nails, crown of thorns, side wound, INRI sign, Golgotha, Jerusalem, the darkness, "Father, forgive them"

<br>
<br>

# Notes

Overlay like a pixel over lay to make it all look like pixels? Painting texture overlay? Something to consider!
