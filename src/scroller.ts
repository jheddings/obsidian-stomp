import { Logger, LoggerInstance } from "./logger";
import { App, Editor, MarkdownView } from "obsidian";

export interface ScrollerOptions {
    pageScrollAmount: number;
    scrollSpeed: number; // pixels per second - used for both animation speed and auto-scroll rate
}

export abstract class ViewScroller {
    protected logger: LoggerInstance;
    private isAnimating: boolean = false;

    private static readonly ANIMATION_FRAME_TIME = 16 / 1000;
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;
    private static readonly ANIMATION_BACKOFF_FACTOR = 3;

    constructor(protected app: App) {
        this.logger = Logger.getLogger("ViewScroller");
    }

    abstract scrollUp(): Promise<void>;

    abstract scrollDown(): Promise<void>;

    protected directScroll(editor: Editor, targetTop: number) {
        const { top, left } = editor.getScrollInfo();
        const clampedTarget = Math.max(targetTop, 0);

        this.logger.debug(`Scrolling from ${top} to ${clampedTarget}`);

        editor.scrollTo(left, clampedTarget);

        const { top: newTop } = editor.getScrollInfo();

        if (newTop === 0) {
            this.logger.debug("Reached top of document");
        } else if (newTop === top) {
            this.logger.debug("Reached end of document");
        }
    }

    protected async animatedScroll(
        editor: Editor,
        scrollAmount: number,
        scrollSpeed: number
    ): Promise<void> {
        if (this.isAnimating) {
            this.logger.debug("Animation in progress; aborting");
            return;
        }

        const startPosition = editor.getScrollInfo().top;
        const targetPosition = startPosition + scrollAmount;

        // If the scroll amount is below threshold, just do a direct scroll
        if (Math.abs(scrollAmount) <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(editor, targetPosition);
            return;
        }

        this.isAnimating = true;
        const startTime = performance.now();

        return new Promise((resolve) => {
            const animate = (currentTime: number) => {
                const currentPosition = editor.getScrollInfo().top;
                const remainingDistance = targetPosition - currentPosition;

                if (Math.abs(remainingDistance) <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                    this.directScroll(editor, targetPosition);
                    this.isAnimating = false;
                    resolve();

                    const totalTime = (currentTime - startTime) / 1000;
                    this.logger.debug(`Animation complete in ${totalTime} seconds`);

                    return;
                }

                // Calculate base movement for this frame
                const baseMovement = scrollSpeed * ViewScroller.ANIMATION_FRAME_TIME;

                // Apply easing: reduce speed as we get closer to target
                const distanceRatio = Math.abs(remainingDistance) / Math.abs(scrollAmount);
                const easingFactor = Math.pow(
                    distanceRatio,
                    1 / ViewScroller.ANIMATION_BACKOFF_FACTOR
                );

                // Calculate actual movement for this frame
                const movement = baseMovement * easingFactor * Math.sign(remainingDistance);
                const newPosition = currentPosition + movement;

                this.directScroll(editor, newPosition);

                // continue animation
                requestAnimationFrame(animate);
            };

            // start the animation
            requestAnimationFrame(animate);
        });
    }
}

export class PageScroller extends ViewScroller {
    private options: ScrollerOptions;

    constructor(app: App, options: ScrollerOptions) {
        super(app);
        this.options = options;
        this.logger = Logger.getLogger("PageScroller");
    }

    async scrollUp(): Promise<void> {
        await this.performScroll(-1);
    }

    async scrollDown(): Promise<void> {
        await this.performScroll(1);
    }

    private async performScroll(direction: number): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        this.logger.debug(`Scrolling ${direction > 0 ? "down" : "up"} on: ${activeView}`);

        if (!activeView) {
            this.logger.warn("No active markdown view found");
            return;
        }

        const editor = activeView.editor;

        const { top, left } = editor.getScrollInfo();
        this.logger.debug(`Current scroll position: top=${top}, left=${left}`);

        const scrollAmount = direction * this.options.pageScrollAmount;
        this.logger.debug(`Scroll amount: ${scrollAmount}, target position: ${top + scrollAmount}`);

        await this.animatedScroll(editor, scrollAmount, this.options.scrollSpeed);
    }
}
