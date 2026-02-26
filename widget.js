// any:bundle bridge — imports the built library and wires up the model data.
// Isolate our bundled deck.gl from any host-page version (e.g. Curvenote ships v9)
// to avoid the "multiple versions detected" fatal check.
const _hostDeck = globalThis.deck;
globalThis.deck = undefined;
const { mount } = await import('./index.js');
globalThis.deck = _hostDeck;

export default {
  async render({ model, el }) {
    const props = { source: model.get('source') };

    const views = model.get('views');
    if (views) props.views = views;

    const annotations = model.get('annotations');
    if (annotations) props.annotations = annotations;

    const scaleBar = model.get('scaleBar');
    if (scaleBar !== undefined) props.scaleBar = scaleBar;

    return mount(el, props);
  },
};
