import { LogLevel } from "./logger";

export interface KeyBinding {
    commandId: string;
    key: string | null;
}

export interface PageScrollSettings {
    scrollAmount: number;
    scrollDuration: number;
}

export interface SectionScrollSettings {
    scrollDuration: number;

    stopAtH1: boolean;
    stopAtH2: boolean;
    stopAtHR: boolean;

    stopAtCustom: string[];
}

export interface StompPluginSettings {
    commandBindings: KeyBinding[];
    pageScrollSettings: PageScrollSettings;
    sectionScrollSettings: SectionScrollSettings;
    logLevel: LogLevel;
}

export function getCommandBinding(
    settings: StompPluginSettings,
    commandId: string
): KeyBinding | undefined {
    return settings.commandBindings.find((binding) => binding.commandId === commandId);
}

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
