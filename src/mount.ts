import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MicroAtlasViewer, ViewerProps } from './Viewer';

export function mount(el: HTMLElement, props: ViewerProps): () => void {
  const root = createRoot(el);
  root.render(createElement(MicroAtlasViewer, props));
  return () => root.unmount();
}
