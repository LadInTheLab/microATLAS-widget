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

    const title = model.get('title');
    if (title !== undefined) props.title = title;

    const defaultAnnotationsVisible = model.get('defaultAnnotationsVisible');
    if (defaultAnnotationsVisible !== undefined) props.defaultAnnotationsVisible = defaultAnnotationsVisible;

    const defaultScaleBarVisible = model.get('defaultScaleBarVisible');
    if (defaultScaleBarVisible !== undefined) props.defaultScaleBarVisible = defaultScaleBarVisible;

    const defaultTitleVisible = model.get('defaultTitleVisible');
    if (defaultTitleVisible !== undefined) props.defaultTitleVisible = defaultTitleVisible;

    // Curvenote's el has no intrinsic height — create a sized, positioned
    // container so the viewer's position:absolute layout has something to fill.
    const container = document.createElement('div');
    const width = model.get('width') ?? '100%';
    const height = model.get('height') ?? '500px';
    Object.assign(container.style, {
      position: 'relative',
      width,
      height,
      margin: width !== '100%' ? '0 auto' : undefined,
      backgroundColor: 'black',
      borderRadius: '8px',
      overflow: 'hidden',
    });
    el.appendChild(container);

    const unmount = mount(container, props);
    return () => {
      unmount();
      container.remove();
    };
  },
};
