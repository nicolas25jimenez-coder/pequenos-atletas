import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { ProveedorSesion } from './lib/sesion';
import { ProveedorToast } from './ui/base';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorToast>
          <App />
        </ProveedorToast>
      </ProveedorSesion>
    </BrowserRouter>
  </React.StrictMode>,
);
