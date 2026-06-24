import {Add} from "@suid/icons-material";
import {Box, Button, Card, CardContent, FormControlLabel, IconButton, Switch, TextField, Typography} from "@suid/material";
import {Client, ColorMessageNode, MessageNode, PlayerMessageNode, TextualMessageNode} from "archipelago.js";
import {createSignal, For, Setter, Show, Signal} from "solid-js";
import ChatCard from "./ChatCard";

interface ConnectionData {
    identifier: string;
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
    }
}

function newConnection(identifier: string, writeMessage: (message: MessageNode[]) => void): ConnectionData {
    const client = new Client();
    client.connectionId = identifier;
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
    client.messages.on("message", (_, message) => writeMessage([
        new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(new Date())}]`}),
        new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
        ...message
    ]));
    client.deathLink.on("deathReceived", (source, time, cause) => {
        if (cause) {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
                new ColorMessageNode(client, {type: "color", text: cause, color: "red"}),
            ]);
        } else {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: ` [${client.connectionId}] `}),
                new PlayerMessageNode(client, {type: "player_name", text: source}),
                new ColorMessageNode(client, {type: "color", text: " died!", color: "red"}),
            ]);
        }
    });
    return {
        identifier,
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
    return <Card variant="elevation">
        <CardContent sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1
        }}>
            <TextField
                variant="outlined"
                size="small"
                label="Connection identifier"
                value={props.connection.identifier}
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
            <FormControlLabel disabled control={<Switch />} label="Connect as game" />
            <Show when={props.connection.connectionState}>{state => (
                <Typography color={props.connection.isError ? "error" : undefined}>
                    {state()}
                </Typography>
            )}</Show>
            <Box sx={{
                display: "flex",
                flexDirection: "row-reverse",
                justifyContent: "end"
            }}>
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
            </Box>
        </CardContent>
    </Card>;
}


export default function MainAppWidgets(props: {themeColour: "light" | "dark";}) {
    const [chatLog, setChatLog] = createSignal<MessageNode[][]>([]);
    const writeMessage = (message: MessageNode[]) => setChatLog(chatLog => [...chatLog, message]);
    const [connections, setConnections] = createSignal([createSignal(newConnection("Connection 1", writeMessage))]);
    const [connectionId, setConnectionId] = createSignal(1);
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
                    createSignal(newConnection(`Connection ${setConnectionId(id => ++id)}`, writeMessage)),
                ]);
            }}>
                <Add />
            </IconButton>
            <Box sx={{flexGrow: 1, minWidth: "8px"}} />
        </Box>
        <ChatCard themeColour={props.themeColour} chatLog={chatLog()} sendMessage={msg => {
            for (const [connection, _] of connections()) {
                const data = connection();
                if (data.isConnected) {
                    data.client.messages.say(msg).catch(failed => {
                        writeMessage([{type: "text", text: `${data.identifier} failed to send: ${failed}`} as any]);
                    });
                } else {
                    writeMessage([{type: "text", text: `${data.identifier} failed to send: is not connected`} as any]);
                }
            }
        }} />
    </Box>;
}
