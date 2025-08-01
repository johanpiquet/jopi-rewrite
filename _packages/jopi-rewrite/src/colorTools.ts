export function terminalColor(text: string, color: ColorCode) {
    return color + text + TERMINAL_RESET;
}

export const TERMINAL_RESET = "\x1b[0m";

export type ColorCode = string;

export const TERMINAL_DEFAULT: ColorCode = "\x1b[39m";
export const TERMINAL_DEFAULT_BACKGROUND: ColorCode = "\x1b[49m";

export const TERMINAL_RED: ColorCode = "\x1b[31m";
export const TERMINAL_GREEN: ColorCode = "\x1b[32m";
export const TERMINAL_YELLOW: ColorCode = "\x1b[33m";
export const TERMINAL_BLUE: ColorCode = "\x1b[34m";
export const TERMINAL_MAGENTA: ColorCode = "\x1b[35m";
export const TERMINAL_CYAN: ColorCode = "\x1b[36m";
export const TERMINAL_WHITE: ColorCode = "\x1b[37m";
export const TERMINAL_BLACK: ColorCode = "\x1b[30m";
export const TERMINAL_BRIGHT: ColorCode = "\x1b[1m";

export const TERMINAL_DIM: ColorCode = "\x1b[2m";
export const TERMINAL_UNDERLINE: ColorCode = "\x1b[4m";
export const TERMINAL_BLINK: ColorCode = "\x1b[5m";
export const TERMINAL_REVERSE: ColorCode = "\x1b[7m";
export const TERMINAL_HIDDEN: ColorCode = "\x1b[8m";

export const TERMINAL_BLACK_BACKGROUND: ColorCode = "\x1b[40m";
export const TERMINAL_RED_BACKGROUND: ColorCode = "\x1b[41m";
export const TERMINAL_GREEN_BACKGROUND: ColorCode = "\x1b[42m";
export const TERMINAL_YELLOW_BACKGROUND: ColorCode = "\x1b[43m";
export const TERMINAL_BLUE_BACKGROUND: ColorCode = "\x1b[44m";
export const TERMINAL_MAGENTA_BACKGROUND: ColorCode = "\x1b[45m";
export const TERMINAL_CYAN_BACKGROUND: ColorCode = "\x1b[46m";
export const TERMINAL_WHITE_BACKGROUND: ColorCode = "\x1b[47m";

export const TERMINAL_BRIGHT_BLACK: ColorCode = "\x1b[90m";
export const TERMINAL_BRIGHT_RED: ColorCode = "\x1b[91m";
export const TERMINAL_BRIGHT_GREEN: ColorCode = "\x1b[92m";
export const TERMINAL_BRIGHT_YELLOW: ColorCode = "\x1b[93m";
export const TERMINAL_BRIGHT_BLUE: ColorCode = "\x1b[94m";
export const TERMINAL_BRIGHT_MAGENTA: ColorCode = "\x1b[95m";
export const TERMINAL_BRIGHT_CYAN: ColorCode = "\x1b[96m";
export const TERMINAL_BRIGHT_WHITE: ColorCode = "\x1b[97m";
export const TERMINAL_BRIGHT_DEFAULT: ColorCode = "\x1b[39m";

export const TERMINAL_BRIGHT_BLACK_BACKGROUND: ColorCode = "\x1b[100m";
export const TERMINAL_BRIGHT_RED_BACKGROUND: ColorCode = "\x1b[101m";
export const TERMINAL_BRIGHT_GREEN_BACKGROUND: ColorCode = "\x1b[102m";
export const TERMINAL_BRIGHT_YELLOW_BACKGROUND: ColorCode = "\x1b[103m";
export const TERMINAL_BRIGHT_BLUE_BACKGROUND: ColorCode = "\x1b[104m";
export const TERMINAL_BRIGHT_MAGENTA_BACKGROUND: ColorCode = "\x1b[105m";
export const TERMINAL_BRIGHT_CYAN_BACKGROUND: ColorCode = "\x1b[106m";
export const TERMINAL_BRIGHT_WHITE_BACKGROUND: ColorCode = "\x1b[107m";
export const TERMINAL_BRIGHT_DEFAULT_BACKGROUND: ColorCode = "\x1b[109m";
export const TERMINAL_BRIGHT_BLACK_BRIGHT_BACKGROUND: ColorCode = "\x1b[100m";
export const TERMINAL_BRIGHT_RED_BRIGHT_BACKGROUND: ColorCode = "\x1b[101m";
export const TERMINAL_BRIGHT_GREEN_BRIGHT_BACKGROUND: ColorCode = "\x1b[102m";
export const TERMINAL_BRIGHT_YELLOW_BRIGHT_BACKGROUND: ColorCode = "\x1b[103m";