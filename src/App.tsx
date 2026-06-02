import {DarkMode, LightMode} from '@suid/icons-material';
import {AppBar, createPalette, createTheme, CssBaseline, IconButton, ThemeProvider, Toolbar, Typography} from '@suid/material';
import {createEffect, createMemo, createSignal, Show, type Component} from 'solid-js';
import MainAppWidgets from './MainAppWidgets';


const App: Component = () => {
    const [themeColour, setThemeColour] = createSignal<"dark" | "light">(
        window.localStorage.theme === "light" ? "light" : "dark"
    );
    createEffect(() => {
        window.localStorage.theme = themeColour();
    });
    const palette = createMemo(() =>
        createPalette({
            mode: themeColour(),
            primary: {
                main: themeColour() == "dark" ? "#bb86fc" : "#6200ee",
            },
            secondary: {
                main: "#03dac6",
            },
        })
    );
    const theme = createTheme({palette});
    return <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar>
            <Toolbar>
                <Typography variant="h5" component="h1" sx={{flexGrow: 1}}>
                    Archipelago Race Client
                </Typography>
                <IconButton
                    edge="end"
                    color="inherit"
                    onClick={() => setThemeColour(
                        themeColour =>
                            themeColour == "dark"
                                ? "light"
                                : "dark"
                    )}
                >
                    <Show when={themeColour() == "dark"} fallback={<DarkMode />}>
                        <LightMode />
                    </Show>
                </IconButton>
            </Toolbar>
        </AppBar>
        <Toolbar />
        <MainAppWidgets themeColour={themeColour()} />
    </ThemeProvider>;
};

export default App;
