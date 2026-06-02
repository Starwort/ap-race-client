import {Add} from "@suid/icons-material";
import {Box, Button, Card, CardContent, FormControlLabel, IconButton, Switch, TextField, Typography} from "@suid/material";
import {Client, ColorMessageNode, MessageNode, PlayerMessageNode, TextualMessageNode} from "archipelago.js";
import {Accessor, createEffect, createSignal, For, Setter, Show} from "solid-js";
import styles from "./MainAppWidgets.module.css";

interface ConnectionData {
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
        connectionNo: Accessor<number>;
    }
}

function newConnection(setChatLog: Setter<MessageNode[][]>): ConnectionData {
    const writeMessage = (message: MessageNode[]) => setChatLog(chatLog => [...chatLog, message]);
    const client = new Client();
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
    client.deathLink.on("deathReceived", (source, time, cause) => {
        if (cause) {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: `[Connection ${client.connectionNo() + 1}]`}),
                new ColorMessageNode(client, {type: "color", text: cause, color: "red"}),
            ]);
        } else {
            writeMessage([
                new TextualMessageNode(client, {type: "text", text: `[${timeFormatter.format(time)}]`}),
                new TextualMessageNode(client, {type: "text", text: `[Connection ${client.connectionNo() + 1}]`}),
                new PlayerMessageNode(client, {type: "player_name", text: source}),
                new ColorMessageNode(client, {type: "color", text: " died!", color: "red"}),
            ]);
        }
    });
    return {
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

export default function MainAppWidgets(props: {themeColour: "light" | "dark";}) {
    const [chatLog, setChatLog] = createSignal<MessageNode[][]>([]);
    const [connections, setConnections] = createSignal([createSignal(newConnection(setChatLog))]);
    let chatBoxRef!: HTMLDivElement;
    createEffect(() => {
        const _ = chatLog();
        chatBoxRef.lastElementChild?.scrollIntoView();
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
                <Card variant="elevation">
                    {/* <CardHeader subheader= /> */}
                    <CardContent sx={{display: "flex", flexDirection: "column", gap: 1}}>
                        <Typography variant="subtitle1">
                            {`Connection ${index() + 1}`}
                        </Typography>
                        <TextField
                            variant="outlined"
                            disabled={connection().isConnected}
                            size="small"
                            label="Server address"
                            value={connection().server}
                            onChange={event => setConnection(connection => ({...connection, server: event.target.value}))}
                        />
                        <TextField
                            variant="outlined"
                            disabled={connection().isConnected}
                            size="small"
                            label="Slot name"
                            value={connection().slotName}
                            onChange={event => setConnection(connection => ({...connection, slotName: event.target.value}))}
                        />
                        <TextField
                            variant="outlined"
                            disabled={connection().isConnected}
                            size="small"
                            label="Server password"
                            value={connection().password}
                            onChange={event => setConnection(connection => ({...connection, password: event.target.value}))}
                        />
                        <FormControlLabel disabled control={<Switch />} label="Connect as game" />
                        <Show when={connection().connectionState}>{state => <Typography color={
                            connection().isError ? "error" : undefined
                        }>
                            {state()}
                        </Typography>}</Show>
                        <Box sx={{display: "flex", flexDirection: "row-reverse", justifyContent: "end"}}>
                            <Button
                                disabled={connection().connectionState == "Connecting..."}
                                onClick={
                                    connection().isConnected
                                        ? () => {
                                            connection().client.socket.disconnect();
                                            setConnection(connection => ({...connection, isConnected: false}));
                                        }
                                        : async () => {
                                            setConnection(connection => ({
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
                                                isError,
                                            } = connection();
                                            try {
                                                await client.login(server, slotName, shouldConnectAsGame ? "APRaceClient" : undefined, {
                                                    password,
                                                    tags: ["DeathLink", "APRaceClient"],
                                                });
                                                setConnection(connection => ({
                                                    ...connection,
                                                    connectionState: "",
                                                }));
                                            } catch (error) {
                                                setConnection(connection => ({
                                                    ...connection,
                                                    isConnected: false,
                                                    connectionState: "" + error,
                                                    isError: true,
                                                }));
                                            }
                                        }
                                }>
                                <Show when={connection().isConnected} fallback="Connect">Disconnect</Show>
                            </Button>
                            <Button color="error" disabled={connection().isConnected} onClick={() => setConnections(connections => connections.filter((_, i) => i != index()))}>
                                Remove
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}</For>
            <IconButton onClick={() => {
                setConnections(connections => [
                    ...connections,
                    createSignal(newConnection(setChatLog)),
                ]);
            }}>
                <Add />
            </IconButton>
            <Box sx={{flexGrow: 1, minWidth: "8px"}} />
        </Box>
        <Card variant="elevation" sx={{flexGrow: 1}}>
            <CardContent sx={{display: "flex", flexDirection: "column", gap: 1, height: "100%"}}>
                <Typography variant="subtitle1">
                    Chat
                </Typography>
                <Box sx={{width: "100%", height: "100%", overflowY: "auto"}} ref={chatBoxRef} class={styles[props.themeColour]}>
                    <For each={chatLog()}>{message => (
                        <span>
                            <For each={message}>{node => (
                                <span classList={{
                                    [styles.progression]: node.item?.progression,
                                    [styles.useful]: node.item?.useful,
                                    [styles.trap]: node.item?.trap,
                                    [styles.filler]: node.item?.filler,
                                    [styles.location]: node.type == "location",
                                    [styles[node.color]]: node.type == "color",
                                    [styles.player]: node.type == "player",
                                }}>
                                    {node.text}
                                </span>
                            )}</For>
                        </span>
                    )}</For>
                </Box>
            </CardContent>
        </Card>
    </Box>;
}