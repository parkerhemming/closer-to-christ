# Graph Report - closer-to-christ  (2026-10-10)

## Corpus Check
- 2 files · ~234,998 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 87 nodes · 166 edges · 10 communities (7 shown, 3 thin omitted)
- Extraction: 61% EXTRACTED · 33% INFERRED · 5% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.86)
- Token cost: 60,280 input · 0 output

## Community Hubs (Navigation)
- City Light Masks
- Calvary Scene & Page Layout
- Storm & Lightning
- Motion Parallax
- Starfield & Bootstrap
- Randomized Schedulers
- Cloud & Rain Todos
- Moon (Todo)
- Texture Overlay Idea
- Taller Ground (Todo)

## God Nodes (most connected - your core abstractions)
1. `createCityLights()` - 24 edges
2. `parallax()` - 17 edges
3. `createStorm()` - 14 edges
4. `randomBetween()` - 12 edges
5. `Closer To Christ Page` - 10 edges
6. `CSS .city-light mask classes (styles.css)` - 9 edges
7. `data-z_index Depth Attribute` - 8 edges
8. `Home Window Light Mask 1` - 8 edges
9. `City Light Mask Layer (4096x2048 alpha masks tinted via CSS mask-image, screen blend)` - 8 edges
10. `handleOrientation()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Mobile Home Lights Mask 1` --conceptually_related_to--> `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-1.webp → app.js
- `Mobile Home Lights Mask 2` --conceptually_related_to--> `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-2.webp → app.js
- `Mobile Home Lights Mask 5` --conceptually_related_to--> `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-5.webp → app.js
- `Mobile Architecture Light Mask` --conceptually_related_to--> `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/architecture.webp → app.js
- `Mobile Common Lantern Mask` --conceptually_related_to--> `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/lantern-common.webp → app.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layered city lighting overlay (architecture + homes + lanterns)** — assets_city_lights_architecture_sprite, assets_city_lights_home_1_sprite, assets_city_lights_home_2_sprite, assets_city_lights_home_3_sprite, assets_city_lights_home_4_sprite, assets_city_lights_home_5_sprite, assets_city_lights_lantern_common_sprite, assets_city_lights_lantern_variant_sprite [EXTRACTED 1.00]
- **Mobile City Light Mask Set (CSS media-query swap)** — assets_mobile_city_lights_architecture_sprite, assets_mobile_city_lights_home_1_sprite, assets_mobile_city_lights_home_2_sprite, assets_mobile_city_lights_home_3_sprite, assets_mobile_city_lights_home_4_sprite, assets_mobile_city_lights_home_5_sprite, assets_mobile_city_lights_lantern_common_sprite, assets_mobile_city_lights_lantern_variant_sprite [EXTRACTED 1.00]
- **Parallax Depth-Layered Scene** — app_parallax, index_data_z_index, index_sky, index_storm_clouds, index_distant_hills, index_distant_jerusalem, index_golgotha_ridge, index_ground, index_christ [EXTRACTED 1.00]
- **Home window light mask set** — assets_city_lights_home_1_sprite, assets_city_lights_home_2_sprite, assets_city_lights_home_3_sprite, assets_city_lights_home_4_sprite, assets_city_lights_home_5_sprite [INFERRED 0.95]
- **Storm Composition (clouds, lightning, rain, tone)** — index_storm, index_storm_clouds, index_lightning_layers, index_rain_layers, index_storm_tone, app_createstorm [INFERRED 0.95]
- **Star Features** — todo_shooting_stars, todo_twinkle_stars, todo_star_brightness, todo_outer_glow [EXTRACTED 1.00]
- **Cloud Features** — todo_cloud_texture, todo_cloud_movement, todo_overcast_vs_clear [EXTRACTED 1.00]
- **Misc Sky Features** — todo_rain, todo_moon, todo_parallax, todo_taller_ground [EXTRACTED 1.00]

## Communities (10 total, 3 thin omitted)

### Community 0 - "City Light Masks"
Cohesion: 0.24
Nodes (20): createCityLights(), Architecture Light Mask (dim building windows/outlines), Home Window Light Mask 1, Home Window Light Mask 2, Home Window Light Mask 3, Home Window Light Mask 4, Home Window Light Mask 5, Common Street Lantern Light Mask (dotted row of lantern points) (+12 more)

### Community 1 - "Calvary Scene & Page Layout"
Cohesion: 0.18
Nodes (14): Christ Wind Crucifixion Animation (GIF, 57 frames @120ms), Crucifixion of Jesus Christ, INRI Titulus (Jesus Nazarenus Rex Iudaeorum), #christ Wind GIF, City Flicker Plane, City Light Spans (architecture/home/lantern), Distant Hills Scenery, Distant Jerusalem Scenery (+6 more)

### Community 2 - "Storm & Lightning"
Cohesion: 0.24
Nodes (14): createStorm(), appendLightningPath(), clampLightningX(), createBoltPath(), createCloudFlash(), createLightningBolt(), pointsToPath(), scheduleLightning() (+6 more)

### Community 3 - "Motion Parallax"
Cohesion: 0.32
Nodes (13): parallax(), animateParallax(), clamp(), dotProduct(), getRotationMatrix(), handleOrientation(), moveLayers(), moveToward() (+5 more)

### Community 4 - "Starfield & Bootstrap"
Cohesion: 0.24
Nodes (9): createShootingStars(), launchShootingStar(), scheduleShootingStar(), createStars(), Inline Bootstrap Script, Star Outer Glow, Shooting Stars (nvm), Star Brightness Differences (+1 more)

### Community 5 - "Randomized Schedulers"
Cohesion: 0.43
Nodes (8): scheduleNextBurst(), selectNextLight(), startBurst(), pulse(), startRainEmitter(), createRainDrop(), scheduleDrop(), randomBetween()

### Community 6 - "Cloud & Rain Todos"
Cohesion: 0.50
Nodes (4): Cloud Movement, Cloud Texture, Overcast v. Clear Skies (nvm), Rain

## Ambiguous Edges - Review These
- `Shooting Stars (nvm)` → `createShootingStars()`  [AMBIGUOUS]
  todo.md · relation: implements
- `Mobile Home Lights Mask 1` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-1.webp · relation: conceptually_related_to
- `Mobile Home Lights Mask 2` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-2.webp · relation: conceptually_related_to
- `Mobile Home Lights Mask 5` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-5.webp · relation: conceptually_related_to
- `Mobile Architecture Light Mask` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/architecture.webp · relation: conceptually_related_to
- `Mobile Common Lantern Mask` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/lantern-common.webp · relation: conceptually_related_to
- `Mobile Variant Lantern Mask` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/lantern-variant.webp · relation: conceptually_related_to
- `Mobile Home Lights Mask 3` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-3.webp · relation: conceptually_related_to
- `Mobile Home Lights Mask 4` → `createCityLights()`  [AMBIGUOUS]
  assets/mobile/city-lights/home-4.webp · relation: conceptually_related_to

## Knowledge Gaps
- **14 isolated node(s):** `Crucifixion of Jesus Christ`, `INRI Titulus (Jesus Nazarenus Rex Iudaeorum)`, `Cloud Movement`, `Bug: Zooming Breaks Mobile (done)`, `Make Ground Taller` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 14 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Shooting Stars (nvm)` and `createShootingStars()`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **Why does `createCityLights()` connect `City Light Masks` to `Calvary Scene & Page Layout`, `Starfield & Bootstrap`, `Randomized Schedulers`?**
  _High betweenness centrality (0.416) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `createCityLights()` (e.g. with `City Flicker Plane` and `City Light Spans (architecture/home/lantern)`) actually correct?**
  _`createCityLights()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Crucifixion of Jesus Christ`, `INRI Titulus (Jesus Nazarenus Rex Iudaeorum)`, `Cloud Movement` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **What is the exact relationship between `Mobile Home Lights Mask 1` and `createCityLights()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `parallax()` connect `Motion Parallax` to `Calvary Scene & Page Layout`, `Starfield & Bootstrap`?**
  _High betweenness centrality (0.307) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `parallax()` (e.g. with `#christ Wind GIF` and `data-z_index Depth Attribute`) actually correct?**
  _`parallax()` has 4 INFERRED edges - model-reasoned connections that need verification._