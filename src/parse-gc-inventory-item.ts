/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2BaseInventoryItem,
    type RecordValue,
    CS2EconomyInstance,
    CS2EconomyItem,
    CS2_MAX_KEYCHAIN_SEED,
    CS2_MAX_STICKER_ROTATION,
    CS2_MAX_STICKER_WEAR,
    CS2_MIN_KEYCHAIN_SEED,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR,
    CS2_MIN_WEAR,
    CS2_STICKER_WEAR_FACTOR,
    CS2_WEAR_FACTOR,
    assert,
    clamp,
    ensure,
    getNextStickerSchema,
    healStickerOffset,
    snapStickerRotation,
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
                    ? parseStickers(economy, economyItem, stickers)
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

// Builds the sticker record from GC/inspect data. The record key is the 0-based stack (draw) position
// and each sticker's `schema` is its physical StickerMarkup anchor. A GC slot outside the model's
// [0, getStickerSchemaCount()) is repaired onto the first free anchor — mirroring cs2-lib's loader — so
// the parsed item always satisfies the sticker validator, matching how offsets are already healed.
function parseStickers(
    economy: CS2EconomyInstance,
    economyItem: CS2EconomyItem,
    stickers: CS2GCInventoryItemSticker[]
): CS2BaseInventoryItem["stickers"] {
    const schemaCount = economyItem.getStickerSchemaCount();
    const offsetXMin = economyItem.getMinimumStickerOffsetX();
    const offsetXMax = economyItem.getMaximumStickerOffsetX();
    const offsetYMin = economyItem.getMinimumStickerOffsetY();
    const offsetYMax = economyItem.getMaximumStickerOffsetY();
    const parsed: RecordValue<CS2BaseInventoryItem["stickers"]>[] = [];
    for (const { slot, stickerId, offsetX, offsetY, wear, rotation } of stickers) {
        let schema = slot ?? parsed.length;
        if (!Number.isInteger(schema) || schema < 0 || schema >= schemaCount) {
            schema = getNextStickerSchema(parsed, schemaCount);
        }
        parsed.push({
            id: ensure(economy.itemsAsArray.find((item) => item.isSticker() && item.index === stickerId)?.id),
            rotation: rotation !== undefined ? normalizeStickerRotation(rotation) : undefined,
            schema,
            wear:
                wear !== undefined
                    ? clamp(truncateToFactor(wear, CS2_STICKER_WEAR_FACTOR), CS2_MIN_STICKER_WEAR, CS2_MAX_STICKER_WEAR)
                    : undefined,
            x: healStickerOffset(offsetX, offsetXMin, offsetXMax),
            y: healStickerOffset(offsetY, offsetYMin, offsetYMax)
        });
    }
    return Object.fromEntries(parsed.map((sticker, index) => [index, sticker]));
}

function normalizeStickerRotation(rotation: number): number {
    // Snap onto the half-degree grid, then wrap to the in-game [-180, 180] range; legacy 0–359 and
    // out-of-range values collapse to the equivalent signed angle (e.g. 270 -> -90, 9999 -> -81,
    // 359.7 -> -0.5). This deliberately diverges from cs2-lib's healing, which drops
    // still-out-of-range rotations to undefined — here we wrap-and-preserve so a parsed link keeps
    // its visual angle.
    const normalized = ((snapStickerRotation(rotation) % 360) + 360) % 360; // [0, 359.5]
    return normalized > CS2_MAX_STICKER_ROTATION ? normalized - 360 : normalized; // [-179.5, 180]
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
