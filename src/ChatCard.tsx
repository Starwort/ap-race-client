import {Send} from "@suid/icons-material";
import {Box, Button, Card, CardActions, CardContent, TextField, Typography} from "@suid/material";
import {MessageNode} from "archipelago.js";
import {createEffect, createSignal, For} from "solid-js";
import styles from "./MainAppWidgets.module.css";

export default function ChatCard(props: {
    chatLog: MessageNode[][];
    sendMessage: (msg: string) => void;
}) {
    let chatBoxRef!: HTMLDivElement;
    createEffect(() => {
        const _ = props.chatLog;
        chatBoxRef.lastElementChild?.scrollIntoView();
    });
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
            <Typography variant="subtitle1">
                Chat
            </Typography>
            <Box sx={{display: "flex", flexDirection: "column", width: "100%", maxHeight: "40vh", flexGrow: 1, flexShrink: 1, overflowY: "auto"}} ref={chatBoxRef} class={styles[props.themeColour]}>
                <For each={props.chatLog}>{message => (
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