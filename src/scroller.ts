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
        const distance = Math.abs(targetTop - currentTop);

        if (distance < ViewScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(editor, targetTop);
            return;
        }

        // calculate frame variables
        const frameTime = 1000 / ViewScroller.ANIMATION_FRAME_RATE;
        const stepSize = scrollSpeed * (frameTime / 1000);
        const direction = targetTop > currentTop ? 1 : -1;
        const pixelsPerFrame = direction * stepSize;

        let currentPosition = currentTop;
        this.isAnimating = true;

        this.logger.debug(`Starting scroll: ${currentTop} → ${targetTop} (${distance}px)`);

        const animate = () => {
            if (!this.isAnimating) return;

            currentPosition += pixelsPerFrame;

            const remaining = Math.abs(targetTop - currentPosition);

            if (remaining <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                this.directScroll(editor, targetTop);
                this.isAnimating = false;
            } else {
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
