// One request at a time, including explicit refreshes and visibility changes.
export function startPublishedPolling({ load, onData, onError, onLoading = () => {}, visibility = document, intervalMs = 30_000, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false, timer, controller, inFlight = null, refreshAgain = false;
  const clear = () => { cancel(timer); timer = undefined; };
  const refresh = () => {
    clear();
    if (stopped || visibility.hidden) return Promise.resolve();
    if (inFlight) {
      refreshAgain = true;
      // Explicit refresh callers need the follow-up request, not a pre-save response.
      return inFlight.then(() => inFlight || null);
    }
    controller = new AbortController();
    onLoading(true);
    inFlight = (async () => {
      try {
        const data = await Promise.resolve().then(() => load({ signal: controller.signal }));
        if (!stopped && !controller.signal.aborted) { onData(data); return data; }
        return null;
      }
      catch (error) { if (!stopped && !controller.signal.aborted) onError(error); return null; }
      finally {
        inFlight = null;
        if (!stopped) onLoading(false);
        if (!stopped && !visibility.hidden) {
          if (refreshAgain) { refreshAgain = false; refresh(); }
          else timer = schedule(refresh, intervalMs);
        }
      }
    })();
    return inFlight;
  };
  const changed = () => {
    if (visibility.hidden) { clear(); controller?.abort(); }
    else refresh();
  };
  visibility.addEventListener('visibilitychange', changed);
  refresh();
  return { refresh, stop() { stopped = true; clear(); controller?.abort(); visibility.removeEventListener('visibilitychange', changed); } };
}
