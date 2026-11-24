import {Item, MessageNode, Player} from "archipelago.js";

export type APEvent = ItemSentEvent | ItemHintedEvent | GoalEvent | ChatEvent | CountdownEvent | ServerChatEvent;

// Sending a flat object for now.
// We can start sending the Player/Item objects when we want more data from them.
export interface ItemSentEvent {
    type: "itemSent";
    timestamp: number;
    sender: string;
    receiver: string;
    item: string;
    location: string;
}

export interface ItemHintedEvent {
    type: "itemHinted";
    timestamp: number;
    player: string;
    item: string;
}

export interface GoalEvent {
    type: "goal";
    timestamp: number;
    player: string;
}

// Excludes other chats that are more specific AP events, such as ItemHintedEvent.
export interface ChatEvent {
    type: "chat";
    timestamp: number;
    player: string;
    message: string;
}

export interface CountdownEvent {
    type: "countdown";
    timestamp: number;
    // The countdown value, in seconds. 0 means GO!
    value: number;
}

export interface ServerChatEvent {
    type: "serverChat";
    timestamp: number;
    message: string;
}

export function parseItemSentEvent(_text: string, item: Item, _nodes: MessageNode[]): ItemSentEvent {
    return {
        type: "itemSent",
        timestamp: Date.now(),
        sender: item.sender.name,
        receiver: item.receiver.name,
        item: item.name,
        location: item.locationName
    };
}

export function parseGoalEvent(_text: string, player: Player, _nodes: MessageNode[]): GoalEvent {
    return {
        type: "goal",
        timestamp: Date.now(),
        player: player.name
    };
}

const HINT_PATTERN = /^!hint (.*)/;

export function parseAPEventFromChat(text: string, player: Player): ItemHintedEvent | ChatEvent | null {
    const match = text.match(HINT_PATTERN);
    if (match) {
        const item = match[1];
        return {
            type: "itemHinted",
            timestamp: Date.now(),
            player: player.name,
            item: item
        };
    }
    return {
        type: "chat",
        timestamp: Date.now(),
        player: player.name,
        message: text
    };
}

export function parseCountdownEvent(_text: string, value: number): CountdownEvent {
    return {
        type: "countdown",
        timestamp: Date.now(),
        value: value
    };
}

export function parseServerChatEvent(message: string): ServerChatEvent {
    return {
        type: "serverChat",
        timestamp: Date.now(),
        message: message
    };
}

export function dumpArchipelagoObjects(obj: Object): Object {
    // The special casing of Player and Item are currently unused,
    // since our APEvents are not retaining the archipelago.js objects.
    if (obj instanceof Player) {
        return {
            slot: obj.slot,
            name: obj.name,
            team: obj.team,
            alias: obj.alias,
        };
    } else if (obj instanceof Item) {
        return {
            receiver: obj.receiver,
            sender: obj.sender,
            item: obj.name,
            id: obj.id,
            game: obj.game,
            flags: {
                bits: obj.flags,
                progression: obj.progression,
                useful: obj.useful,
                trap: obj.trap,
                filler: obj.filler,
            },
            location: {
                name: obj.locationName,
                id: obj.locationId,
                game: obj.locationGame,
            }
        };
    } else {
        return obj;
    }
}
