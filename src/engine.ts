import { Logger, LoggerInstance } from "./logger";

export class ScrollEngine {
    private static readonly ANIMATION_FRAME_RATE = 60;
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;

    private logger: LoggerInstance;
    private animationId: NodeJS.Timeout | null = null;
    private activeElement: HTMLElement | null = null;

    constructor() {
        this.logger = Logger.getLogger("ScrollEngine");
    }

    activate(element: HTMLElement): void {
        if (this.activeElement) {
            this.logger.warn("Existing active element; deactivating");
            this.deactivate();
        }

        this.activeElement = element;

        this.logger.debug(`Activated element: ${element.tagName}#${element.id}`);
    }

    deactivate(): void {
        if (!this.activeElement) {
            this.logger.warn("No active element");
            return;
        }

        const elementInfo = `${this.activeElement.tagName}#${this.activeElement.id}`;

        this.activeElement = null;

        this.logger.debug(`Deactivated element: ${elementInfo}`);
    }

    stopAnimation(): void {
        if (this.animationId !== null) {
            clearTimeout(this.animationId);
            this.logger.debug(`Animation stopped [${this.animationId}]`);
            this.animationId = null;
        }
    }

    async animatedScroll(targetTop: number, durationMs: number): Promise<void> {
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

        return new Promise((resolve) => {
            let currentPosition = this.activeElement.scrollTop;
            const startTime = performance.now();

            const finalize = (logMessage: string) => {
                const elapsedTime = performance.now() - startTime;
                this.logger.debug(`${logMessage} (${elapsedTime.toFixed(2)}ms)`);
                this.animationId = null;
                resolve();
            };

            const animate = () => {
                const nextPosition = currentPosition + pixelsPerFrame;
                const remainingDistance = Math.abs(clampedTop - nextPosition);

                this.logger.debug(
                    `Frame [${this.animationId}] ${currentPosition} to ${nextPosition}`
                );

                if (remainingDistance <= ScrollEngine.ANIMATION_FRAME_THRESHOLD) {
                    this.directScroll(clampedTop);
                    finalize(`Scroll stopped @ ${clampedTop}`);
                    return;
                }

                currentPosition = nextPosition;
                this.directScroll(currentPosition);

                if (this.activeElement.scrollTop === clampedTop) {
                    finalize("Animation completed");
                    return;
                }

                this.animationId = setTimeout(animate, frameInterval);
            };

            this.animationId = setTimeout(animate, frameInterval);
        });
    }

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
}
