import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import EnhanceAnimation from 'enhance-animation';
import Service from 'service';
import '../../scss/toast_manager.scss';

class ToastManager extends BaseComponent {
  name = 'ToastManager';

  EVENT_PREFIX = 'toast-manager-';

  TIMEOUT = 3000;

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      text: '',
      titleL10n: '',
      textL10n: '',
      icon: '',
      ariaLabel: ''
    };
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this.refs.element);
    this.on('closed', () => { this.clear(); });
    Service.register('show', this);
    window.tm = this;
  }

  clear() {
    this.setState({
      title: '',
      text: '',
      titleL10n: '',
      textL10n: '',
      icon: '',
      ariaLabel: ''
    });
  }

  show(config) {
    window.Toaster.showToast({
      message: config.text
    });
  }

  _show(config) {
    this.clear();
    this.setState(config);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.open();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.close();
    }, config.timeout ? config.timeout : this.TIMEOUT);
  }


  render() {
    var DOM = '';
    if (this.state.text || this.state.title || this.state.titleL10n || this.state.textL10n) {
      let detail = this.state;
      let titleDOM = '';
      if (this.state.titleL10n) {
        titleDOM = <div className="primary" data-l10n-id={detail.titleL10n} />;
      } else if (this.state.title) {
        titleDOM = <div className="primary">{detail.title}</div>;
      }
      let iconDOM = this.state.icon ?
        (
          <div className="icon">
            <div className="background" />
            <img src={detail.icon || detail.appIcon} alt="icon" />
          </div>
        ) : '';
      let bodyDOM = '';
      let bodyClass = 'secondary';
      if (!this.state.titleL10n && !this.state.title) {
        bodyClass = 'primary';
      }
      // When ariaLabel is provided, add aria-hidden to the display text and
      // readout the element with aria-label.
      bodyDOM = (
        <div className={bodyClass}>
          <div data-l10n-id={this.state.textL10n ? detail.textL10n : ''} aria-hidden={this.state.ariaLabel ? 'true' : 'false'}>
            {this.state.text ? detail.text : ''}
          </div>
          <div aria-label={this.state.ariaLabel ? detail.ariaLabel : ''} />
        </div>
      );
      DOM = (
        <div className="container">
          {iconDOM}
          <div className="content">
            {titleDOM}
            {bodyDOM}
          </div>
        </div>
      );
    }
    return (
      <div className="toaster" ref="element">
        {DOM}
        <div className="gradient" />
      </div>
    );
  }
}

export default EnhanceAnimation(ToastManager, 'slide-from-top', 'fade-out');
