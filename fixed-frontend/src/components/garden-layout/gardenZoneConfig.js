// ─── Zone type definitions ───────────────────────────────────────────────────

export const ZONE_TYPES = {
    general:    { label: 'General',              emoji: '🌱', color: 'bg-gray-100 border-gray-300 text-gray-800' },
    vegetable:  { label: 'Vegetable Garden',     emoji: '🥕', color: 'bg-orange-50 border-orange-300 text-orange-900' },
    orchard:    { label: 'Orchard',              emoji: '🍎', color: 'bg-red-50 border-red-200 text-red-800' },
    herb:       { label: 'Herb Garden',          emoji: '🌿', color: 'bg-teal-50 border-teal-300 text-teal-900' },
    flower:     { label: 'Flower Bed',           emoji: '🌸', color: 'bg-pink-50 border-pink-200 text-pink-800' },
    forest:     { label: 'Food Forest',          emoji: '🌳', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    greenhouse: { label: 'Greenhouse',           emoji: '🏡', color: 'bg-lime-50 border-lime-300 text-lime-900' },
    raised:     { label: 'Raised Bed Area',      emoji: '🪴', color: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
    guild:      { label: 'Permaculture Guild',   emoji: '🌀', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    compost:    { label: 'Compost Area',         emoji: '♻️', color: 'bg-amber-50 border-amber-300 text-amber-900' },
    pond:       { label: 'Pond / Water',         emoji: '💧', color: 'bg-sky-50 border-sky-200 text-sky-800' },
    kids:       { label: 'Kids Area',            emoji: '🛝', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    seating:    { label: 'Seating / Patio',      emoji: '🪑', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    building:   { label: 'Building / Shed',      emoji: '🏠', color: 'bg-slate-100 border-slate-300 text-slate-800' },
    path:       { label: 'Pathway',              emoji: '🛤️', color: 'bg-stone-50 border-stone-300 text-stone-800' },
};

export function detectZoneType(name = '') {
    const n = name.toLowerCase();
    // Orchard — EN + RO (livadă, pomi)
    if (n.includes('orchard') || n.includes('fruit tree') || n.includes('livad') || n.includes('pomi')) return 'orchard';
    // Greenhouse — EN + RO (seră)
    if (n.includes('greenhouse') || n.includes('glass house') || n.includes('ser')) return 'greenhouse';
    // Food forest / forest garden — check before 'forest' generic
    if (n.includes('food forest') || n.includes('forest garden') || n.includes('edible forest') || n.includes('pădure de alimente')) return 'forest';
    // Vegetable — EN + RO (legume, bucătărie, potager)
    if (n.includes('veg') || n.includes('kitchen garden') || n.includes('potager') || n.includes('legume')) return 'vegetable';
    // Herb / herb garden — EN + RO (ierburi, condimente)
    if (n.includes('herb') || n.includes('spice') || n.includes('ierb') || n.includes('condiment')) return 'herb';
    // Flower — EN + RO (flori, trandafiri)
    if (n.includes('flower') || n.includes('bloom') || n.includes('rose') || n.includes('flori') || n.includes('trandafir')) return 'flower';
    // Forest / woodland — EN + RO (pădure)
    if (n.includes('forest') || n.includes('woodland') || n.includes('pădure')) return 'forest';
    // Berry patch — EN + RO (zmeur, fructe de pădure, coacăz)
    if (n.includes('berry') || n.includes('zmeur') || n.includes('coacăz') || n.includes('fructe de pădure') || n.includes('soft fruit')) return 'orchard';
    // Compost — same word
    if (n.includes('compost')) return 'compost';
    // Swale / water harvesting — before generic pond/water
    if (n.includes('swale') || n.includes('contour') || n.includes('water harvest')) return 'pond';
    // Pond — EN + RO (iaz, apă, lac)
    if (n.includes('pond') || n.includes('water') || n.includes('lake') || n.includes('stream') || n.includes('iaz') || n.includes('apă') || n.includes('lac')) return 'pond';
    // Kids — EN + RO (copii, joacă)
    if (n.includes('kids') || n.includes('play') || n.includes('children') || n.includes('playground') || n.includes('copii') || n.includes('joac')) return 'kids';
    // Path / windbreak — EN + RO (cărare, alee, potecă)
    if (n.includes('path') || n.includes('walk') || n.includes('trail') || n.includes('cărare') || n.includes('alee') || n.includes('potec')) return 'path';
    if (n.includes('windbreak') || n.includes('shelterbelt') || n.includes('shelter belt')) return 'path';
    // Raised bed — EN + RO (strat înălțat)
    if (n.includes('raised') || n.includes('raised bed') || n.includes('strat înăl')) return 'raised';
    // Wild zone / meadow — ecological area
    if (n.includes('wild') || n.includes('meadow') || n.includes('wildlife') || n.includes('biodiversity') || n.includes('native')) return 'flower';
    // Beehive / apiary
    if (n.includes('beehive') || n.includes('bee hive') || n.includes('apiary') || n.includes('hive') || n.includes('albine')) return 'guild';
    // Building — EN + RO (magazie, clădire, depozit)
    if (n.includes('shed') || n.includes('building') || n.includes('house') || n.includes('barn') || n.includes('storage') || n.includes('magazie') || n.includes('clădire') || n.includes('depozit')) return 'building';
    // Guild — EN + RO (breaslă)
    if (n.includes('guild') || n.includes('breasl')) return 'guild';
    // Seating / patio — EN + RO (odihn, patio, terasă)
    if (n.includes('seat') || n.includes('relax') || n.includes('patio') || n.includes('deck') || n.includes('odihn') || n.includes('teras')) return 'seating';
    return 'general';
}

// ─── Structure definitions (reuse existing SVG icons) ─────────────────────────

const compostIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgDQoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxwYXRoIHN0eWxlPSJmaWxsOiM5Q0FDNzQ7IiBkPSJNNDYyLjM1Myw0NzQuMTEyTDQzNS45NjUsNTAuMzExbC0zMy43NTgtMjIuNTA1TDM5Mi45OCw1MTJoMzMuNzU4DQoJQzQ0Ny42MjMsNTEyLDQ2My42NDcsNDk0Ljk1Miw0NjIuMzUzLDQ3NC4xMTJ6Ii8+DQo8cmVjdCB4PSIxMjMuMzg2IiB5PSIzMzkuOTM0IiBzdHlsZT0iZmlsbDojNTk0QjQ0OyIgd2lkdGg9IjIzMS40NjkiIGhlaWdodD0iMTQ5LjU2Ii8+DQo8Zz4NCgk8cmVjdCB4PSIzMzIuMzUiIHk9IjMzOS45MzQiIHN0eWxlPSJmaWxsOiM0RDNEMzY7IiB3aWR0aD0iNTYuMjY0IiBoZWlnaHQ9IjE0OS41NiIvPg0KCTxyZWN0IHg9IjEzNC42MzkiIHk9IjQ4MS4wNTUiIHN0eWxlPSJmaWxsOiM0RDNEMzY7IiB3aWR0aD0iMjQyLjcyMiIgaGVpZ2h0PSIxNi44NzkiLz4NCjwvZz4NCjxwYXRoIHN0eWxlPSJmaWxsOiNCQ0M5ODc7IiBkPSJNNDI4LjU5NSw0NzQuMTEyYzEuMjk0LDIwLjg0LTE0LjczLDM3Ljg4OC0zNS42MTUsMzcuODg4aC0yNi44NzJWMzYyLjQ0SDE0NS44OTJWNTEySDg1LjI1MQ0KCWMtMjAuODc0LDAtMzYuODk4LTE3LjA0OC0zNS42MDQtMzcuODg4TDc2LjAyNCw1MC4zMTFsMTYzLjA5Mi0yNy4wMDdsMTYzLjA5MiwyNy4wMDdMNDI4LjU5NSw0NzQuMTEyeiIvPg0KPHBhdGggc3R5bGU9ImZpbGw6IzU1NTg0MzsiIGQ9Ik00MjkuMjgxLDBoLTMzLjc1OGwxMi42NDgsNTAuMzExaDMzLjc1OFYxMi42NTlDNDQxLjkyOSw1LjY3MSw0MzYuMjY5LDAsNDI5LjI4MSwweiIvPg0KPGc+DQoJPHBhdGggc3R5bGU9ImZpbGw6IzVEN0M0RjsiIGQ9Ik00MDguMTcxLDEyLjY1OXYzNy42NTJMMzk1LjUyMywwQzQwMi41MTEsMCw0MDguMTcxLDUuNjcxLDQwOC4xNzEsMTIuNjU5eiIvPg0KCTxwYXRoIHN0eWxlPSJmaWxsOiM1RDczNEY7IiBkPSJNMzk1LjUyMywwbDEyLjY0OCw1MC4zMTFINzAuMDZWMTIuNjU5QzcwLjA2LDUuNjcxLDc1LjczMSwwLDgyLjcxOSwwSDM5NS41MjN6Ii8+DQo8L2c+DQo8L3N2Zz4=';
const greenhouseIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgDQoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxwb2x5Z29uIHN0eWxlPSJmaWxsOiNDOERCODY7IiBwb2ludHM9IjUwMy44MywxNzIuMzgxIDQzNS42NDcsMTcyLjM4MSAyODMuNjQ4LDU5LjU4OSAzNTEuODMxLDU5LjU4OSAiLz4NCjxwb2x5Z29uIHN0eWxlPSJmaWxsOiNENEVEODU7IiBwb2ludHM9IjMwNS40MzUsNTkuNTg5IDQ1Ny40MzQsMTcyLjM4MSAzMTIuMTc4LDE3Mi4zODEgMTYwLjE2OSw1OS41ODkgIi8+DQo8cmVjdCB4PSIyNDkuNTQiIHk9IjE3Mi4zODEiIHN0eWxlPSJmaWxsOiNGRkU2Qjg7IiB3aWR0aD0iNjIuNjM4IiBoZWlnaHQ9IjI4MC4wMzEiLz4NCjxyZWN0IHg9IjguMTciIHk9IjE3Mi4zODEiIHN0eWxlPSJmaWxsOiNGRkYzREM7IiB3aWR0aD0iMjYzLjE1NyIgaGVpZ2h0PSIyODAuMDMxIi8+DQo8cmVjdCB4PSIxMDQuMDAxIiB5PSIxNzIuMzgxIiBzdHlsZT0iZmlsbDojRDRFRDg1OyIgd2lkdGg9IjExMi4zNTciIGhlaWdodD0iMjgwLjA0MiIvPg0KPHJlY3QgeD0iNDMwLjI5OCIgeT0iMTcyLjM4MSIgc3R5bGU9ImZpbGw6I0JDQzk4NzsiIHdpZHRoPSI3My41MzIiIGhlaWdodD0iMjgwLjAzMSIvPg0KPHJlY3QgeD0iMzEyLjE3OCIgeT0iMTcyLjM4MSIgc3R5bGU9ImZpbGw6I0M4REI4NjsiIHdpZHRoPSIxNTAuOCIgaGVpZ2h0PSIyODAuMDMxIi8+DQo8L3N2Zz4=';
const houseIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4wIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgd2lkdGg9IjgwMHB4IiBoZWlnaHQ9IjgwMHB4IiB2aWV3Qm94PSIwIDAgNjQgNjQiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB4bWw6c3BhY2U9InByZXNlcnZlIj48ZyA+PHBhdGggZmlsbD0iI0Y5RUJCMiIgZD0iTTU2LDYwYzAsMSwwLjg5NiwyLTIsMkgzOFY0N2MwLTAuNTUzLTAuNDQ3LTEtMS0xSDI3Yy0wLjU1MywwLTEsMC40NDctMSwxdjE1SDEwYy0xLjEwNCwwLTItMC44OTYtMi0yVjMxLjQxMUwzMi4wMDksNy40MDNMNTYsMzEuMzk0VjYweiIvPjxwb2x5Z29uIGZpbGw9IiNGNzZENTciIHBvaW50cz0iMTQsNiAxOCw2IDE4LDEyLjYwMSAxNCwxNi41OTMiLz48cmVjdCB4PSIyOCIgeT0iNDgiIGZpbGw9IiNGOUVCQjIiIHdpZHRoPSI4IiBoZWlnaHQ9IjE0Ii8+PHBhdGggZmlsbD0iI0Y3NkQ1NyIgZD0iTTYxLDMzYy0wLjI3NiwwLTAuNjAyLTAuMDM2LTAuNzgyLTAuMjE3TDMyLjcxNiw1LjI4MWMtMC4xOTUtMC4xOTUtMC40NTEtMC4yOTMtMC43MDctMC4yOTNzLTAuNTEyLDAuMDk4LTAuNzA3LDAuMjkzTDMuNzkxLDMyLjc5M0MzLjYxLDMyLjk3NCwzLjI3NiwzMywzLDMzYy0wLjU1MywwLTEtMC40NDctMS0xYzAtMC4yNzYsMC4wMTYtMC42MjIsMC4xOTctMC44MDNMMzEuMDM1LDIuNDFjMCwwLDAuMzczLTAuNDEsMC45NzQtMC40MXMwLjk4MiwwLjM5OCwwLjk4MiwwLjM5OGwyOC44MDYsMjguODA1QzYxLjk3OCwzMS4zODQsNjIsMzEuNzI0LDYyLDMyQzYyLDMyLjU1Miw2MS41NTMsMzMsNjEsMzN6Ii8+PC9nPjwvc3ZnPg==';
const pondIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHdpZHRoPSI4MDBweCIgaGVpZ2h0PSI4MDBweCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgYXJpYS1oaWRkZW49InRydWUiIHJvbGU9ImltZyI+PGNpcmNsZSBjeD0iNjMuOTMiIGN5PSI2NCIgcj0iNjAiIGZpbGw9IiMxOTc2ZDIiPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjYwLjAzIiBjeT0iNjMuMSIgcj0iNTYuMSIgZmlsbD0iIzIxOTZmMyI+PC9jaXJjbGU+PHBhdGggZD0iTTIzLjkzIDI5LjdjNC41LTcuMSAxNC4xLTEzIDI0LjEtMTQuOGMyLjUtLjQgNS0uNiA3LjEuMmMxLjYuNiAyLjkgMi4xIDIgMy44Yy0uNyAxLjQtMi42IDItNC4xIDIuNWE0NC42NCA0NC42NCAwIDAgMC0yMyAxNy40Yy0yIDMtNSAxMS4zLTguNyA5LjJjLTMuOS0yLjMtMy4xLTkuNSAyLjYtMTguM3oiIGZpbGw9IiM5MGNhZjkiPjwvcGF0aD48L3N2Zz4=';
const raisedBedIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHdpZHRoPSI4MDBweCIgaGVpZ2h0PSI4MDBweCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgYXJpYS1oaWRkZW49InRydWUiIHJvbGU9ImltZyI+PHBhdGggZD0iTTExNiA0SDEyYy00LjQyIDAtOCAzLjU4LTggOHYxMDRjMCA0LjQyIDMuNTggOCA4IDhoMTA0YzQuNDIgMCA4LTMuNTggOC04VjEyYzAtNC40Mi0zLjU4LTgtOC04eiIgZmlsbD0iIzk2NWE0NSI+PC9wYXRoPjxwYXRoIGQ9Ik0xMDkuNyA0SDExLjVBNy41NTUgNy41NTUgMCAwIDAgNCAxMS41djk3LjljLS4wMSA0LjE0IDMuMzQgNy40OSA3LjQ4IDcuNUgxMDkuNmM0LjE0LjAxIDcuNDktMy4zNCA3LjUtNy40OFYxMS41Yy4wOS00LjA1LTMuMTMtNy40MS03LjE4LTcuNWgtLjIyeiIgZmlsbD0iI2I3NmQ1NCI+PC9wYXRoPjwvc3ZnPg==';
const pathIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjYzRhODgyIiBkPSJNNTEyIDBoLTUxMnY1MTJoNTEyeiIvPjxwYXRoIGZpbGw9IiNhYTg4NjIiIGQ9Ik0xNjAgODBoMTkydjM1MmgtMTkyeiIvPjxwYXRoIGZpbGw9IiNiYTlhNzIiIGQ9Ik0xOTIgMTIwaDEyOHYyNzJoLTEyOHoiLz48L3N2Zz4=';
const shedIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2QyYjQ4YyIvPjxwb2x5Z29uIHBvaW50cz0iMjU2LDUwIDQ4MCwyMDAgMzIsMjAwIiBmaWxsPSIjYTU3YTRhIi8+PHJlY3QgeD0iNjQiIHk9IjIwMCIgd2lkdGg9IjM4NCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNjNGE0NzQiLz48cmVjdCB4PSIyMDAiIHk9IjMwMCIgd2lkdGg9IjExMiIgaGVpZ2h0PSIxODAiIGZpbGw9IiM4YjY2NDAiLz48L3N2Zz4=';
const fenceIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2Y1ZjVmNSIgb3BhY2l0eT0iMCIvPjxyZWN0IHg9IjQwIiB5PSIxMjAiIHdpZHRoPSI2NCIgaGVpZ2h0PSIyNzIiIGZpbGw9IiNjOGE4NjAiIHJ4PSI4Ii8+PHJlY3QgeD0iMjI0IiB5PSIxMjAiIHdpZHRoPSI2NCIgaGVpZ2h0PSIyNzIiIGZpbGw9IiNjOGE4NjAiIHJ4PSI4Ii8+PHJlY3QgeD0iNDA4IiB5PSIxMjAiIHdpZHRoPSI2NCIgaGVpZ2h0PSIyNzIiIGZpbGw9IiNjOGE4NjAiIHJ4PSI4Ii8+PHJlY3QgeD0iNDAiIHk9IjE2MCIgd2lkdGg9IjQzMiIgaGVpZ2h0PSI0OCIgZmlsbD0iI2Q0Yjg3MCIgcng9IjgiLz48cmVjdCB4PSI0MCIgeT0iMjg4IiB3aWR0aD0iNDMyIiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZDRiODcwIiByeD0iOCIvPjxwb2x5Z29uIHBvaW50cz0iNDAsMTIwIDcyLDgwIDEwNCwxMjAiIGZpbGw9IiNjOGE4NjAiLz48cG9seWdvbiBwb2ludHM9IjIyNCwxMjAgMjU2LDgwIDI4OCwxMjAiIGZpbGw9IiNjOGE4NjAiLz48cG9seWdvbiBwb2ludHM9IjQwOCwxMjAgNDQwLDgwIDQ3MiwxMjAiIGZpbGw9IiNjOGE4NjAiLz48L3N2Zz4=';

const coopIcon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="50" width="80" height="44" fill="#c4a270" rx="6" stroke="#8b6040" stroke-width="2"/><polygon points="50,14 10,50 90,50" fill="#8b6040"/><rect x="35" y="62" width="30" height="32" fill="#7a5030" rx="4"/><circle cx="71" cy="37" r="11" fill="#f0c040"/><circle cx="78" cy="32" r="5" fill="#e05030"/><line x1="22" y1="65" x2="22" y2="94" stroke="#8b6040" stroke-width="2"/><line x1="78" y1="65" x2="78" y2="94" stroke="#8b6040" stroke-width="2"/></svg>');

export const STRUCTURES = [
    { name: 'Path',         color: '#c4a882', icon: pathIcon,       description: 'Walkway or path' },
    { name: 'Greenhouse',   color: '#b0d0a8', icon: greenhouseIcon, description: 'Covered growing area' },
    { name: 'Compost',      color: '#8B4513', icon: compostIcon,    description: 'Compost pile or bin' },
    { name: 'Pond',         color: '#87ceeb', icon: pondIcon,       description: 'Water feature' },
    { name: 'House',        color: '#D2691E', icon: houseIcon,      description: 'House or main building' },
    { name: 'Shed',         color: '#d2b48c', icon: shedIcon,       description: 'Storage or workspace' },
    { name: 'Raised Bed',   color: '#b87348', icon: raisedBedIcon,  description: 'Elevated planting bed' },
    { name: 'Fence',        color: '#c8a860', icon: fenceIcon,      description: 'Border or barrier' },
    { name: 'Coop',         color: '#c4a270', icon: coopIcon,       description: 'Chicken coop' },
];

// ─── General Map structures (17 allowed types) ────────────────────────────────
// textColor = icon color on canvas. labelBg = label pill background.
export const GENERAL_STRUCTURES = [
    { key: 'house',           name: 'House',            category: 'building',       color: '#EDE0C4', borderColor: '#9A6840', textColor: '#5A3810', labelBg: '#FFF4DF', iconKey: 'Home',       defaultSize: { wM: 10, hM: 8  }, canOpenZone: false, description: 'Main dwelling'                    },
    { key: 'outdoorKitchen',  name: 'Outdoor Kitchen',  category: 'building',       color: '#C87058', borderColor: '#7A2E18', textColor: '#FFFFFF', labelBg: '#FCE8E0', iconKey: 'CookingPot', defaultSize: { wM: 5,  hM: 4  }, canOpenZone: false, description: 'Outdoor cooking area'             },
    { key: 'greenhouse',      name: 'Greenhouse',       category: 'building',       color: '#B8EAC0', borderColor: '#308050', textColor: '#1A5030', labelBg: '#E8FAF0', iconKey: 'Sprout',     defaultSize: { wM: 6,  hM: 4  }, canOpenZone: true,  description: 'Protected growing space'          },
    { key: 'compost',         name: 'Compost',          category: 'utility',        color: '#7A5038', borderColor: '#3A1C0A', textColor: '#FFFFFF', labelBg: '#E8D8C8', iconKey: 'Recycle',    defaultSize: { wM: 3,  hM: 2  }, canOpenZone: false, description: 'Composting area'                  },
    { key: 'pond',            name: 'Pond',             category: 'water',          color: '#4A90D0', borderColor: '#1050A0', textColor: '#FFFFFF', labelBg: '#DCF0FF', iconKey: 'Waves',      defaultSize: { wM: 6,  hM: 5  }, canOpenZone: true,  description: 'Water feature'                    },
    { key: 'workshop',        name: 'Workshop',         category: 'building',       color: '#A09080', borderColor: '#50402C', textColor: '#2A1808', labelBg: '#E8E0D0', iconKey: 'Hammer',     defaultSize: { wM: 6,  hM: 4  }, canOpenZone: false, description: 'Tool storage & workspace'         },
    { key: 'carRoad',         name: 'Car Road',         category: 'infrastructure', color: '#B0A898', borderColor: '#605850', textColor: '#2A2018', labelBg: '#ECEAE4', iconKey: 'Car',        defaultSize: { wM: 20, hM: 3  }, canOpenZone: false, description: 'Vehicle access road', linear: true },
    { key: 'coop',            name: 'Coop',             category: 'animal',         color: '#D8C880', borderColor: '#806020', textColor: '#50380A', labelBg: '#FFF4D0', iconKey: 'Bird',       defaultSize: { wM: 4,  hM: 4  }, canOpenZone: false, description: 'Chicken / bird housing'           },
    { key: 'animalRun',       name: 'Animal Run',       category: 'animal',         color: '#90C85A', borderColor: '#388020', textColor: '#1A4008', labelBg: '#E8F8D8', iconKey: 'PawPrint',   defaultSize: { wM: 10, hM: 6  }, canOpenZone: false, description: 'Outdoor animal area'              },
    { key: 'guild',           name: 'Guild',            category: 'planting',       color: '#B890D8', borderColor: '#5A28A0', textColor: '#FFFFFF', labelBg: '#F0E8FC', iconKey: 'Network',    defaultSize: { wM: 6,  hM: 6  }, canOpenZone: true,  description: 'Polyculture planting guild'       },
    { key: 'orchard',         name: 'Orchard',          category: 'planting',       color: '#60B840', borderColor: '#286018', textColor: '#FFFFFF', labelBg: '#E0F8D0', iconKey: 'TreePine',   defaultSize: { wM: 18, hM: 10 }, canOpenZone: true,  description: 'Fruit tree area'                  },
    { key: 'berryPatch',      name: 'Berry Patch',      category: 'planting',       color: '#D04878', borderColor: '#801840', textColor: '#FFFFFF', labelBg: '#FCEAF4', iconKey: 'Cherry',     defaultSize: { wM: 8,  hM: 5  }, canOpenZone: true,  description: 'Berry bushes & shrubs'            },
    { key: 'vegetableGarden', name: 'Vegetable Garden', category: 'planting',       color: '#B8D888', borderColor: '#407820', textColor: '#204008', labelBg: '#F0FAE0', iconKey: 'Carrot',     defaultSize: { wM: 12, hM: 8  }, canOpenZone: true,  description: 'Beds, rows, intensive veg'        },
    { key: 'beehives',        name: 'Beehives',         category: 'animal',         color: '#F0C820', borderColor: '#A07000', textColor: '#5A3800', labelBg: '#FFF8D8', iconKey: 'Hexagon',    defaultSize: { wM: 5,  hM: 3  }, canOpenZone: false, description: 'Apiary / honey bees'              },
    { key: 'kidsPlayground',  name: 'Kids Playground',  category: 'amenity',        color: '#F8E040', borderColor: '#A07818', textColor: '#604800', labelBg: '#FFFCE0', iconKey: 'Smile',      defaultSize: { wM: 6,  hM: 5  }, canOpenZone: false, description: 'Play area for children'           },
    { key: 'stapleCrops',     name: 'Staple Crops',     category: 'planting',       color: '#C8A840', borderColor: '#806010', textColor: '#3A2808', labelBg: '#FFF0C8', iconKey: 'Wheat',      defaultSize: { wM: 12, hM: 8  }, canOpenZone: true,  description: 'Potatoes, corn, beans, grains'    },
    { key: 'woodlot',         name: 'Woodlot',          category: 'planting',       color: '#286828', borderColor: '#103010', textColor: '#FFFFFF', labelBg: '#D8EED8', iconKey: 'Trees',      defaultSize: { wM: 12, hM: 10 }, canOpenZone: false, description: 'Coppice, firewood, biomass'       },
];

export const GENERAL_STRUCTURES_MAP = Object.fromEntries(GENERAL_STRUCTURES.map(s => [s.key, s]));
export const GENERAL_KEYS_SET = new Set(GENERAL_STRUCTURES.map(s => s.key));

// Zone tabs are auto-created when one of these is placed on the General Map
export const OPENABLE_ZONE_KEYS = new Set([
    'greenhouse', 'pond', 'guild', 'orchard',
    'berryPatch', 'vegetableGarden', 'stapleCrops',
]);

// Maps legacy overlay item names → new GENERAL_STRUCTURES key
export const LEGACY_NAME_TO_KEY = {
    'House':              'house',
    'Shed':               'workshop',
    'Workshop':           'workshop',
    'Greenhouse':         'greenhouse',
    'Compost':            'compost',
    'Pond':               'pond',
    'Coop':               'coop',
    'Path':               'carRoad',
    'Car Road':           'carRoad',
    'Raised Bed':         null,      // keep as-is (zone editor item)
    'Fence':              null,      // keep as-is
    'Animal Run':         'animalRun',
    'Guild':              'guild',
    'Orchard':            'orchard',
    'Berry Patch':        'berryPatch',
    'Vegetable Garden':   'vegetableGarden',
    'Beehives':           'beehives',
    'Kids Playground':    'kidsPlayground',
    'Staple Crops':       'stapleCrops',
    'Woodlot':            'woodlot',
};
