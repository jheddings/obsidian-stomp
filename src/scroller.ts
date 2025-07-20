import { Logger, LoggerInstance } from "./logger";
import { App, Editor, MarkdownView } from "obsidian";

export interface ScrollerOptions {
    pageScrollAmount: number;
    pageScrollDuration: number;
}

export abstract class ViewScroller {
    protected logger: LoggerInstance;

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
}

export class PageScroller extends ViewScroller {
    private options: ScrollerOptions;

    private isScrolling: boolean = false;

    private static readonly ANIMATION_FRAME_RATE = 60;
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;

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

        if (this.isScrolling) {
            this.logger.debug("Scrolling in progress; aborting");
            return;
        }

        const editor = activeView.editor;
        const currentTop = editor.getScrollInfo().top;
        const targetTop = currentTop + direction * this.options.pageScrollAmount;
        const distance = Math.abs(targetTop - currentTop);

        if (distance < PageScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(editor, targetTop);
            return;
        }

        const frameTime = 1000 / PageScroller.ANIMATION_FRAME_RATE;
        const pixelsPerFrame =
            (direction * distance) /
            Math.ceil((this.options.pageScrollDuration * 1000) / frameTime);

        let currentPosition = currentTop;
        this.isScrolling = true;

        this.logger.debug(`Scrolling ${distance}px from ${currentTop} to ${targetTop}`);

        const animate = () => {
            if (!this.isScrolling) return;

            currentPosition += pixelsPerFrame;

            if (Math.abs(targetTop - currentPosition) <= PageScroller.ANIMATION_FRAME_THRESHOLD) {
                this.directScroll(editor, targetTop);
                this.isScrolling = false;
            } else {
                this.directScroll(editor, currentPosition);
                setTimeout(animate, frameTime);
            }
        };

        animate();
    }
}
