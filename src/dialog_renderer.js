import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import ReactDialog from 'react-dialog';
import '../scss/dialog_renderer.scss';

export default class DialogRenderer extends BaseComponent {
  name = 'DialogRenderer';

  constructor(props) {
    super(props);
    this.state = {
      dialog: false,
      options: null
    };
    Service.register('showDialog', this);
    Service.register('ensureDialog', this);
  }

  ensureDialog() {
    if (this.state.dialog) {
      this.refs.dialog.show();
    }
  }

  showDialog(options) {
    this.setState({
      dialog: true,
      options: options
    }, () => {
      this.refs.dialog.show();
    });
  }

  componentDidUpdate() {
    if (!this.refs.dialog) {
      Service.request('focus');
    } else {
      this.refs.dialog.on('closed', () => {
        this.setState({
          dialog: false,
          options: null
        });
        Service.request('focus');
      });
    }
  }

  render() {
    return (
      <div id="dialog-root">
        {this.state.dialog ?
          <ReactDialog ref="dialog" {...this.state.options} />
          : null}
      </div>
    );
  }
}
