import React from 'react';
import BaseComponent from 'base-component';
import OptionMenu from 'react-option-menu';
import Service from 'service';

export default class OptionMenuRenderer extends BaseComponent {
  name = 'OptionMenuRenderer';

  constructor(props) {
    super(props);
    this.state = {
      menu: false,
      options: null
    };
    Service.register('showOptionMenu', this);
    window.mn = this;
  }

  showOptionMenu(options) {
    this.setState({
      menu: true,
      options: options
    }, () => {
      if (document.activeElement === document.body) {
        this.refs.menu && this.refs.menu.focus();
      }
    });
  }

  componentDidUpdate() {
    if (!this.refs.menu) {
      Service.request('focus');
    } else {
      // XXX
      this.refs.menu.show(this.state.options);
      this.refs.menu.on('closed', () => {
        // Workaround for focusing input type=date
        if ('INPUT' === document.activeElement.tagName) {
          return;
        }
        Service.request('focus');
      });
    }
  }

  render() {
    return (
      <div id="menu-root">
        {this.state.menu ? <OptionMenu ref="menu" /> : null}
      </div>
    );
  }
}
