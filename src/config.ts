import { LogLevel } from "./logger";

export interface KeyBinding {
    commandId: string;
    key: string | null;
}

export interface StompPluginSettings {
    logLevel: LogLevel;
    pageScrollDuration: number;
    pageScrollAmount: number;
    commandBindings: KeyBinding[];
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
    return settings.commandBindings.find((binding) => binding.key === key);
}
