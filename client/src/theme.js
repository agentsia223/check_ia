import { createTheme } from "@mui/material/styles";

/**
 * CHECK-IA Material UI theme.
 *
 * Maps the brand design system (navy #28348a + green #39a935, Barlow type,
 * soft radii, navy-tinted elevation) onto MUI so every Material component
 * inherits the brand without per-component overrides.
 */

const navy = {
  50: "#eceefb",
  100: "#d6daf4",
  200: "#aeb6e8",
  300: "#818cd6",
  400: "#5965bf",
  500: "#3a47a6",
  600: "#28348a", // core brand navy
  700: "#212c74",
  800: "#1a2359",
  900: "#131941",
};

const green = {
  50: "#edf8ec",
  100: "#d4efd2",
  200: "#a9dfa6",
  400: "#52ba4d",
  500: "#39a935", // core brand green
  600: "#2f8c2c",
  700: "#276f25",
};

const slate = {
  0: "#ffffff",
  50: "#f7f8fb",
  100: "#eef0f5",
  200: "#e0e3ec",
  300: "#c7ccda",
  400: "#a3aabf",
  500: "#7c8398",
  600: "#5b6175",
  700: "#434860",
  800: "#2c3047",
  900: "#1a1d2e",
};

// Cool, navy-tinted shadows (never pure black) — applied to MUI's elevation array.
const shadow = (a, b) => `${a}, ${b}`;
const SH = {
  xs: "0 1px 2px rgba(19, 25, 65, 0.06)",
  sm: shadow("0 1px 3px rgba(19, 25, 65, 0.08)", "0 1px 2px rgba(19, 25, 65, 0.05)"),
  md: shadow("0 4px 12px rgba(19, 25, 65, 0.10)", "0 2px 4px rgba(19, 25, 65, 0.06)"),
  lg: shadow("0 12px 28px rgba(19, 25, 65, 0.14)", "0 4px 10px rgba(19, 25, 65, 0.07)"),
  xl: "0 24px 56px rgba(19, 25, 65, 0.18)",
};

// MUI expects exactly 25 entries in the shadows array (index 0 = "none").
const shadows = [
  "none",
  SH.xs, SH.sm, SH.sm, SH.md, SH.md, SH.md, SH.md,
  SH.lg, SH.lg, SH.lg, SH.lg, SH.lg, SH.lg, SH.lg, SH.lg,
  SH.xl, SH.xl, SH.xl, SH.xl, SH.xl, SH.xl, SH.xl, SH.xl, SH.xl,
];

const fontBody = '"Barlow", system-ui, -apple-system, "Segoe UI", sans-serif';
const fontDisplay = '"Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif';

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      light: navy[500],
      main: navy[600],
      dark: navy[700],
      contrastText: "#ffffff",
    },
    secondary: {
      light: green[400],
      main: green[500],
      dark: green[600],
      contrastText: "#ffffff",
    },
    success: { light: green[400], main: green[600], dark: green[700], contrastText: "#fff" },
    error: { light: "#e5483d", main: "#d92d20", dark: "#b42318", contrastText: "#fff" },
    warning: { light: "#f6cd8d", main: "#e8870a", dark: "#97540a", contrastText: "#fff" },
    info: { light: navy[400], main: navy[600], dark: navy[700], contrastText: "#fff" },
    background: {
      default: slate[50],
      paper: slate[0],
    },
    text: {
      primary: navy[900],
      secondary: slate[600],
      disabled: slate[400],
    },
    divider: slate[200],
    grey: {
      50: slate[50], 100: slate[100], 200: slate[200], 300: slate[300],
      400: slate[400], 500: slate[500], 600: slate[600], 700: slate[700],
      800: slate[800], 900: slate[900],
    },
  },

  shape: {
    borderRadius: 12,
  },

  shadows,

  typography: {
    fontFamily: fontBody,
    fontSize: 16,
    htmlFontSize: 16,
    h1: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.08 },
    h2: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.12 },
    h3: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.18 },
    h4: { fontFamily: fontDisplay, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.2 },
    h5: { fontFamily: fontDisplay, fontWeight: 600, lineHeight: 1.25 },
    h6: { fontFamily: fontDisplay, fontWeight: 600, lineHeight: 1.3 },
    subtitle1: { fontFamily: fontBody, fontWeight: 600 },
    subtitle2: { fontFamily: fontBody, fontWeight: 600 },
    body1: { fontFamily: fontBody, fontSize: "1.0625rem", lineHeight: 1.6 }, // 17px
    body2: { fontFamily: fontBody, lineHeight: 1.55 },
    button: { fontFamily: fontBody, fontWeight: 600, textTransform: "none", letterSpacing: "0.005em" },
    caption: { fontFamily: fontBody },
    overline: { fontFamily: fontBody, fontWeight: 600, letterSpacing: "0.08em" },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: slate[50],
          color: slate[800],
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: false },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          fontWeight: 600,
          paddingTop: 9,
          paddingBottom: 9,
        },
        sizeLarge: { minHeight: 52, fontSize: "1.0625rem", paddingLeft: 26, paddingRight: 26 },
        sizeMedium: { minHeight: 44 },
        containedPrimary: { boxShadow: SH.xs, "&:hover": { boxShadow: SH.md } },
        containedSecondary: { boxShadow: SH.xs, "&:hover": { boxShadow: SH.md } },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${slate[200]}`,
          boxShadow: SH.sm,
          backgroundImage: "none",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
        outlined: { borderColor: slate[200] },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: slate[300] },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: navy[400] },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: navy[600], borderWidth: 1.5 },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { "&.Mui-focused": { color: navy[600] } },
      },
    },

    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },

    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, fontSize: "0.95rem" },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: navy[800], fontSize: "0.8rem", borderRadius: 8 },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: { color: navy[600], textUnderlineOffset: 3 },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

export default theme;
