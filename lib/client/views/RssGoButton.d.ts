/** RssGoButton: one-click sidebar shortcut that jumps to the RSS conversation-view tab. */
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
export interface RssGoButtonInjected {
    goToRss: () => void;
}
type RssGoButtonProps = InjectFace<RssGoButtonInjected> & {
    wide: boolean;
};
/** One sidebar.footer.action entry: jump straight to the RSS reading tab. */
export declare function RssGoButton({ wide, goToRss }: RssGoButtonProps): import("react").JSX.Element;
export {};
