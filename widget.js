// any:bundle bridge — imports the built library and wires up the model data.
import { mount } from './index.js';

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
