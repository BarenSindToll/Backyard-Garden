// Linear structures resize only in length
export const LINEAR_STRUCTURES = new Set(['Path', 'Fence', 'carRoad', 'Car Road']);
// Structures rendered as circles (force square + 50% radius)
export const CIRCULAR_STRUCTURES = new Set(['Pond', 'pond']);
// Structures that open the Bed Editor when clicked
export const BED_LIKE_STRUCTURES = new Set(['Raised Bed', 'Greenhouse']);

export const MAP_ACTION_BUTTON_STYLE = { background: '#fff4cf', border: '1px solid #c8a96c', color: '#4b3117', borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(75,49,23,0.18)' };

export const PAPER_LABEL_STYLE = {
    background: '#fff4cf',
    border: '1px solid #c8a96c',
    boxShadow: '0 2px 4px rgba(80,55,20,0.18)',
    color: '#4b3117',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 2,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
};
