// theme.ts
import { createTheme } from '@mui/material/styles';

const bg0 = '#0B1220';
const panel = 'rgba(17, 25, 40, 0.65)';
const border = 'rgba(255,255,255,0.08)';
const header = 'rgba(255,255,255,0.04)';
const glowCyan = 'rgba(56, 189, 248, 0.6)';   // cyan-400 glow
const glowViolet = 'rgba(168, 85, 247, 0.55)'; // violet-500 glow

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#22D3EE' },     // cyan-400
    secondary: { main: '#A78BFA' },   // violet-300
    background: {
      default: bg0,
      paper: panel,
    },
    divider: border,
    text: {
      primary: 'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.62)',
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily:
      `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji`,
    h4: { fontWeight: 700, letterSpacing: 0.2 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.3 },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.25)',
    '0 4px 12px rgba(0,0,0,0.35)',
    '0 6px 18px rgba(0,0,0,0.35)',
    ...Array(21).fill('0 8px 30px rgba(0,0,0,0.45)'),
  ] as any,
  transitions: { duration: { shorter: 150, shortest: 120 } },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        :root {
          --panel-bg: ${panel};
          --panel-border: ${border};
          --header-bg: ${header};
          --glow-cyan: ${glowCyan};
          --glow-violet: ${glowViolet};
        }
        html, body, #root { height: 100%; background: ${bg0}; }
        body {
          background-image:
            radial-gradient(1200px 600px at 50% -200px, rgba(59,130,246,0.18), transparent 60%),
            radial-gradient(1000px 500px at 80% 20%, rgba(168,85,247,0.12), transparent 60%),
            radial-gradient(900px 500px at 15% 30%, rgba(56,189,248,0.12), transparent 60%);
          background-attachment: fixed;
        }
        ::selection { background: rgba(56,189,248,0.35); }
        /* Subtle modern scrollbars */
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.25) transparent; }
        *::-webkit-scrollbar { height: 10px; width: 10px; }
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(56,189,248,.35), rgba(168,85,247,.35));
          border-radius: 999px;
        }
      `,
    },

    /* AppBar → translucent/glassy */
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(11,18,32,0.55)',
          borderBottom: `1px solid ${border}`,
        },
      },
    },

    /* Paper panels → glassmorphism */
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
          border: `1px solid ${border}`,
          backdropFilter: 'blur(12px)',
          boxShadow:
            `0 0 0 1px rgba(255,255,255,0.02),
             0 20px 60px rgba(0,0,0,0.45),
             0 0 40px -10px ${glowViolet}`,
          transition: 'transform .15s ease, box-shadow .2s ease, background .2s ease',
        },
      },
    },

    /* Buttons → subtle neon gradient with hover lift */
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform .12s ease, box-shadow .2s ease, background .2s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        contained: {
          background:
            'linear-gradient(135deg, rgba(56,189,248,.25), rgba(168,85,247,.25))',
          boxShadow:
            `0 10px 30px rgba(56,189,248,.15),
             inset 0 0 0 1px rgba(255,255,255,.06)`,
          backdropFilter: 'blur(6px)',
          '&:hover': {
            background:
              'linear-gradient(135deg, rgba(56,189,248,.45), rgba(168,85,247,.45))',
            boxShadow:
              `0 20px 40px rgba(56,189,248,.25),
               0 0 30px -5px rgba(168,85,247,.35)`,
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.16)',
          background: 'rgba(255,255,255,0.03)',
          '&:hover': { borderColor: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.06)' },
        },
      },
    },

    /* Inputs → rounded, dim backgrounds with focus ring */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.04)',
          transition: 'box-shadow .15s ease, background .2s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.16)' },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px rgba(56,189,248,0.22), 0 0 0 6px rgba(168,85,247,0.12)`,
          },
        },
        notchedOutline: { borderColor: 'rgba(255,255,255,0.10)' },
        input: { paddingTop: 12, paddingBottom: 12 },
      },
    },

    /* Dialogs → same glass + border */
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
          border: `1px solid ${border}`,
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700 } } },

    /* DataGrid global polish (class-based) */
    MuiContainer: { styleOverrides: { root: { paddingBottom: 16 } } },
  },
});

export default theme;
