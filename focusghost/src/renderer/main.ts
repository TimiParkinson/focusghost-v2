// Renderer entry — surface-aware mount: panel / nudge.
import { mount } from 'svelte';
import App from './App.svelte';
import NudgeRoot from './NudgeRoot.svelte';
import './index.css';
import { applyAccentClass, ensureBrowserMockApi } from './api';
import { readSurface } from './window';

ensureBrowserMockApi();

window.api
  .getSettings()
  .then((s) => applyAccentClass(s.accent))
  .catch(() => {});

const surface = readSurface();
const target = document.getElementById('root')!;

let component: unknown;
if (surface === 'nudge') component = mount(NudgeRoot, { target });
else component = mount(App, { target });

export default component;
