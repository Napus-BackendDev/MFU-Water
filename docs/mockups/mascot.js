// Vector redraw of the MFU mole mascot (v2: closer to reference — wide head, 3/4 face, pear body, pointed claws)
const G = '#A5A2A5', GD = '#8E8A8F', GA = '#999599', P = '#F9C6B1', R = '#EE4B3E', SH = '#F04E37', Y = '#F4D03F', W = '#FFFFFF';
const arm = d => `<path d="${d}" stroke="${GA}" stroke-width="21" stroke-linecap="round" fill="none"/>`;
// three pointed claws; (x,y) = wrist, rot = direction in degrees (0 = up)
const claws = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-9 -4 L-13 -22 L-4 -9 Z M0 -6 L0 -26 L5 -8 Z M9 -4 L14 -21 L5 -9 Z" fill="${GA}" stroke="${GA}" stroke-width="5" stroke-linejoin="round"/></g>`;

function face(look = 'c', mood = 'smile') {
  const ex = look === 'up' ? -3 : 0, ey = look === 'up' ? -4 : 0;
  const mouth = mood === 'smile' ? `<path d="M174 140 Q183 154 192 148 Q201 154 210 140" stroke="#E85D4A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="186" y="147" width="12" height="15" rx="3.5" fill="${W}" stroke="#E8C2B2"/>`
    : mood === 'open' ? `<path d="M170 140 Q192 168 214 140 Z" fill="#B5352A"/><rect x="186" y="140" width="12" height="11" rx="3" fill="${W}"/>`
    : mood === 'worry' ? `<path d="M172 152 Q192 138 212 152" stroke="#E85D4A" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M174 148 L210 148" stroke="#E85D4A" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<ellipse cx="192" cy="130" rx="52" ry="38" fill="${P}" transform="rotate(-5 192 130)"/>
  <g class="blink" style="transform-origin:180px 98px"><circle cx="150" cy="${98 + ey}" r="7.5" fill="#111"/><circle cx="234" cy="${94 + ey}" r="7.5" fill="#111"/>
  <circle cx="${147.5 + ex}" cy="${95 + ey}" r="2.6" fill="${W}"/><circle cx="${231.5 + ex}" cy="${91 + ey}" r="2.6" fill="${W}"/></g>
  <path d="M192 130 C170 118 177 100 192 107 C207 100 214 118 192 130 Z" fill="${R}"/>${mouth}`;
}
function body() {
  return `<path d="M98 150 C58 200 58 292 98 318 L224 318 C266 292 266 200 232 150 Z" fill="${G}"/>
  <path d="M232 150 C266 200 266 292 224 318 L200 318 C236 292 238 205 214 150 Z" fill="${GD}" opacity=".3"/>
  <ellipse cx="166" cy="98" rx="94" ry="64" fill="${G}" transform="rotate(-6 166 98)"/>
  <path d="M232 52 C268 76 262 128 226 150 C242 118 240 84 214 56 Z" fill="${GD}" opacity=".3"/>
  <g stroke="${W}" stroke-width="4.5" stroke-linecap="round"><path d="M112 82 L115 70"/><path d="M124 72 L129 54"/><path d="M138 66 L144 44"/><path d="M152 64 L157 42"/><path d="M166 66 L170 50"/></g>
  <g transform="translate(104 236) scale(.9)"><circle cx="0" cy="-8" r="7" fill="${Y}"/><circle cx="-8" cy="6" r="7" fill="${Y}"/><circle cx="8" cy="6" r="7" fill="${Y}"/><circle cx="0" cy="1" r="3" fill="#D9A900"/></g>`;
}
// legs + pointed red shoes (toes outward)
const feet = (lift = false) => `<path d="M104 308 L104 322 L156 322 L156 308 Z" fill="${GD}"/><path d="M168 308 L168 322 L220 322 L220 308 Z" fill="${GD}"/>
  <path d="M56 334 Q60 316 110 318 L152 322 Q156 336 130 338 Q84 342 56 334 Z" fill="${SH}"/>
  <path d="M268 334 Q264 316 214 318 L172 322 Q168 336 194 338 Q240 342 268 334 Z" fill="${SH}"${lift ? ' transform="translate(0 -8)"' : ''}/>`;
const tail = `<path d="M252 288 Q292 284 306 252" stroke="${GA}" stroke-width="7" stroke-linecap="round" fill="none"/>`;

