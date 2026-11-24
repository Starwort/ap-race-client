import {Add} from "@suid/icons-material";
import {Box, Button, Card, CardActions, CardContent, FormControlLabel, IconButton, Switch, TextField, Typography} from "@suid/material";
import {Client, ColorMessageNode, Item, MessageNode, Player, PlayerMessageNode, TextualMessageNode} from "archipelago.js";
import {createSignal, onCleanup, For, Setter, Show, Signal} from "solid-js";
import ChatCard from "./ChatCard";
import {APEvent, parseAPEventFromChat, parseCountdownEvent, parseGoalEvent, parseItemSentEvent, parseServerChatEvent} from "./APEvents";

interface ConnectionData {
    identifier: string;
    colour: string;
    server: string;
    slotName: string;
    password: string;
    shouldConnectAsGame: boolean;
    client: Client;
    isConnected: boolean;
    connectionState: string;
    isError: boolean;
}

declare module "archipelago.js" {
    interface Client {
        connectionId: string;
        connectionColour: string;
    }
}

type MessageHandler = (message: MessageNode[], connectionId: string, colour?: string) => void;
type APEventHandler = (event: APEvent, connectionId: string) => void;

function newConnection(identifier: string, writeMessage: MessageHandler, handleAPEvent: APEventHandler): ConnectionData {
    const client = new Client();
    client.connectionId = identifier;
    client.connectionColour = "white";
    const timeFormatter = new Intl.DateTimeFormat(
        "en-GB",
        {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            fractionalSecondDigits: 3,
            timeZone: "UTC",
            timeZoneName: "short",
            hour12: false,
        },
    );
    // The ItemManager only sends events for the slot you're connected to, so it doesn't work for our case.
    // client.items.on("itemsReceived", (...args) => console.log("itemsReceived", args));
    // Same for itemHinted in MessageManager. Have to scrape the raw messages instead.
    // client.messages.on("itemHinted", (...args) => console.log("itemHinted", args));
    client.messages.on("goaled", (_text: string, player: Player, _nodes: MessageNode[]) =>
        handleAPEvent(parseGoalEvent(_text, player, _nodes), client.connectionId));

    client.messages.on("itemSent", (_text: string, item: Item, _nodes: MessageNode[]) =>
        handleAPEvent(parseItemSentEvent(_text, item, _nodes), client.connectionId));

    client.messages.on("chat", (text: string, player: Player, _nodes: MessageNode[]) => {
        const apEvent = parseAPEventFromChat(text, player);
        if (apEvent) {
            handleAPEvent(apEvent, client.connectionId);
        }
    });

    client.messages.on("countdown", (text: string, value: number, _nodes: MessageNode[]) =>
        handleAPEvent(parseCountdownEvent(text, value), client.connectionId));

    client.messages.on("serverChat", (message: string, _nodes: MessageNode[]) =>
        handleAPEvent(parseServerChatEvent(message), client.connectionId));

    client.messages.on("message", (_, message: MessageNode[]) => {
        writeMessage([
            new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(new Date())}]`}),
            new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
            ...message
        ], client.connectionId, client.connectionColour);
    });

    client.deathLink.on("deathReceived", (source: string, time: number, cause?: string) => {
        if (cause) {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
                new ColorMessageNode(client, {type: "color", text: cause, color: "red"}),
            ], client.connectionId, client.connectionColour);
        } else {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
                new PlayerMessageNode(client, {type: "player_name", text: source}),
                new ColorMessageNode(client, {type: "color", text: " died!", color: "red"}),
            ], client.connectionId, client.connectionColour);
        }
    });

    return {
        identifier,
        colour: "white",
        server: "",
        slotName: "",
        password: "",
        shouldConnectAsGame: false,
        client,
        isConnected: false,
        connectionState: "",
        isError: false,
    };
}


function ConnectionCard(props: {
    index: number;
    connection: ConnectionData;
    setConnection: Setter<ConnectionData>;
    setConnections: Setter<Signal<ConnectionData>[]>;
}) {
    return <Card variant="elevation" sx={{flexShrink: 0}}>
        <CardContent sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
        }}>
            <TextField
                variant="outlined"
                size="small"
                label="Connection identifier"
                value={props.connection.identifier}
                InputProps={{sx: {color: props.connection.colour}}}
                onChange={event => {
                    props.setConnection(connection => ({
                        ...connection,
                        identifier: event.target.value
                    })).client.connectionId = event.target.value;
                }}
            />
            <TextField
                variant="outlined"
                disabled={props.connection.isConnected}
                size="small"
                label="Server address"
                value={props.connection.server}
                onChange={event => props.setConnection(connection => ({
                    ...connection,
                    server: event.target.value
                }))}
            />
            <TextField
                variant="outlined"
                disabled={props.connection.isConnected}
                size="small"
                label="Slot name"
                value={props.connection.slotName}
                onChange={event => props.setConnection(connection => ({
                    ...connection,
                    slotName: event.target.value
                }))}
            />
            <TextField
                variant="outlined"
                disabled={props.connection.isConnected}
                size="small"
                label="Server password"
                value={props.connection.password}
                onChange={event => props.setConnection(connection => ({
                    ...connection,
                    password: event.target.value
                }))}
            />
            <Show when={false}>
                <FormControlLabel disabled control={<Switch />} label="Connect as game" />
            </Show>
            <Show when={props.connection.connectionState}>{state => (
                <Typography color={props.connection.isError ? "error" : undefined}>
                    {state()}
                </Typography>
            )}</Show>
        </CardContent>
        <CardActions sx={{mt: -1, flexDirection: "row-reverse", justifyContent: "end"}}>
            <Button
                disabled={props.connection.connectionState == "Connecting..."}
                onClick={props.connection.isConnected ? () => {
                    props.connection.client.socket.disconnect();
                    props.setConnection(connection => ({
                        ...connection,
                        isConnected: false
                    }));
                } : async () => {
                    props.setConnection(connection => ({
                        ...connection,
                        isConnected: true,
                        connectionState: "Connecting...",
                        isError: false
                    }));
                    const {
                        server,
                        slotName,
                        password,
                        shouldConnectAsGame,
                        client,
                        isConnected,
                        connectionState,
                        isError
                    } = props.connection;

                    try {
                        await client.login(server, slotName, shouldConnectAsGame ? "APRaceClient" : undefined, {
                            password,
                            tags: ["DeathLink", "APRaceClient"]
                        });
                        props.setConnection(connection => ({
                            ...connection,
                            connectionState: ""
                        }));
                    } catch (error) {
                        props.setConnection(connection => ({
                            ...connection,
                            isConnected: false,
                            connectionState: "" + error,
                            isError: true
                        }));
                    }
                }}
            >
                <Show when={props.connection.isConnected} fallback="Connect">Disconnect</Show>
            </Button>
            <Button
                color="error"
                disabled={props.connection.isConnected}
                onClick={() => props.setConnections(
                    connections => connections.filter((_, i) => i != props.index)
                )}
            >
                Remove
            </Button>
            <Button
                sx={{height: "calc(0.875rem * 1.75 + 12px)"}}
                component="input"
                type="color"
                value={props.connection.colour}
                onChange={event => {
                    props.setConnection(
                        connection => ({...connection, colour: event.target.value})
                    ).client.connectionColour = event.target.value;
                }} />
        </CardActions>
    </Card>;
}


export default function MainAppWidgets(props: {themeColour: "light" | "dark";}) {
    const [chatLog, setChatLog] = createSignal<[MessageNode[], string?][]>([]);
    const [apEventsBySource, setApEventsBySource] = createSignal<{[key: string]: APEvent[];}>({});
    const writeMessage = (message: MessageNode[], connectionId: string, colour?: string) => {
        setChatLog(chatLog => [...chatLog, [message, colour]]);
    };
    const handleAPEvent = (event: APEvent, connectionId: string) => {
        setApEventsBySource(
            events => ({
                ...events,
                [connectionId]: [...(events[connectionId] ?? []), event]
            })
        )
    };
    const [connections, setConnections] = createSignal([createSignal(newConnection("Connection 1", writeMessage, handleAPEvent))]);
    const [, setConnectionId] = createSignal(1);

    // TODO: Replace with onSettled if updating solidjs to 2.0
    onCleanup(() => {
        for (const [connection, _] of connections()) {
            connection().client.socket.disconnect();
        }
    });

    return <Box component="main" sx={{display: "flex", flexDirection: "column", flexGrow: 1, gap: 2, marginY: 2}}>
        <Box sx={{
            display: "flex",
            flexDirection: "row",
            // justifyContent: "center",
            alignItems: "center",
            // paddingX: 2,
            overflowX: "auto",
            gap: 1,
        }}>
            <Box sx={{flexGrow: 1, minWidth: "8px"}} />
            <For each={connections()}>{([connection, setConnection], index) => (
                <ConnectionCard
                    setConnections={setConnections}
                    connection={connection()}
                    setConnection={setConnection}
                    index={index()}
                />
            )}</For>
            <IconButton onClick={() => {
                setConnections(connections => [
                    ...connections,
                    createSignal(newConnection(`Connection ${setConnectionId(id => ++id)}`, writeMessage, handleAPEvent)),
                ]);
            }}>
                <Add />
            </IconButton>
            <Box sx={{flexGrow: 1, minWidth: "8px"}} />
        </Box>
        <ChatCard
            themeColour={props.themeColour}
            chatLog={chatLog()}
            apEventsBySource={apEventsBySource()}
            resetApEventsBySource={() => setApEventsBySource({})}
            sendMessage={msg => {
                for (const [connection, _] of connections()) {
                    const data = connection();
                    if (data.isConnected) {
                        data.client.messages.say(msg).catch(failed => {
                            writeMessage([{type: "text", text: `${data.identifier} failed to send: ${failed}`} as any], "Race Client Console", "red");
                        });
                    } else {
                        writeMessage([{type: "text", text: `${data.identifier} failed to send: is not connected`} as any], "Race Client Console", "red");
                    }
                }
            }}
        />
    </Box>;
}
