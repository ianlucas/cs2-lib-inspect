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
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CS2_PREVIEW_COMMAND, CS2_PREVIEW_HAS_STICKERS, CS2_PREVIEW_URL } from "./constants.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";
import { bytesToFloat, truncate } from "./utils.js";

export function isCommandInspect(inspectLink: string) {
    return inspectLink.startsWith(CS2_PREVIEW_COMMAND);
}

export function isSteamInspectLink(inspectLink: string): boolean {
    try {
        const decoded = decodeURI(inspectLink);
        return /^steam:\/\/rungame\/730\/\d+\/[+ ]csgo_econ_action_preview [SM]\d+A\d+D\d+$/.test(decoded);
    } catch {
        return false;
    }
}

function parseHex(hexString: string): CEconItemPreviewDataBlock {
    // Convert hex string to buffer
    const buffer = Buffer.from(hexString.toLowerCase(), "hex");
    // First byte should be 0
    if (buffer[0] !== 0) {
        throw new Error("Invalid format: First byte should be 0");
    }
    // Extract the data and CRC portions
    const payload = buffer.slice(0, -4); // Everything except last 4 bytes
    const providedCrcBuffer = buffer.slice(-4); // Last 4 bytes
    const providedCrc = providedCrcBuffer.readUInt32BE(0);
    // Extract just the attributes data (removing the first byte)
    const attributesData = payload.slice(1);
    // Verify CRC
    const calculatedCrc = CRC32.buf(payload);
    const calculatedXCrc = (calculatedCrc & 0xffff) ^ (attributesData.byteLength * calculatedCrc);
    const finalCalculatedCrc = (calculatedXCrc & 0xffffffff) >>> 0;
    if (finalCalculatedCrc !== providedCrc) {
        throw new Error("CRC verification failed");
    }
    // Convert the binary data back to CEconItemPreviewDataBlock
    return CEconItemPreviewDataBlock.fromBinary(attributesData);
}

export function parseInspectLink(economy: CS2EconomyInstance, inspectLink: string): CS2BaseInventoryItem {
    const hex = isCommandInspect(inspectLink)
        ? inspectLink.replace(CS2_PREVIEW_COMMAND, "")
        : inspectLink.replace(CS2_PREVIEW_URL, "");
    const attributes = parseHex(hex);
    let economyItem = economy.itemsAsArray.find((item) => item.def === attributes.defindex);
    let baseInventoryItem: CS2BaseInventoryItem | undefined;
    if (economyItem !== undefined && CS2_PREVIEW_HAS_STICKERS.includes(economyItem.type)) {
        // Collectible comes from the initial assignment.
        if (attributes.stickers.length === 1) {
            // Patch, Sticker, and Graffiti
            economyItem = economy.itemsAsArray.find(
                (item) =>
                    item.def === attributes.defindex &&
                    item.index === attributes.stickers[0].stickerId &&
                    item.tint === attributes.stickers[0].tintId
            );
        }
        if (economyItem !== undefined) {
            baseInventoryItem = { id: economyItem.id };
        }
    } else {
        if (attributes.musicindex !== undefined) {
            // Music Kit
            economyItem = economy.itemsAsArray.find(
                (item) => item.isMusicKit() && item.index === attributes.musicindex
            );
            if (economyItem !== undefined) {
                baseInventoryItem = { id: economyItem.id, statTrak: attributes.killeatervalue };
            }
        } else {
            economyItem = economy.itemsAsArray.find(
                attributes.paintindex !== undefined
                    ? (item) => item.def === attributes.defindex && item.index === attributes.paintindex
                    : (item) => item.def === attributes.defindex
            );
        }
        if (economyItem !== undefined && baseInventoryItem === undefined) {
            if (economyItem.isKeychain()) {
                baseInventoryItem = {
                    id: economyItem.id,
                    seed: attributes.keychains[0]?.pattern ?? attributes.paintseed
                };
            } else {
                baseInventoryItem = {
                    id: economyItem.id,
                    seed: attributes.paintseed,
                    wear:
                        attributes.paintwear !== undefined
                            ? truncate(bytesToFloat(attributes.paintwear), CS2_WEAR_FACTOR)
                            : undefined,
                    statTrak: attributes.killeatervalue,
                    nameTag: attributes.customname,
                    keychains:
                        attributes.keychains.length > 0
                            ? Object.fromEntries(
                                  attributes.keychains.map(({ offsetX, offsetY, pattern, slot, stickerId }) => [
                                      ensure(slot),
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
                        !economyItem.isAgent() && attributes.stickers.length > 0
                            ? Object.fromEntries(
                                  attributes.stickers?.map(
                                      ({ slot, stickerId, offsetX, offsetY, wear, rotation }, index) => [
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
                                                  wear !== undefined
                                                      ? truncate(wear, CS2_STICKER_WEAR_FACTOR)
                                                      : undefined,
                                              x: offsetX,
                                              y: offsetY
                                          }
                                      ]
                                  )
                              )
                            : undefined,
                    patches:
                        economyItem.isAgent() && attributes.stickers.length > 0
                            ? Object.fromEntries(
                                  attributes.stickers.map(({ slot, stickerId }) => [
                                      ensure(slot),
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
