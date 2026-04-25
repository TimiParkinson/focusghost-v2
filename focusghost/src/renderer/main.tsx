// Renderer entry — mounts React app and applies persisted accent theme on boot.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyAccentClass, ensureBrowserMockApi } from './api';

ensureBrowserMockApi();

window.api
  .getSettings()
  .then((s) => applyAccentClass(s.accent))
  .catch(() => {});

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
