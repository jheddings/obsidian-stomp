import { LogLevel } from "obskit";

/**
 * Represents a key binding for a command.
 */
export interface KeyBinding {
    commandId: string;
    key: string | null;
}

/**
 * Settings for page scroll behavior.
 */
export interface PageScrollSettings {
    scrollAmount: number;
    scrollDuration: number;
}

/**
 * Settings for section scroll behavior.
 */
export interface SectionScrollSettings {
    scrollDuration: number;
    edgeInset: number;

    stopAtH1: boolean;
    stopAtH2: boolean;
    stopAtHR: boolean;

    stopAtCustom: string[];
}

/**
 * Settings for auto scroll behavior.
 */
export interface AutoScrollSettings {
    scrollSpeed: number;
}

/**
 * Main plugin settings structure.
 */
export interface StompPluginSettings {
    commandBindings: KeyBinding[];
    pageScrollSettings: PageScrollSettings;
    quickScrollSettings: PageScrollSettings;
    sectionScrollSettings: SectionScrollSettings;
    autoScrollSettings: AutoScrollSettings;
    logLevel: LogLevel;
}

/**
 * Gets the key binding for a command ID.
 * @returns The key binding or undefined.
 */
export function getCommandBinding(
    settings: StompPluginSettings,
    commandId: string
): KeyBinding | undefined {
    return settings.commandBindings.find((binding) => binding.commandId === commandId);
}

/**
 * Sets the key binding for a command ID.
 */
export function setCommandBinding(
    settings: StompPluginSettings,
    commandId: string,
    key: string | null
): void {
    const existingBinding = settings.commandBindings.find(
        (binding) => binding.commandId === commandId
    );
    if (existingBinding) {
        existingBinding.key = key;
    } else {
        settings.commandBindings.push({ commandId, key });
    }
}

/**
 * Finds a key binding by key value.
 * @returns The key binding or undefined.
 */
export function findBindingByKey(
    settings: StompPluginSettings,
    key: string
): KeyBinding | undefined {
    const binding = settings.commandBindings.find((binding) => binding.key === key);

    if (binding && binding.commandId) {
        return binding;
    }

    return undefined;
}
