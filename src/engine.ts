// engine.ts - handles scroll animation and state for scroll actions

import { Logger } from "./logger";

export enum ScrollDirection {
    UP = -1,
    DOWN = 1,
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

    get isActive(): boolean {
        return this.activeElement !== null && this.animationId !== null;
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
                if (totalFrames >= 0 && framesProcessed >= totalFrames) {
                    finalize("Animation completed");
                    return;
                }

                this.animationId = setTimeout(animate, frameInterval);
            };

            this.animationId = setTimeout(animate, frameInterval);
        });
    }

    /**
     * Animates scrolling to the target position over a given duration.
     */
    async smoothTargetScroll(targetTop: number, durationMs: number): Promise<void> {
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
        const pixelsPerFrame = (clampedTop - startTop) / totalFrames;

        this.logger.debug(`Frame info: ${frameInterval}ms; ${pixelsPerFrame}px per frame`);

        await this.animatedScroll(frameInterval, pixelsPerFrame, totalFrames);
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

        await this.animatedScroll(frameInterval, pixelsPerFrame, 0);
    }
}
