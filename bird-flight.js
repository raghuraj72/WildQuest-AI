/* WildQuest AI — colorful bird flocks, drifting clouds and interactive weather. */
(() => {
  const canvas = document.getElementById('birdFlightCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weatherButton = document.getElementById('weatherButton');
  const weatherModes = [
    { id: 'sunny', label: 'Sunny', icon: '☀', rain: 0, cloudAlpha: 0.20 },
    { id: 'cloudy', label: 'Cloudy', icon: '☁', rain: 0, cloudAlpha: 0.53 },
    { id: 'rainy', label: 'Rainy', icon: '🌧', rain: 150, cloudAlpha: 0.76 }
  ];
  let weatherIndex = 0;
  let width = 0, height = 0, dpr = 1, raf = 0, lastTime = 0;
  const flock = [];
  const clouds = [];
  const drops = [];
  const rand = (min, max) => min + Math.random() * (max - min);
  const birdColors = [
    { body: '#ffd166', wing: '#ff9f1c', light: '#fff1a8', edge: '#a94f18' },
    { body: '#71e6c1', wing: '#1fbf9f', light: '#d6fff0', edge: '#087b72' },
    { body: '#ff8fab', wing: '#e94f86', light: '#ffd5e1', edge: '#8d285b' },
    { body: '#8db8ff', wing: '#4977f5', light: '#d9e7ff', edge: '#243d9b' },
    { body: '#d9a7ff', wing: '#9a5de0', light: '#f0dcff', edge: '#6236a2' },
    { body: '#ffbd69', wing: '#ff6b35', light: '#fff0c2', edge: '#9e3b22' }
  ];

  function makeBird(index, initial = false) {
    const depth = rand(.62, 1.48);
    const leader = index % 7 === 0;
    const color = birdColors[Math.floor(Math.random() * birdColors.length)];
    return {
      x: initial ? rand(-80, Math.max(100, width + 80)) : -rand(25, 100),
      y: rand(height * .06, height * .62), depth,
      speed: rand(24, 52) * depth * (leader ? 1.08 : 1),
      phase: rand(0, Math.PI * 2), flap: rand(5.0, 7.2),
      size: rand(15, 25) * depth * (leader ? 1.22 : 1),
      drift: rand(8, 24), direction: Math.random() > .09 ? 1 : -1,
      color, leader, tailWave: rand(0, Math.PI * 2),
      group: Math.floor(index / 4), offset: rand(-1, 1)
    };
  }
  function makeCloud(initial = false) {
    const scale = rand(.72, 1.7);
    return { x: initial ? rand(-180, width + 180) : -rand(180, 340),
      y: rand(height * .035, height * .32), scale, speed: rand(5, 13) / scale,
      alpha: rand(.48, .83), shape: Math.floor(rand(0, 3)) };
  }
  function makeDrop(initial = false) {
    return { x: rand(0, width), y: initial ? rand(0, height) : rand(-height * .5, -10),
      length: rand(9, 21), speed: rand(360, 680), drift: rand(-80, -22), alpha: rand(.15, .42) };
  }

  const count = Math.min(23, Math.max(13, Math.round(window.innerWidth / 68)));
  for (let i = 0; i < count; i++) flock.push(makeBird(i, true));
  for (let i = 0; i < 7; i++) clouds.push(makeCloud(true));
  for (let i = 0; i < 150; i++) drops.push(makeDrop(true));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clouds.forEach(c => { c.y = Math.min(c.y, height * .34); });
  }

  function drawCloud(cloud, time) {
    const x = cloud.x, y = cloud.y + Math.sin(time * .17 + cloud.x * .004) * 5;
    const s = cloud.scale;
    const mode = weatherModes[weatherIndex];
    ctx.save();
    ctx.globalAlpha = cloud.alpha * mode.cloudAlpha;
    const gradient = ctx.createLinearGradient(x, y - 35 * s, x, y + 24 * s);
    if (weatherIndex === 2) {
      gradient.addColorStop(0, '#dce8f4'); gradient.addColorStop(1, '#8298ad');
    } else {
      gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#b8d9d2');
    }
    ctx.fillStyle = gradient;
    ctx.shadowColor = weatherIndex === 0 ? 'rgba(255,235,180,.25)' : 'rgba(15,35,52,.15)';
    ctx.shadowBlur = 18 * s;
    ctx.beginPath();
    ctx.ellipse(x, y, 42*s, 16*s, 0, 0, Math.PI*2);
    ctx.ellipse(x-26*s, y+1*s, 24*s, 13*s, 0, 0, Math.PI*2);
    ctx.ellipse(x-10*s, y-13*s, 22*s, 22*s, 0, 0, Math.PI*2);
    ctx.ellipse(x+13*s, y-19*s, 27*s, 27*s, 0, 0, Math.PI*2);
    ctx.ellipse(x+35*s, y-5*s, 25*s, 18*s, 0, 0, Math.PI*2);
    ctx.fill();
    // Soft underside gives the cloud volume instead of a flat icon look.
    ctx.shadowBlur = 0;
    ctx.globalAlpha *= .28;
    ctx.fillStyle = weatherIndex === 2 ? '#4c6178' : '#82b9b0';
    ctx.beginPath(); ctx.ellipse(x+12*s, y+6*s, 36*s, 7*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBird(bird, time) {
    const flap = Math.sin(time * bird.flap + bird.phase);
    const s = bird.size;
    const span = s * (1.16 + Math.abs(flap) * .48);
    const lift = flap * s * .76;
    const c = bird.color;
    ctx.save();
    ctx.translate(bird.x, bird.y + Math.sin(time * .75 + bird.phase) * bird.drift * .25);
    ctx.scale(bird.direction * bird.depth, bird.depth);
    ctx.globalAlpha = .86;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = c.light; ctx.shadowBlur = 7 * bird.depth;

    // Tail feathers
    ctx.fillStyle = c.edge;
    ctx.beginPath(); ctx.moveTo(-s*.35, 1); ctx.lineTo(-s*.95, -s*.12); ctx.lineTo(-s*.78, s*.22); ctx.lineTo(-s*.32, s*.12); ctx.fill();
    // Rounded body with a colored back and pale belly
    const bodyGrad = ctx.createLinearGradient(-s*.2, -s*.4, s*.3, s*.4);
    bodyGrad.addColorStop(0, c.light); bodyGrad.addColorStop(.42, c.body); bodyGrad.addColorStop(1, c.wing);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.moveTo(-s*.48, 0); ctx.quadraticCurveTo(-s*.05, -s*.36, s*.42, -s*.02);
    ctx.quadraticCurveTo(s*.05, s*.31, -s*.48, 0); ctx.fill();
    // Head and beak
    ctx.fillStyle = c.body; ctx.beginPath(); ctx.arc(s*.35, -s*.13, s*.19, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffe3a1'; ctx.beginPath(); ctx.moveTo(s*.49, -s*.17); ctx.lineTo(s*.75, -s*.1); ctx.lineTo(s*.49, -s*.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#14251f'; ctx.beginPath(); ctx.arc(s*.39, -s*.17, Math.max(1.15, s*.035), 0, Math.PI*2); ctx.fill();

    // Wings have a filled silhouette, layered feathers and a bright leading edge.
    const wingY = -lift - s*.18;
    ctx.fillStyle = c.wing;
    ctx.beginPath(); ctx.moveTo(-s*.05, -s*.02);
    ctx.quadraticCurveTo(-span*.25, wingY*.35-s*.12, -span, wingY-s*.23);
    ctx.quadraticCurveTo(-span*.7, wingY+s*.42, -s*.18, s*.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s*.04, -s*.01);
    ctx.quadraticCurveTo(span*.35, wingY*.35-s*.12, span*.82, wingY-s*.12);
    ctx.quadraticCurveTo(span*.58, wingY+s*.38, s*.2, s*.12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.light; ctx.globalAlpha = .72; ctx.lineWidth = Math.max(1, s*.055);
    for (let feather = 0; feather < 3; feather++) {
      ctx.beginPath();
      ctx.moveTo(-s*.08, s*.02);
      ctx.quadraticCurveTo(-span*(.36+feather*.12), wingY*(.5+feather*.07), -span*(.83+feather*.04), wingY-s*(.14-feather*.035));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*.08, s*.02);
      ctx.quadraticCurveTo(span*(.31+feather*.11), wingY*(.5+feather*.07), span*(.68+feather*.05), wingY-s*(.08-feather*.035));
      ctx.stroke();
    }
    // Tiny shoulder highlight makes the birds read as colorful, dimensional creatures.
    ctx.globalAlpha = .75; ctx.strokeStyle = c.light; ctx.lineWidth = Math.max(1, s*.07);
    ctx.beginPath(); ctx.moveTo(-s*.13, -s*.1); ctx.quadraticCurveTo(s*.05, -s*.27, s*.22, -s*.13); ctx.stroke();
    ctx.restore();
  }

  function drawRain(dt) {
    if (weatherIndex !== 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(181,220,255,.72)'; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
    drops.forEach(drop => {
      ctx.globalAlpha = drop.alpha;
      ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x + drop.drift*.035, drop.y + drop.length); ctx.stroke();
      drop.x += drop.drift * dt; drop.y += drop.speed * dt;
      if (drop.y > height + 30 || drop.x < -20) Object.assign(drop, makeDrop(false), { x: rand(0, width) });
    });
    ctx.restore();
    // Rain haze softly cools the scene while leaving the controls fully clickable.
    const haze = ctx.createLinearGradient(0, 0, 0, height);
    haze.addColorStop(0, 'rgba(76,113,146,.12)'); haze.addColorStop(1, 'rgba(39,75,102,.045)');
    ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height);
  }

  function updateWeatherButton() {
    if (!weatherButton) return;
    const mode = weatherModes[weatherIndex];
    weatherButton.innerHTML = `${mode.icon} <span>${mode.label}</span>`;
    weatherButton.setAttribute('aria-label', `Weather effects: ${mode.label}. Click to change weather`);
    weatherButton.title = `Weather: ${mode.label} — click to cycle`;
    weatherButton.dataset.weather = mode.id;
    document.body.dataset.weather = mode.id;
  }
  if (weatherButton) weatherButton.addEventListener('click', () => {
    weatherIndex = (weatherIndex + 1) % weatherModes.length;
    updateWeatherButton();
  });

  function animate(timestamp) {
    raf = requestAnimationFrame(animate);
    if (document.hidden || reduceMotion) return;
    const time = timestamp / 1000;
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, .04);
    lastTime = timestamp;
    ctx.clearRect(0, 0, width, height);

    clouds.forEach(cloud => {
      cloud.x += cloud.speed * dt;
      if (cloud.x > width + 220*cloud.scale) Object.assign(cloud, makeCloud(false), { x: -160*cloud.scale });
      drawCloud(cloud, time);
    });
    drawRain(dt);
    flock.forEach((bird, index) => {
      bird.x += bird.speed * dt * bird.direction;
      bird.y += Math.sin(time*.42 + bird.phase) * dt * bird.drift*.32;
      // Birds fly in loose groups: nearby flockmates gently follow the same wave.
      bird.y += Math.sin(time*.65 + bird.group*1.7) * dt * 3;
      if (bird.direction > 0 && bird.x > width + 110) flock[index] = makeBird(index);
      else if (bird.direction < 0 && bird.x < -110) { flock[index] = makeBird(index); flock[index].x = width + 60; }
      drawBird(bird, time);
    });
  }

  resize(); updateWeatherButton();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTime = 0; });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  if (!reduceMotion) animate(0);
})();
