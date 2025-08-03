// engine.ts - handles scroll animation and state for scroll actions

import { Logger } from "./logger";
import { EngineSettings } from "./config";

export enum ScrollDirection {
    UP = -1,
    DOWN = 1,
}

/**
 * Easing function type definition.
 */
type EasingFunction = (t: number) => number;

/**
 * Collection of easing functions for smooth animations.
 */
class EasingFunctions {
    /**
     * Linear easing (no acceleration/deceleration).
     */
    static linear(t: number): number {
        return t;
    }

    /**
     * Ease-in function using quadratic interpolation.
     */
    static easeIn(t: number, factor: number): number {
        if (factor <= 0) return t;
        return Math.pow(t, 1 + factor * 2);
    }

    /**
     * Ease-out function using quadratic interpolation.
     */
    static easeOut(t: number, factor: number): number {
        if (factor <= 0) return t;
        return 1 - Math.pow(1 - t, 1 + factor * 2);
    }

    /**
     * Combined ease-in-out function.
     */
    static easeInOut(t: number, easeInFactor: number, easeOutFactor: number): number {
        if (easeInFactor <= 0 && easeOutFactor <= 0) {
            return t;
        }

        if (t < 0.5) {
            return 0.5 * EasingFunctions.easeIn(t * 2, easeInFactor);
        } else {
            return 0.5 + 0.5 * EasingFunctions.easeOut((t - 0.5) * 2, easeOutFactor);
        }
    }
}

/**
 * Handles scroll animation and state for scroll actions.
 */
export class ScrollEngine {
    private static readonly ANIMATION_FRAME_RATE = 60;
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;

    private logger: Logger = Logger.getLogger("ScrollEngine");
    private animationId: NodeJS.Timeout | null = null;
    private activeElement: HTMLElement | null = null;
    private settings: EngineSettings;

    get isActive(): boolean {
        return this.activeElement !== null && this.animationId !== null;
    }

    /**
     * Updates the easing settings for animations.
     */
    updateSettings(settings: EngineSettings): void {
        this.settings = { ...settings };
    }

    /**
     * Activates the given element for scrolling.
     */
    activate(element: HTMLElement): void {
        if (this.activeElement) {
            this.logger.warn("Existing active element; deactivating");
            this.deactivate();
        }

        this.activeElement = element;

        this.logger.debug(`Activated element: ${element.tagName}#${element.id}`);
    }

    /**
     * Deactivates the current active element.
     */
    deactivate(): void {
        if (!this.activeElement) {
            this.logger.warn("No active element");
            return;
        }

        const elementInfo = `${this.activeElement.tagName}#${this.activeElement.id}`;

        this.activeElement = null;

        this.logger.debug(`Deactivated element: ${elementInfo}`);
    }

    /**
     * Stops any ongoing scroll animation.
     */
    stopAnimation(): void {
        if (this.animationId !== null) {
            clearTimeout(this.animationId);
            this.logger.debug(`Animation stopped [${this.animationId}]`);
            this.animationId = null;
        }
    }

    /**
     * Instantly scrolls to the target position.
     */
    directScroll(targetTop: number) {
        if (!this.activeElement) {
            throw new Error("No active element");
        }

        const currentTop = this.activeElement.scrollTop;
        const clampedTarget = Math.ceil(Math.max(targetTop, 0));

        this.logger.debug(`Scrolling from ${currentTop} to ${clampedTarget}`);

        this.activeElement.scrollTop = clampedTarget;

        const newTop = this.activeElement.scrollTop;

        if (newTop === 0) {
            this.logger.debug("Reached top of document");
        } else if (newTop === currentTop) {
            this.logger.debug("Reached end of document");
        } else {
            this.logger.debug(`Scroll successful: ${currentTop} -> ${newTop}`);
        }
    }

    /**
     * Performs animated scrolling with linear progression (for continuous scrolling).
     */
    async animatedScroll(
        frameInterval: number,
        pixelsPerFrame: number,
        totalFrames: number
    ): Promise<void> {
        return new Promise((resolve) => {
            let currentPosition = this.activeElement.scrollTop;
            let framesProcessed = 0;

            const startTime = performance.now();

            const finalize = (logMessage: string) => {
                const elapsedTime = performance.now() - startTime;
                this.logger.debug(
                    `${logMessage} (${framesProcessed} frames, ${elapsedTime.toFixed(2)}ms)`
                );
                this.animationId = null;
                resolve();
            };

            const animate = () => {
                const previousPosition = this.activeElement.scrollTop;
                const nextPosition = currentPosition + pixelsPerFrame;

                this.logger.debug(
                    `Frame [${this.animationId}] ${currentPosition} to ${nextPosition}`
                );

                currentPosition = nextPosition;
                this.directScroll(currentPosition);

                // check if we've reached a document limit
                const actualPosition = this.activeElement.scrollTop;
                if (actualPosition === previousPosition) {
                    finalize(`Scroll stopped @ ${actualPosition}`);
                    return;
                }

                framesProcessed++;

                // check if we've completed all frames
                if (totalFrames > 0 && framesProcessed >= totalFrames) {
                    finalize("Animation completed");
                    return;
                }

                this.animationId = setTimeout(animate, frameInterval);
            };

            this.animationId = setTimeout(animate, frameInterval);
        });
    }

