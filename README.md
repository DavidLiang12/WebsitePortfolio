# WebsitePortfolio

Achievements live at `achievements.html` and run at viewport widths of 641px and up, including touch tablets. Opening a real project detail page earns “First spin” and reveals the collection link beside the logo. Phone-sized visits do not read or write achievement progress.

`js/achievement-state.js` defines eleven achievements, sixteen projects (six Games, three Other Projects, two 3D projects and five 2D project windows), and seven main pages. Existing visits survive in the `portfolio-exploration-achievements-v1` localStorage key. State also records main-page visits, completed page/project bottoms, and the Ollie/Paint actions. Notifications respect mute and wait until the desktop startup finishes.

The achievements and 2D art startups each run once per tab session. Separate sessionStorage flags survive navigation and reloads, so opening a fresh tab plays them again without resetting achievements. Achievement startup leaves the main navbar visible and usable; finishing restores focus to the scene rather than highlighting the All filter.

The achievement page preloads its own provided retro UI click and Roland startup clips from `Sound/achievement-click.mp3` and `Sound/achievement-startup.mp3`. Both use the existing mute preference. The startup chime can finish over the scene; skipping, muting, or leaving stops it, and a browser-blocked attempt is only retried during the visible startup.

The 2D project windows are Quick Sketches, Pixel Art, Rat Character, Magic Redesign and Endless Spring. Ollie and Paint have separate bonuses; Paint requires a nonblank drawing and a successful PNG export. `End of the line` covers all 23 main-page/project surfaces. Short pages count when fully visible, while long detail pages and the Endless Spring notes must be scrolled to the bottom. Tracking is local and disabled at phone widths.

Unlocked/locked filters are local to the collection page. Locked descriptions and percentages stay hidden. Visitor percentages are fixed presentation values, not shared analytics; no server or personal visitor identity is involved.

Run the interaction and state checks with `node --test tests/*.test.cjs`.
