/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2ItemType, type CS2ItemTypeValues, CS2RarityColor } from "@ianlucas/cs2-lib";

export const CS2PreviewRarity = {
    [CS2RarityColor.Default]: 0,
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
    CS2ItemType.Keychain,
    CS2ItemType.MusicKit
];

export const CS2_PREVIEW_URL = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";
export const CS2_PREVIEW_COMMAND = "csgo_econ_action_preview ";
