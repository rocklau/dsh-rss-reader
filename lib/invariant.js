// src/invariant.ts
var invariant = {
  /** Verify the OpenBook services are registered on the root context. */
  check(context) {
    const failures = [];
    const ctx = context;
    if (ctx == null) {
      failures.push("openbook-rss: root context missing");
      return failures;
    }
    if (ctx.rssStore === void 0) failures.push("openbook-rss: rssStore service not registered");
    if (ctx.rssSync === void 0) failures.push("openbook-rss: rssSync service not registered");
    if (ctx.rssApi === void 0) failures.push("openbook-rss: rssApi service not registered");
    return failures;
  }
};
var invariant_default = invariant;
export {
  invariant_default as default,
  invariant
};
