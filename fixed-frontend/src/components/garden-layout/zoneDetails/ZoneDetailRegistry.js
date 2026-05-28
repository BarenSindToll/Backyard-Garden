import { detectZoneType } from '../gardenZoneConfig';
import {
    GuildDetail, PondDetail, HerbGardenDetail, VegetableGardenDetail,
    Orchard, BerryPatch, BeeHives, ChickenCoop, Compost,
    Greenhouse, Pasture, Grain, House, Patio,
} from './ZoneDetailViews.jsx';

export function detectDetailType(name = '') {
    const n = name.toLowerCase();
    if (n.includes('berry') || n.includes('fructe de pădure') || n.includes('fructe de padure')) return 'berry';
    if (n.includes('bee') || n.includes('apiary') || n.includes('hive') || n.includes('albine')) return 'bees';
    if (n.includes('chicken') || n.includes('poultry') || n.includes('hen') || n.includes('găin') || n.includes('gain') || n.includes('coop')) return 'chickens';
    if (n.includes('pasture') || n.includes('paddock') || n.includes('sheep') || n.includes('pășune') || n.includes('pasune')) return 'pasture';
    if (n.includes('grain') || n.includes('wheat') || n.includes('cereal') || n.includes('grâu') || n.includes('grau')) return 'grain';
    if (n.includes('patio') || n.includes('terasă') || n.includes('terasa') || n.includes('deck')) return 'patio';
    if (n.includes('house') || n.includes('casă') || n.includes('casa') || n.includes('home')) return 'house';
    return detectZoneType(name);
}

export const DETAIL_REGISTRY = {
    orchard: Orchard,
    berry: BerryPatch,
    bees: BeeHives,
    chickens: ChickenCoop,
    compost: Compost,
    greenhouse: Greenhouse,
    pasture: Pasture,
    grain: Grain,
    house: House,
    patio: Patio,
    guild: GuildDetail,
    pond: PondDetail,
    herb: HerbGardenDetail,
    vegetable: VegetableGardenDetail,
};
