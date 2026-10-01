(() => {
  const variant = new URLSearchParams(location.search).get('color');
  const names = {'bg-rails':'01 / Cassette edge stripes','bg-orbits':'02 / Record-store wallpaper','bg-field':'03 / Sage title field',spines:'01 / Colored spines',labels:'02 / Label panels',halos:'03 / Record halos',sleeves:'04 / Printed sleeves',night:'05 / After-hours listening',bands:'06 / Stereo color bands'};
  if (!Object.hasOwn(names,variant)) return;
  document.body.dataset.gamesColor = variant;
  const note = document.createElement('div');
  note.className = 'color-study-note';
  const label = document.createElement('span'); label.textContent = names[variant];
  const link = document.createElement('a'); link.href = 'design-options.html#color'; link.textContent = 'Compare backgrounds';
  note.append(label,link); document.body.prepend(note);
})();
