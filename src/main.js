/* global window, MozActivity */
import React from 'react';
import BaseComponent from 'base-component';
import SimpleNavigationHelper from 'simple-navigation-helper';
import SIMSlotManager from 'simslot-manager';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import Dialer from './dial_helper.js';
import Config from './config.js';

export default class MainView extends BaseComponent {
  DEBUG = true;
  name='main';

  constructor(props) {
    super(props);
    this.prefix = 'list';

    Dialer.on('mmiloading', this.showLoading.bind(this));
    Dialer.on('mmiloaded', this.showAlert.bind(this));
    Dialer.on('ussd-received', this.onUssdReceived.bind(this));
    Dialer.on('showDialog', this.showDialog.bind(this));

    Service.register('exitApp', this);
  }

  exitApp() {
    window.close();
  }

  componentDidMount() {
    this.navigator = new SimpleNavigationHelper('.navigable', this.element);
    this.presetNumber().then((result) => {
      if (this.isUrl(result)) {
        this.loadUrl(result);
      } else {
        Dialer.dial(result).then(() => {
        }, () => {
          this.debug('dial error');
        });
      }
    });

    this.focus();
    this.updateSoftKeys();
  }

  isUrl(value) {
    let isUrl = /^http/.test(value);
    return isUrl;
  }

  loadUrl(url) {
    if (url && url !== '') {
      this.debug(`navigator to ${url}`);
      setTimeout(() => {
        window.open(url, '_blank');
        window.close();
      }, 200);
    } else {
      this.debug(`Can not get url:${url}`);
    }
  }

  presetNumber() {
    let self = this;
    return new Promise((resolve, reject) => {
      navigator.mozSettings.createLock().get('ril.data.defaultServiceId').then((result) =>{
        const defaultServiceId = result['ril.data.defaultServiceId'];
        this.debug(`defaultServiceId ${defaultServiceId}`);
        if (!SIMSlotManager.isSIMCardAbsent(defaultServiceId)) {
          const simslot = SIMSlotManager.get(defaultServiceId);
          // Genarate the key by mcc/mnc
          let key = simslot.simCard.iccInfo.mcc + simslot.simCard.iccInfo.mnc;
          this.debug(`key :${key}`);
          // Get config url string from settings db
          navigator.mozSettings.createLock().get(Config.KEY_USSDS).then((result) => {
            let value = result[Config.KEY_USSDS];
            this.debug(`result:${value}`);
            let ussds = Config.ussds;
            if (value) {
              ussds = JSON.parse(value);
            }
            this.debug(`ussds:${JSON.stringify(ussds)}`);
            let ussd = ussds[key];

            if (!ussd) {
              this.showDialog({
                type: 'alert',
                header: 'GenericFailure',
                content: 'insert-orange-sim-msg',
                translated: false,
                noClose: false,
                onOk: () => {
                  window.close();
                }
              });
              reject();
            } else {
              this.debug(ussd);
              resolve(ussd);
            }
          }, () => {
            self.debug('Get ussd from db error');
            reject();
          });
        } else {
            this.showDialog({
              type: 'alert',
              header: 'GenericFailure',
              content: 'insert-orange-sim-msg',
              translated: false,
              noClose: false,
              onOk: () => {
                window.close();
              }
            });
   //         Dialer.onUssdReceived({session:{cancel:()=>{}, send:(res)=>{}}, message:'123123123123123'});
          }
      });
    });
  }

  updateSoftKeys() {
    let config = {};
    config.center = 'Call';
    SoftKeyStore.register(config, this.element);
  }

  focus() {
    this.debug(`focus ${this.input.value.length}`);
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    this.input.focus();
    this.updateSoftKeys();
  }

  showDialog(options) {
    this.debug(`showDialog options:${JSON.stringify(options)}`);
    Service.request('showDialog', {
      ...options,
      onOk: () => {
        this.focus();
        options.onOk && options.onOk();
      }
    });
  }

  showLoading() {
    this.debug('showLoading');
    Service.request('showLoading');
  }

  showAlert(title, message) {
    this.debug('showAlert');
    // hide loading 
    Service.request('hideLoading');
    if (!title && !message) {
      return;
    }
    Service.request('showDialog', {
      type: 'alert',
      header: title,
      content: message,
      translated: true,
      noClose: false,
      onOk: () => {
        this.focus();
      }
    });
  }

  onUssdReceived(evt) {
    this.debug('onUssdReceived');
    if (Dialer.mmiloading) {
      Service.request('hideLoading');
    }

    if (!evt.message) {
      // XXX: for debuging
      Service.request('showDialog', {
        type: 'alert',
        header: 'Error USSD case!',
        content: JSON.stringify(evt),
        translated: true,
        noClose: false,
        onOk: () => {
          this.focus();
        }
      });
      return;
    }

    let network = navigator.mozMobileConnections[evt.serviceId || 0].voice.network;
    let operator = network ? (network.shortName || network.longName) : '';
    Service.request('showDialog', {
      type: 'alert',
      header: operator,
      content: evt.message.replace(/\\r\\n|\\r|\\n/g, '\n'),
      translated: true,
      noClose: false,
      onOk: () => {
        this.focus();
      }
    });
  }

  onKeyDown(e) {
    this.debug(`onKeyDown key:${e.key}`);
    switch (e.key) {
      case 'Call':
      case 'Enter':
      case 'Backspace':
        break;
      default:
        break;
    }
  }

  render() {
    this.debug('render');
    return (<div
      id="list"
      ref={(c) => { this.element = c; }}
      onFocus={(e) => { this.focus(e); }}
      tabIndex="-1"
    >
      <div className="header h1">USSD Call</div>
      <input
        className="navigable" type="tel"
        ref={(c) => { this.input = c; }}
        onKeyDown={(e) => { this.onKeyDown(e); }}
      />
    </div>);
  }
}
