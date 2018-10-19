import React from 'react';
import BaseComponent from 'base-component';

import ReactSimChooser from 'react-sim-chooser';
import OptionMenuRenderer from './option_menu_renderer';
import DialogRenderer from './dialog_renderer';
import ToastManager from './toast_manager';

export default class SideView extends BaseComponent {
  render() {
    return (
      <div>
        <DialogRenderer />
        <OptionMenuRenderer />
        <div className="toast-container">
          <ToastManager />
        </div>
        <ReactSimChooser />
      </div>
    );
  }
}
