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
    ensure
} from "@ianlucas/cs2-lib";
import { CS2_PREVIEW_HAS_STICKERS } from "./constants.js";
import { truncate } from "./utils.js";

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
    const stickers = itemInfo.stickers ?? [];
    const keychains = itemInfo.keychains ?? [];
    let economyItem = economy.itemsAsArray.find((item) => item.def === itemInfo.defindex);
    let baseInventoryItem: CS2BaseInventoryItem | undefined;
    if (economyItem !== undefined && CS2_PREVIEW_HAS_STICKERS.includes(economyItem.type)) {
        // Collectible comes from the initial assignment.
        if (stickers.length === 1) {
            // Patch, Sticker, and Graffiti
            economyItem = economy.itemsAsArray.find(
                (item) =>
                    item.def === itemInfo.defindex &&
                    item.index === stickers[0].stickerId &&
                    item.tint === stickers[0].tintId
            );
        }
        if (economyItem !== undefined) {
            baseInventoryItem = { id: economyItem.id };
        }
    } else {
        if (itemInfo.musicindex !== undefined) {
            // Music Kit
            economyItem = economy.itemsAsArray.find((item) => item.isMusicKit() && item.index === itemInfo.musicindex);
            if (economyItem !== undefined) {
                baseInventoryItem = { id: economyItem.id, statTrak: itemInfo.killeatervalue };
            }
        } else {
            economyItem = economy.itemsAsArray.find(
                itemInfo.paintindex !== undefined
                    ? (item) => item.def === itemInfo.defindex && item.index === itemInfo.paintindex
                    : (item) => item.def === itemInfo.defindex
            );
        }
        if (economyItem !== undefined && baseInventoryItem === undefined) {
            if (economyItem.isKeychain()) {
                baseInventoryItem = {
                    id: economyItem.id,
                    seed: keychains[0]?.pattern ?? itemInfo.paintseed
                };
            } else {
                baseInventoryItem = {
                    id: economyItem.id,
                    seed: itemInfo.paintseed,
                    wear:
                        itemInfo.floatvalue !== undefined ? truncate(itemInfo.floatvalue, CS2_WEAR_FACTOR) : undefined,
                    statTrak: itemInfo.killeatervalue,
                    nameTag: itemInfo.customname,
                    keychains:
                        keychains.length > 0
                            ? Object.fromEntries(
                                  keychains.map(({ offsetX, offsetY, pattern, slot, stickerId }) => [
                                      slot,
                                      {
                                          id: ensure(
                                              economy.itemsAsArray.find(
                                                  (item) => item.isKeychain() && item.index === stickerId
                                              )?.id
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
                                              economy.itemsAsArray.find(
                                                  (item) => item.isSticker() && item.index === stickerId
                                              )?.id
                                          ),
                                          rotation: rotation !== undefined ? Math.trunc(rotation) : undefined,
                                          schema: slot,
                                          wear:
                                              wear !== undefined ? truncate(wear, CS2_STICKER_WEAR_FACTOR) : undefined,
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
                                          economy.itemsAsArray.find(
                                              (item) => item.isPatch() && item.index === stickerId
                                          )?.id
                                      )
                                  ])
                              )
                            : undefined
                };
            }
        }
    }
    if (baseInventoryItem !== undefined) {
        if (baseInventoryItem.seed === CS2_MIN_SEED) {
            baseInventoryItem.seed = undefined;
        }
        if (baseInventoryItem.wear === CS2_MIN_WEAR) {
            baseInventoryItem.wear = undefined;
        }
        if (baseInventoryItem.stickers !== undefined) {
            for (const sticker of Object.values(baseInventoryItem.stickers)) {
                if (sticker.wear === CS2_MIN_STICKER_WEAR) {
                    sticker.wear = undefined;
                }
            }
        }
    }
    return ensure(baseInventoryItem);
}
