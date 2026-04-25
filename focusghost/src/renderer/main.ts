// Renderer entry — mounts Svelte App and applies persisted accent on boot.
import { mount } from 'svelte';
import App from './App.svelte';
import './index.css';
import { applyAccentClass, ensureBrowserMockApi } from './api';

ensureBrowserMockApi();

window.api
  .getSettings()
  .then((s) => applyAccentClass(s.accent))
  .catch(() => {});

const app = mount(App, { target: document.getElementById('root')! });

export default app;
