import {ContentCopy, DeleteForever, Download, Send} from "@suid/icons-material";
import {Box, Button, ButtonGroup, Card, CardActions, CardContent, FormControlLabel, Switch, TextField, Typography} from "@suid/material";
import {MessageNode} from "archipelago.js";
import {createEffect, createSignal, For} from "solid-js";
import styles from "./MainAppWidgets.module.css";
import {APEvent, dumpArchipelagoObjects} from "./APEvents";

function downloadString(text: string, fileType: string, fileName: string) {
    var blob = new Blob([text], {type: fileType});

    var a = document.createElement('a');
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {URL.revokeObjectURL(a.href);}, 1500);
}

export default function ChatCard(props: {
    chatLog: [MessageNode[], string?][];
    apEventsBySource: {[key: string]: APEvent[];};
    resetApEventsBySource: () => void;
    sendMessage: (msg: string) => void;
    themeColour: "light" | "dark";
}) {
    let chatBoxRef!: HTMLDivElement;
    const [autoScroll, setAutoScroll] = createSignal(true);
    createEffect(() => {
        const _ = props.chatLog;
        if (autoScroll()) {
            chatBoxRef.lastElementChild?.scrollIntoView();
        }
    });
    const dumpAPEvents = () => JSON.stringify(
        props.apEventsBySource,
        (k, v) => k == 'client' ? undefined : dumpArchipelagoObjects(v)
    );
    const [currentChatMsg, setCurrentChatMsg] = createSignal("");
    const [chatHistory, setChatHistory] = createSignal<string[]>([]);
    const [chatHistoryIdx, setChatHistoryIdx] = createSignal(0);
    const sendChatMsg = () => {
        if (currentChatMsg()) {
            props.sendMessage(currentChatMsg());
            setChatHistoryIdx(setChatHistory(history => [...history, currentChatMsg()]).length);
            setCurrentChatMsg("");
        }
    };
    return <Card variant="elevation" sx={{display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0}}>
        <CardContent sx={{display: "flex", flexDirection: "column", gap: 1, flexGrow: 1, minHeight: 0}}>
            <Box sx={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", mt: -1}}>
                <Typography variant="subtitle1">
                    Chat
                </Typography>
                <Box sx={{display: "flex", flexDirection: "row", gap: 1, alignItems: "center"}}>
                    <Typography variant="subtitle1">
                        JSON:
                    </Typography>
                    <ButtonGroup>
                        <Button title="Clear JSON data" onClick={props.resetApEventsBySource} color="error">
                            <DeleteForever />
                        </Button>
                        <Button
                            title="Copy as JSON"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    dumpAPEvents()
                                );
                            }}
                            variant="contained"
                        >
                            <ContentCopy />
                        </Button>
                        <Button
                            title="Download as JSON"
                            onClick={() => {
                                downloadString(
                                    dumpAPEvents(),
                                    "application/json",
                                    "chat.json",
                                );
                            }}
                            variant="contained"
                        >
                            <Download />
                        </Button>
                    </ButtonGroup>
                </Box>
                <FormControlLabel
                    sx={{mr: 0}}
                    checked={autoScroll()}
                    onChange={() => setAutoScroll(val => !val)}
                    control={<Switch />}
                    label="Automatically scroll to reveal new messages"
                />
            </Box>
            <Box sx={{display: "flex", flexDirection: "column", width: "100%", maxHeight: "40vh", flexGrow: 1, flexShrink: 1, overflowY: "auto"}} ref={chatBoxRef} class={styles[props.themeColour]}>
                <For each={props.chatLog}>{([message, colour]) => (
                    <span style={colour ? {color: colour} : undefined}>
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
        <CardActions sx={{
            display: "flex", flexDirection: "row", gap: 1
        }}>
            <TextField
                variant="outlined"
                size="small"
                value={currentChatMsg()}
                sx={{flexGrow: 1}}
                onChange={event => setCurrentChatMsg(event.target.value)}
                onKeyDown={event => {
                    if (event.shiftKey || event.ctrlKey || event.altKey) {
                        return;
                    }
                    switch (event.key) {
                        case "ArrowUp":
                            if (chatHistoryIdx() > 0) {
                                setCurrentChatMsg(chatHistory()[setChatHistoryIdx(idx => --idx)]);
                            }
                            break;
                        case "ArrowDown":
                            if (chatHistoryIdx() < chatHistory.length) {
                                setCurrentChatMsg(chatHistory()[setChatHistoryIdx(idx => ++idx)]);
                            }
                            break;
                        case "Enter":
                            sendChatMsg();
                            break;
                    }
                }}
            />
            <Button variant="contained" sx={{height: "100%"}} startIcon={<Send />} onClick={sendChatMsg}>Send</Button>
        </CardActions>
    </Card>;
}