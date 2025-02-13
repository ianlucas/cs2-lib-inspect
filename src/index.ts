/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2BaseInventoryItem,
    CS2EconomyInstance,
    CS2EconomyItem,
    CS2InventoryItem,
    CS2ItemType,
    type CS2ItemTypeValues,
    CS2RarityColor,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR,
    CS2_MIN_WEAR,
    ensure
} from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";

export const CS2PreviewRarity = {
    [CS2RarityColor.Common]: 1,
    [CS2RarityColor.Uncommon]: 2,
    [CS2RarityColor.Rare]: 3,
    [CS2RarityColor.Mythical]: 4,
    [CS2RarityColor.Legendary]: 5,
    [CS2RarityColor.Ancient]: 6,
    [CS2RarityColor.Immortal]: 7
};

export const CS2_PREVIEW_HAS_STICKERS: CS2ItemTypeValues[] = [
    CS2ItemType.Graffiti,
    CS2ItemType.MusicKit,
    CS2ItemType.Patch,
    CS2ItemType.Sticker
];

export const CS2_PREVIEW_INSPECTABLE_ITEMS: CS2ItemTypeValues[] = [
    CS2ItemType.Agent,
    CS2ItemType.Collectible,
    CS2ItemType.Container,
    CS2ItemType.Gloves,
    CS2ItemType.Graffiti,
    CS2ItemType.Keychain,
    CS2ItemType.Melee,
    CS2ItemType.MusicKit,
    CS2ItemType.Patch,
    CS2ItemType.Sticker,
    CS2ItemType.Weapon
];

export const CS2_PREVIEW_ATTRIBUTELESS_ITEMS: CS2ItemTypeValues[] = [
    ...CS2_PREVIEW_HAS_STICKERS,
    CS2ItemType.Collectible,
    CS2ItemType.Keychain
];

export const CS2_PREVIEW_URL = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";
export const CS2_PREVIEW_COMMAND = "csgo_econ_action_preview ";

function floatToBytes(floatValue: number) {
    const floatArray = new Float32Array(1);
    floatArray[0] = floatValue;
    const byteArray = new Uint32Array(floatArray.buffer);
    return byteArray[0];
}

function bytesToFloat(byteValue: number) {
    const byteArray = new Uint32Array(1);
    byteArray[0] = byteValue;
    const floatArray = new Float32Array(byteArray.buffer);
    return floatArray[0];
}

function getEconomyItemPreviewData(item: CS2EconomyItem): CEconItemPreviewDataBlock {
    const { def, index, rarity, type, tint } = item;
    const hasStickers = CS2_PREVIEW_HAS_STICKERS.includes(type);
    const hasPaintIndex = !hasStickers && !item.isMusicKit();
    const hasKeychains = item.isKeychain();
    return {
        defindex: def,
        keychains: hasKeychains
            ? [
                  {
                      stickerId: index,
                      slot: 0
                  }
              ]
            : [],
        musicindex: item.isMusicKit() ? index : undefined,
        paintindex: hasPaintIndex ? index : undefined,
        paintseed: item.hasSeed() ? CS2_MIN_SEED : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getMinimumWear()) : undefined,
        rarity: CS2PreviewRarity[rarity] ?? 0,
        stickers: hasStickers
            ? [
                  {
                      tintId: tint,
                      stickerId: index,
                      slot: 0
                  }
              ]
            : []
    };
}

function getInventoryItemPreviewData(item: CS2InventoryItem): CEconItemPreviewDataBlock {
    const { nameTag, seed, statTrak, stickers, patches, keychains } = item;
    const baseAttributes = getEconomyItemPreviewData(item);
    return {
        ...baseAttributes,
        customname: nameTag,
        killeaterscoretype: statTrak !== undefined ? 0 : undefined,
        killeatervalue: statTrak,
        paintseed: item.hasSeed() ? (seed ?? CS2_MIN_SEED) : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getWear()) : undefined,
        stickers:
            stickers !== undefined
                ? item.someStickers().map(([slot, { id, wear, x, y }]) => ({
                      offsetX: x,
                      offsetY: y,
                      slot,
                      stickerId: item.economy.getById(id).index,
                      wear: wear ?? CS2_MIN_STICKER_WEAR
                  }))
                : patches !== undefined
                  ? item.somePatches().map(([slot, patchId]) => ({
                        slot,
                        stickerId: item.economy.getById(patchId).index
                    }))
                  : baseAttributes.stickers,
        keychains:
            keychains !== undefined
                ? item.someKeychains().map(([slot, { id, x, y, seed }]) => ({
                      offsetX: x,
                      offsetY: y,
                      pattern: seed,
                      slot,
                      stickerId: item.economy.getById(id).index
                  }))
                : item.isKeychain()
                  ? baseAttributes.keychains.map((keychain) => {
                        keychain.pattern = seed;
                        return keychain;
                    })
                  : baseAttributes.keychains
    };
}

