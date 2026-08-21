/**
 * Switch the session view ring back to the Chat tab.
 *
 * The chat store (`setView`) is private to ui-conversation and there is no
 * public client API to change the active conversation view, so we activate
 * the Chat tab through the rendered tab ring. The view ring is the tablist
 * that contains our own "RSS" tab; within it Chat is the default view
 * (id 'chat', order 0). Best-effort: silently no-ops when the ring is absent.
 */
export declare function switchToChatTab(): void;