    /**
     * Performs eased animated scrolling from start to target position.
     */
    async easedAnimatedScroll(
        startPosition: number,
        targetPosition: number,
        frameInterval: number,
        totalFrames: number,
        easingFunction: EasingFunction
    ): Promise<void> {
        return new Promise((resolve) => {
            let framesProcessed = 0;
            const distance = targetPosition - startPosition;

            const startTime = performance.now();

            const finalize = (logMessage: string) => {
                const elapsedTime = performance.now() - startTime;
                this.logger.debug(
                    `${logMessage} (${framesProcessed} frames, ${elapsedTime.toFixed(2)}ms)`
                );
                this.animationId = null;
                resolve();
            };

            const animate = () => {
                const previousPosition = this.activeElement.scrollTop;

                // Calculate progress as a value between 0 and 1
                const progress = Math.min(framesProcessed / totalFrames, 1);

                // Apply easing function to progress
                const easedProgress = easingFunction(progress);

                // Calculate the current position using eased progress
                const currentPosition = startPosition + distance * easedProgress;

                this.logger.debug(
                    `Frame [${this.animationId}] progress=${progress.toFixed(3)}, eased=${easedProgress.toFixed(3)}, pos=${currentPosition.toFixed(1)}`
                );

                this.directScroll(currentPosition);

                // check if we've reached a document limit
                const actualPosition = this.activeElement.scrollTop;
                if (actualPosition === previousPosition && framesProcessed > 2) {
                    finalize(`Scroll stopped @ ${actualPosition}`);
                    return;
                }

                framesProcessed++;

                // check if we've completed all frames
                if (framesProcessed >= totalFrames) {
                    // Ensure we end exactly at the target
                    this.directScroll(targetPosition);
                    finalize("Eased animation completed");
                    return;
                }

                this.animationId = setTimeout(animate, frameInterval);
            };

            this.animationId = setTimeout(animate, frameInterval);
        });
    }

    /**
     * Animates scrolling to the target position over a given duration with easing.
     */
    async smoothScrollTo(targetTop: number, durationMs: number): Promise<void> {
        this.stopAnimation();

        if (!this.activeElement) {
            throw new Error("No active element");
        }

        const frameInterval = 1000 / ScrollEngine.ANIMATION_FRAME_RATE;
        const startTop = this.activeElement.scrollTop;
        const clampedTop = Math.max(targetTop, 0);
        const distance = Math.abs(clampedTop - startTop);

        if (durationMs <= frameInterval || distance <= ScrollEngine.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(clampedTop);
            return;
        }

        const totalFrames = Math.ceil(durationMs / frameInterval);

        // Create easing function based on current settings
        const easingFunction: EasingFunction = (t: number) =>
            EasingFunctions.easeInOut(t, this.settings.easeInFactor, this.settings.easeOutFactor);

        this.logger.debug(
            `Smooth scroll: ${frameInterval}ms/frame, ${totalFrames} frames, easeIn=${this.settings.easeInFactor}, easeOut=${this.settings.easeOutFactor}`
        );

        await this.easedAnimatedScroll(
            startTop,
            clampedTop,
            frameInterval,
            totalFrames,
            easingFunction
        );
    }

    /**
     * Starts continuous scrolling at a given speed in pixels per second.
     */
    async continuousScroll(direction: ScrollDirection, pixelsPerSecond: number): Promise<void> {
        this.stopAnimation();

        if (!this.activeElement) {
            throw new Error("No active element");
        }

        const frameInterval = 1000 / ScrollEngine.ANIMATION_FRAME_RATE;
        const pixelsPerFrame = ((pixelsPerSecond * frameInterval) / 1000) * direction;

        this.logger.debug(
            `Starting continuous scroll: ${pixelsPerSecond}px/s, ${pixelsPerFrame}px/frame`
        );

        // Continuous scrolling uses linear animation (no easing)
        await this.animatedScroll(frameInterval, pixelsPerFrame, 0);
    }
}