function generateHex(attributes: CEconItemPreviewDataBlock) {
    const payload = Buffer.concat([Uint8Array.from([0]), CEconItemPreviewDataBlock.toBinary(attributes)]);
    const crc = CRC32.buf(payload);
    const xCrc = (crc & 0xffff) ^ (CEconItemPreviewDataBlock.toBinary(attributes).byteLength * crc);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE((xCrc & 0xffffffff) >>> 0, 0);
    const buffer = Buffer.concat([payload, crcBuffer]);
    return buffer.toString("hex").toUpperCase();
}

export function generateInspectLink(item: CS2EconomyItem | CS2InventoryItem) {
    const attributes =
        item instanceof CS2InventoryItem ? getInventoryItemPreviewData(item) : getEconomyItemPreviewData(item);
    const hex = generateHex(attributes);
    // There's a char limit for launching the game using the steam:// protocol.
    if (CS2_PREVIEW_URL.length + hex.length > 300) {
        return `${CS2_PREVIEW_COMMAND}${hex}`;
    }
    return `${CS2_PREVIEW_URL}${hex}`;
}

export function isCommandInspect(inspectLink: string) {
    return inspectLink.startsWith(CS2_PREVIEW_COMMAND);
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
        if (attributes.musicindex !== undefined) {
            // Music Kit
            economyItem = economy.itemsAsArray.find(
                (item) => item.isMusicKit() && item.index === attributes.musicindex
            );
            // Music kit with StatTrak
            if (economyItem !== undefined && attributes.killeatervalue !== undefined) {
                baseInventoryItem = { id: economyItem.id, statTrak: attributes.killeatervalue };
            }
        } else if (attributes.keychains.length === 1) {
            // Keychain
            economyItem = economy.itemsAsArray.find(
                (item) => item.isKeychain() && item.index === attributes.keychains[0].stickerId
            );
        } else if (attributes.stickers.length === 1) {
            // Patch, Sticker, and Graffiti
            economyItem = economy.itemsAsArray.find(
                (item) =>
                    item.def === attributes.defindex &&
                    item.index === attributes.stickers[0].stickerId &&
                    item.tint === attributes.stickers[0].tintId
            );
        }
        if (economyItem !== undefined && baseInventoryItem === undefined) {
            baseInventoryItem = {
                id: economyItem.id
            };
        }
    } else {
        economyItem = economy.itemsAsArray.find(
            (item) => item.def === attributes.defindex && item.index === attributes.paintindex
        );
        if (economyItem !== undefined) {
            baseInventoryItem = {
                id: economyItem.id,
                seed: attributes.paintseed,
                wear: attributes.paintwear !== undefined ? bytesToFloat(attributes.paintwear) : undefined,
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
                              attributes.stickers?.map(({ slot, stickerId, offsetX, offsetY, wear }) => [
                                  ensure(slot),
                                  {
                                      id: ensure(
                                          economy.itemsAsArray.find(
                                              (item) => item.isSticker() && item.index === stickerId
                                          )?.id
                                      ),
                                      wear,
                                      x: offsetX,
                                      y: offsetY
                                  }
                              ])
                          )
                        : undefined,
                patches:
                    economyItem.isAgent() && attributes.stickers.length > 0
                        ? Object.fromEntries(
                              attributes.stickers.map(({ slot, stickerId }) => [
                                  ensure(slot),
                                  ensure(
                                      economy.itemsAsArray.find((item) => item.isSticker() && item.index === stickerId)
                                          ?.id
                                  )
                              ])
                          )
                        : undefined
            };
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