const STYLE = `<style>
.bob{animation:bob .9s ease-in-out infinite}@keyframes bob{50%{transform:translateY(-14px)}}
.wave{animation:wave .6s ease-in-out infinite alternate;transform-origin:104px 196px}@keyframes wave{to{transform:rotate(-16deg)}}
.wave2{animation:wave2 .6s ease-in-out infinite alternate;transform-origin:226px 196px}@keyframes wave2{to{transform:rotate(16deg)}}
.blink{animation:blink 3s infinite}@keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
.flip{animation:flip 2.4s ease-in-out infinite;transform-origin:center;transform-box:fill-box}@keyframes flip{0%,40%{transform:rotate(0)}60%,100%{transform:rotate(180deg)}}
.orb{animation:orb 2.4s linear infinite;transform-origin:166px 190px}@keyframes orb{to{transform:rotate(360deg)}}
.d1,.d2,.d3{animation:dots 1.2s infinite}.d2{animation-delay:.2s}.d3{animation-delay:.4s}@keyframes dots{0%,60%,100%{opacity:.25}30%{opacity:1}}
.flash{animation:flash 1.4s infinite;transform-origin:center;transform-box:fill-box}@keyframes flash{0%,70%,100%{opacity:0;transform:scale(.4)}80%{opacity:1;transform:scale(1.1)}}
.pop{animation:pop 1s ease-out infinite;transform-origin:center;transform-box:fill-box}@keyframes pop{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
.tilt{animation:tilt 1.6s ease-in-out infinite;transform-origin:166px 318px}@keyframes tilt{50%{transform:rotate(3deg)}}
.sweat{animation:sweat 1.4s ease-in infinite}@keyframes sweat{0%{transform:translateY(-6px);opacity:0}30%{opacity:1}100%{transform:translateY(16px);opacity:0}}
.shake{animation:shake .5s ease-in-out infinite alternate;transform-origin:166px 318px}@keyframes shake{to{transform:rotate(-2.5deg)}}
</style>`;
const drop = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -12 C8 0 10 4 10 8 A10 10 0 0 1 -10 8 C-10 4 -8 0 0 -12Z" fill="#38BDF8"/>`;

const POSES = {
  loading: () => `<g class="bob">${tail}${feet()}${body()}${face('c', 'smile')}
    <g class="wave">${arm('M104 198 Q64 190 50 142')}${claws(50, 146, -8)}</g>
    <g class="wave2">${arm('M226 198 Q266 190 278 142')}${claws(278, 146, 8)}</g></g>
    <g class="orb">${drop(46, 190, 0.9)}${drop(286, 190, 0.9)}${drop(166, 14, 0.9)}</g>`,
  waiting: () => `<g class="tilt">${tail}${feet()}${body()}${face('up', 'worry')}
    ${arm('M104 202 Q72 238 84 280')}${claws(84, 282, 172)}
    ${arm('M226 202 Q252 178 206 160')}${claws(200, 158, -70)}</g>
    <g><rect x="236" y="14" width="78" height="46" rx="23" fill="${W}" stroke="#CBD5E1" stroke-width="2"/><g fill="#64748B"><circle class="d1" cx="260" cy="37" r="6"/><circle class="d2" cx="275" cy="37" r="6"/><circle class="d3" cx="290" cy="37" r="6"/></g><path d="M244 60 L236 72 L252 64Z" fill="${W}" stroke="#CBD5E1" stroke-width="2"/></g>
    <g class="flip" transform="translate(18 30)"><path d="M0 0 H34 M0 56 H34 M4 0 C4 24 30 26 30 28 C30 30 4 32 4 56 M30 0 C30 24 4 26 4 28" stroke="#0284C7" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M12 48 H22 L17 38Z" fill="#F4D03F"/></g>`,
  camera: () => `<g class="bob" style="animation-duration:1.8s">${tail}${feet()}${body()}${face('c', 'smile')}
    ${arm('M104 204 Q84 244 142 250')}
    ${arm('M226 204 Q262 240 214 252')}
    <g transform="translate(146 224)"><rect width="70" height="46" rx="10" fill="#2B2B2E"/><circle cx="35" cy="25" r="15" fill="#C9CDD3"/><circle cx="35" cy="25" r="8.5" fill="#5B6270"/><rect x="8" y="-7" width="20" height="10" rx="3" fill="#2B2B2E"/></g>
    <g class="flash"><path d="M120 206 l6 -22 l6 22 l22 6 l-22 6 l-6 22 l-6 -22 l-22 -6z" fill="#FDE047"/></g></g>`,
  cheer: () => `<g class="bob" style="animation-duration:.7s">${tail}${feet()}${body()}${face('c', 'open')}
    <g class="wave">${arm('M104 198 Q60 176 62 122')}${claws(62, 126, -5)}</g>
    <g class="wave2">${arm('M226 198 Q270 176 268 122')}${claws(268, 126, 5)}</g></g>
    <g class="pop"><circle cx="286" cy="52" r="26" fill="#16A34A"/><path d="M273 52 l9 10 l18 -20" stroke="${W}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  error: () => `<g class="shake">${tail}${feet()}${body()}${face('c', 'worry')}
    ${arm('M104 204 Q60 218 50 252')}${claws(50, 256, 160)}
    ${arm('M226 204 Q270 218 280 252')}${claws(280, 256, 200)}
    <g class="sweat">${drop(262, 78, 0.8)}</g></g>
    <text x="270" y="62" font-size="60" font-weight="800" fill="#EA7A0B" font-family="Noto Sans Thai,Inter,sans-serif">?</text>`,
};
const svg = (pose, w = 320) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" width="${w}" height="${Math.round(w * 360 / 320)}">${STYLE}${POSES[pose]()}</svg>`;
module.exports = { svg, POSES };
