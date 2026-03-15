/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type CS2BaseInventoryItem, CS2EconomyInstance } from "@ianlucas/cs2-lib";
import { parseGCInventoryItem } from "./parse-gc-inventory-item.js";

export interface CSFloatStickerInfo {
    slot: number;
    stickerId: number;
    wear?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
    tintId?: number;
    pattern?: number;
}

export interface CSFloatItemInfo {
    defindex: number;
    paintindex?: number;
    paintseed?: number;
    floatvalue?: number;
    killeatervalue?: number;
    customname?: string;
    musicindex?: number;
    stickers?: CSFloatStickerInfo[];
    keychains?: CSFloatStickerInfo[];
    origin?: number;
    quality?: number;
    rarity?: number;
    floatid?: number;
    imageurl?: string;
    min?: number;
    max?: number;
    weapon_type?: string;
    item_name?: string;
    rarity_name?: string;
    quality_name?: string;
    wear_name?: string;
    full_item_name?: string;
    s?: string;
    a?: string;
    d?: string;
    m?: string;
}

export function parseCSFloatItemInfo(economy: CS2EconomyInstance, itemInfo: CSFloatItemInfo): CS2BaseInventoryItem {
    return parseGCInventoryItem(economy, {
        defindex: itemInfo.defindex,
        paintindex: itemInfo.paintindex,
        paintseed: itemInfo.paintseed,
        floatvalue: itemInfo.floatvalue,
        killeatervalue: itemInfo.killeatervalue,
        customname: itemInfo.customname,
        musicindex: itemInfo.musicindex,
        stickers: itemInfo.stickers ?? [],
        keychains: itemInfo.keychains ?? []
    });
}
