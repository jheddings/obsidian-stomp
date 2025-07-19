import { Logger, LoggerInstance } from "./logger";
import { App, Editor, MarkdownView } from "obsidian";

export interface ScrollerOptions {
    pageScrollAmount: number;
    scrollSpeed: number;
}

export abstract class ViewScroller {
    protected logger: LoggerInstance;
    private isAnimating: boolean = false;

    private static readonly ANIMATION_FRAME_RATE = 60;
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;
    private static readonly ANIMATION_DECAY_RATE = 3;

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
        targetTop: number,
        scrollSpeed: number
    ): Promise<void> {
        if (this.isAnimating) {
            this.logger.debug("Animation in progress; aborting");
            return;
        }

        const { top: currentTop } = editor.getScrollInfo();
        const distance = currentTop - targetTop;

        if (Math.abs(distance) < ViewScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(editor, targetTop);
            this.isAnimating = false;
            return;
        }

        // calculate the total time for the scroll animation
        const totalTime = Math.abs(distance) / scrollSpeed;
        const frameTime = 1000 / ViewScroller.ANIMATION_FRAME_RATE;
        const totalFrames = Math.ceil(totalTime * ViewScroller.ANIMATION_FRAME_RATE);

        let currentFrame = 0;
        this.isAnimating = true;

        this.logger.debug(
            `Starting scroll: distance=${distance}px, time=${totalTime}s, frames=${totalFrames}`
        );

        const animate = () => {
            if (!this.isAnimating) return;

            currentFrame++;
            const progress = currentFrame / totalFrames;

            if (progress >= 1) {
                this.directScroll(editor, targetTop);
                this.isAnimating = false;
            } else {
                const currentPosition = currentTop - distance * progress;
                this.directScroll(editor, currentPosition);
                setTimeout(animate, frameTime);
            }
        };

        animate();
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
        const targetTop = top + scrollAmount;
        this.logger.debug(`Scroll amount: ${scrollAmount}, target position: ${targetTop}`);

        await this.animatedScroll(editor, targetTop, this.options.scrollSpeed);
    }
}
