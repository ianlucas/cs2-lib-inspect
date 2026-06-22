/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2BaseInventoryItem,
    CS2EconomyInstance,
    CS2_MAX_KEYCHAIN_SEED,
    CS2_MAX_STICKER_ROTATION,
    CS2_MAX_STICKER_WEAR,
    CS2_MIN_KEYCHAIN_SEED,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR,
    CS2_MIN_WEAR,
    CS2_STICKER_OFFSET_FACTOR,
    CS2_STICKER_WEAR_FACTOR,
    CS2_WEAR_FACTOR,
    assert,
    clamp,
    ensure,
    truncateToFactor
} from "@ianlucas/cs2-lib";
import { CS2_PREVIEW_HAS_STICKERS } from "./constants.js";

export interface CS2GCInventoryItemSticker {
    slot?: number;
    stickerId?: number;
    wear?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
    offsetZ?: number;
    tintId?: number;
    pattern?: number;
    wrappedSticker?: number;
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
                (item) =>
                    item.def === defindex &&
                    item.index === keychains[0].stickerId &&
                    item.wrappedSticker?.index === keychains[0].wrappedSticker
            );
        } else if (paintindex !== undefined) {
            economyItem = economy.itemsAsArray.find((item) => item.def === defindex && item.index === paintindex);
        }
        assert(economyItem !== undefined);
        if (economyItem.isKeychain()) {
            const seed = keychains[0]?.pattern ?? paintseed;
            return stripMinValues({
                id: economyItem.id,
                seed: seed !== undefined ? clamp(seed, CS2_MIN_KEYCHAIN_SEED, CS2_MAX_KEYCHAIN_SEED) : undefined
            });
        }
        // Per-model sticker offset envelope is constant across this item's slots; resolve it once here
        // (where `economyItem` is narrowed) so it can be closed over inside the sticker map below.
        const stickerOffsetXMin = economyItem.getMinimumStickerOffsetX();
        const stickerOffsetXMax = economyItem.getMaximumStickerOffsetX();
        const stickerOffsetYMin = economyItem.getMinimumStickerOffsetY();
        const stickerOffsetYMax = economyItem.getMaximumStickerOffsetY();
        return stripMinValues({
            id: economyItem.id,
            seed: economyItem.hasSeed() ? paintseed : undefined,
            wear:
                economyItem.hasWear() && floatvalue !== undefined
                    ? clamp(
                          truncateToFactor(floatvalue, CS2_WEAR_FACTOR),
                          economyItem.getMinimumWear(),
                          economyItem.getMaximumWear()
                      )
                    : undefined,
            statTrak: economyItem.hasStatTrak() ? killeatervalue : undefined,
            nameTag: economyItem.hasNameTag() ? customname : undefined,
            keychains:
                economyItem.hasKeychains() && keychains.length > 0
                    ? Object.fromEntries(
                          keychains.map(({ offsetX, offsetY, offsetZ, pattern, slot, stickerId, wrappedSticker }) => [
                              slot,
                              {
                                  id: ensure(
                                      economy.itemsAsArray.find(
                                          (item) =>
                                              item.isKeychain() &&
                                              item.index === stickerId &&
                                              item.wrappedSticker?.index === wrappedSticker
                                      )?.id
                                  ),
                                  seed:
                                      pattern !== undefined
                                          ? clamp(pattern, CS2_MIN_KEYCHAIN_SEED, CS2_MAX_KEYCHAIN_SEED)
                                          : undefined,
                                  x: offsetX,
                                  y: offsetY,
                                  z: offsetZ
                              }
                          ])
                      )
                    : undefined,
            stickers:
                economyItem.hasStickers() && stickers.length > 0
                    ? Object.fromEntries(
                          stickers.map(({ slot, stickerId, offsetX, offsetY, wear, rotation }, index) => [
                              index,
                              {
                                  id: ensure(
                                      economy.itemsAsArray.find((item) => item.isSticker() && item.index === stickerId)
                                          ?.id
                                  ),
                                  rotation: rotation !== undefined ? normalizeStickerRotation(rotation) : undefined,
                                  schema: slot,
                                  wear:
                                      wear !== undefined
                                          ? clamp(
                                                truncateToFactor(wear, CS2_STICKER_WEAR_FACTOR),
                                                CS2_MIN_STICKER_WEAR,
                                                CS2_MAX_STICKER_WEAR
                                            )
                                          : undefined,
                                  x: healStickerOffset(offsetX, stickerOffsetXMin, stickerOffsetXMax),
                                  y: healStickerOffset(offsetY, stickerOffsetYMin, stickerOffsetYMax)
                              }
                          ])
                      )
                    : undefined,
            patches:
                economyItem.hasPatches() && stickers.length > 0
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

// Sticker offsets are deltas from the markup slot's default, stored on the CS2_STICKER_OFFSET_FACTOR
// grid. Truncate onto that grid (always — so the value satisfies cs2-lib's factor-precision assert even
// when the model publishes no bounds), then clamp into the model's [min, max] envelope when it does.
// Mirrors cs2-lib's private healStickerOffset, composed from its newly exported primitives.
function healStickerOffset(
    value: number | undefined,
    min: number | undefined,
    max: number | undefined
): number | undefined {
    if (value === undefined || !Number.isFinite(value)) {
        return undefined;
    }
    value = truncateToFactor(value, CS2_STICKER_OFFSET_FACTOR);
    if (min !== undefined && value < min) {
        return min;
    }
    if (max !== undefined && value > max) {
        return max;
    }
    return value;
}

function normalizeStickerRotation(rotation: number): number {
    // Wrap to the in-game [-180, 180] range; legacy 0–359 and out-of-range values collapse to the
    // equivalent signed angle (e.g. 270 -> -90, 9999 -> -81). This deliberately diverges from cs2-lib's
    // healing, which drops still-out-of-range rotations to undefined — here we wrap-and-preserve so a
    // parsed link keeps its visual angle.
    const normalized = ((Math.trunc(rotation) % 360) + 360) % 360; // [0, 359]
    return normalized > CS2_MAX_STICKER_ROTATION ? normalized - 360 : normalized; // [-179, 180]
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
            if (sticker.rotation === 0) {
                sticker.rotation = undefined;
            }
        }
    }
    if (item.keychains !== undefined) {
        for (const keychain of Object.values(item.keychains)) {
            if (keychain.seed === CS2_MIN_KEYCHAIN_SEED) {
                keychain.seed = undefined;
            }
        }
    }
    return item;
}
