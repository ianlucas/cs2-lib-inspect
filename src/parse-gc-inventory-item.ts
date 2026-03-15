/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2BaseInventoryItem,
    CS2EconomyInstance,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR,
    CS2_MIN_WEAR,
    CS2_STICKER_WEAR_FACTOR,
    CS2_WEAR_FACTOR,
    assert,
    ensure
} from "@ianlucas/cs2-lib";
import { CS2_PREVIEW_HAS_STICKERS } from "./constants.js";
import { truncate } from "./utils.js";

export interface CS2GCInventoryItemSticker {
    slot?: number;
    stickerId?: number;
    wear?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
    tintId?: number;
    pattern?: number;
}

export interface CS2GCInventoryItem {
    defindex: number;
    paintindex?: number;
    paintseed?: number;
    floatvalue?: number;
    killeatervalue?: number;
    customname?: string;
    musicindex?: number;
    stickers: CS2GCInventoryItemSticker[];
    keychains: CS2GCInventoryItemSticker[];
}

export function parseGCInventoryItem(economy: CS2EconomyInstance, data: CS2GCInventoryItem): CS2BaseInventoryItem {
    const { defindex, paintindex, paintseed, floatvalue, killeatervalue, customname, musicindex, stickers, keychains } =
        data;
    let economyItem = economy.itemsAsArray.find((item) => item.def === defindex);
    if (economyItem !== undefined && CS2_PREVIEW_HAS_STICKERS.includes(economyItem.type)) {
        if (stickers.length === 1) {
            // Patch, Sticker, and Graffiti
            economyItem = economy.itemsAsArray.find(
                (item) =>
                    item.def === defindex && item.index === stickers[0].stickerId && item.tint === stickers[0].tintId
            );
        }
        return ensure(economyItem !== undefined ? { id: economyItem.id } : undefined);
    } else if (musicindex !== undefined) {
        // Music Kit
        economyItem = economy.itemsAsArray.find((item) => item.isMusicKit() && item.index === musicindex);
        return ensure(
            economyItem !== undefined ? stripMinValues({ id: economyItem.id, statTrak: killeatervalue }) : undefined
        );
    } else {
        if (economyItem?.isKeychain() && keychains.length > 0) {
            economyItem = economy.itemsAsArray.find(
                (item) => item.def === defindex && item.index === keychains[0].stickerId
            );
        } else if (paintindex !== undefined) {
            economyItem = economy.itemsAsArray.find((item) => item.def === defindex && item.index === paintindex);
        }
        assert(economyItem !== undefined);
        if (economyItem.isKeychain()) {
            return stripMinValues({
                id: economyItem.id,
                seed: keychains[0]?.pattern ?? paintseed
            });
        }
        return stripMinValues({
            id: economyItem.id,
            seed: paintseed,
            wear: floatvalue !== undefined ? truncate(floatvalue, CS2_WEAR_FACTOR) : undefined,
            statTrak: killeatervalue,
            nameTag: customname,
            keychains:
                keychains.length > 0
                    ? Object.fromEntries(
                          keychains.map(({ offsetX, offsetY, pattern, slot, stickerId }) => [
                              slot,
                              {
                                  id: ensure(
                                      economy.itemsAsArray.find((item) => item.isKeychain() && item.index === stickerId)
                                          ?.id
                                  ),
                                  seed: pattern,
                                  x: offsetX,
                                  y: offsetY
                              }
                          ])
                      )
                    : undefined,
            stickers:
                !economyItem.isAgent() && stickers.length > 0
                    ? Object.fromEntries(
                          stickers.map(({ slot, stickerId, offsetX, offsetY, wear, rotation }, index) => [
                              index,
                              {
                                  id: ensure(
                                      economy.itemsAsArray.find((item) => item.isSticker() && item.index === stickerId)
                                          ?.id
                                  ),
                                  rotation: rotation !== undefined ? Math.trunc(rotation) : undefined,
                                  schema: slot,
                                  wear: wear !== undefined ? truncate(wear, CS2_STICKER_WEAR_FACTOR) : undefined,
                                  x: offsetX,
                                  y: offsetY
                              }
                          ])
                      )
                    : undefined,
            patches:
                economyItem.isAgent() && stickers.length > 0
                    ? Object.fromEntries(
                          stickers.map(({ slot, stickerId }) => [
                              slot,
                              ensure(
                                  economy.itemsAsArray.find((item) => item.isPatch() && item.index === stickerId)?.id
                              )
                          ])
                      )
                    : undefined
        });
    }
}

function stripMinValues(item: CS2BaseInventoryItem): CS2BaseInventoryItem {
    if (item.seed === CS2_MIN_SEED) {
        item.seed = undefined;
    }
    if (item.wear === CS2_MIN_WEAR) {
        item.wear = undefined;
    }
    if (item.stickers !== undefined) {
        for (const sticker of Object.values(item.stickers)) {
            if (sticker.wear === CS2_MIN_STICKER_WEAR) {
                sticker.wear = undefined;
            }
        }
    }
    return item;
}
