export function resolveIconSrc(iconData) {
    if (!iconData) return null;
    return iconData.startsWith('data:') ? iconData : `data:image/svg+xml;base64,${iconData}`;
}
