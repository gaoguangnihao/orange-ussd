import React from 'react';
import ReactDom from 'react-dom';
import BaseComponent from 'base-component';
//import SimpleNavigationHelper from './components/simpleNavigationHelper.js';
import SimpleNavigationHelper from 'simple-navigation-helper';
import Dialer from './dial_helper.js';
import ReactSimChooser from 'react-sim-chooser';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import DialogRenderer from './components/dialog_renderer';

export default class MainView extends BaseComponent {
  DEBUG = true;
  name='main';
  
  KEY_USSDSTR = 'orange.ussds';
  ussdStr = '46000,*#06#;46002,*#43#';

  constructor(props) {
    super(props);
    this.prefix = 'list';

    Dialer.on('mmiloading', this.showLoading.bind(this));
    Dialer.on('mmiloaded', this.showAlert.bind(this));
    Dialer.on('ussd-received', this.onUssdReceived.bind(this));
    Dialer.on('showDialog', this.showDialog.bind(this));
  }

  componentDidMount() {
    this.navigator = new SimpleNavigationHelper('.navigable', this.element);
 		this.presetNumber().then((ussd) => {
 			this.input.value = ussd;
 			this.focus();
 		});
    this.updateSoftKeys();

    let self = this;
    document.addEventListener("visibilitychange", function(){
    	self.debug('visibilitychange, ' + document.hidden);
    });
  }

  presetNumber() {
  	var self = this;
  	return new Promise((resolve, reject) => {
  		if (!navigator.mozMobileConnections[0] && !navigator.mozMobileConnections[0].iccId) {
  		  this.debug('iccId is null');
  		  reject();
  		  return;
  		} 

  		var iccId = navigator.mozMobileConnections[0].iccId;
  		if (!navigator.mozIccManager && !navigator.mozIccManager.getIccById(iccId)) {
  		  this.debug('Can not get iccInfo');
  		  reject()
  		  return;
  		}
  		// Genarate the key by mcc/mnc
  		var iccInfo = navigator.mozIccManager.getIccById(iccId).iccInfo;
  		var key = iccInfo.mcc + iccInfo.mnc;
  		this.debug('key :'  + key);

  		// Get config url string from settings db
  		navigator.mozSettings.createLock().get(self.KEY_USSDSTR).then((result) => {
  		  var ussds = result[self.KEY_USSDSTR];
  		  if (ussds) {
  		    self.ussdStr = ussds;
  		  }
  		  this.debug('ussdStr:' + self.ussdStr);
  		  var ussd = self.parseUssdbyKey(self.ussdStr, key);
  		  self.debug(ussd);
  		  resolve(ussd);
  		}, () => {
  		  self.debug('Get ussd from db error');
  		  reject();
  		})
  	})
  }

  parseUssdbyKey(str, key) {
    var ussdArr = str.split(';');
    var ussd = '';
    ussdArr.forEach((params)=> {
      var paramArr = params.split(',');
      if (paramArr[0] === key) {
        ussd = paramArr[1];
      }
    });
    return ussd;
  }

  updateSoftKeys() {
    let config = {};
    config.center = 'Call';
    SoftKeyStore.register(config, this.element);
  }

  focus() {
  	this.debug('focus ' + this.input.value.length);
  	this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  	this.input.focus();
  	this.updateSoftKeys();
  }

  showDialog(options) {
  	this.debug('showDialog options:' + JSON.stringify(options));
  	Service.request('showDialog', {
  	  ...options,
  	  onOk:()=> {
  	  	this.focus();
  	  }
  	});
  }

  showLoading() {
    this.debug('showLoading');
    Service.request('showDialog', {
      type: 'alert',
      content: 'sending',
      otherClass: 'is-loading',
      translated: true,
      noClose: false,
      onOk:()=> {
      	this.focus();
      }
    });
  }

  showAlert(title, message) {
    this.debug('showAlert');
    Service.request('Dialer:hide');
    if (!title && !message) {
      return;
    }
    Service.request('showDialog', {
      type: 'alert',
      header: title,
      content: message,
      translated: true,
      noClose: false,
      onOk:()=> {
        this.focus();
      }
    });
  }

  onUssdReceived(evt) {
    this.debug('onUssdReceived');
    if (Dialer.mmiloading) {
      Service.request('hideDialog');
    }

    if (!evt.message) {
      // XXX: for debuging
      Service.request('showDialog', {
        type: 'alert',
        header: 'Error USSD case!',
        content: JSON.stringify(evt),
        translated: true,
        noClose: false,
        onOk:()=> {
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
      onOk:()=> {
        this.focus();
      }
    });
  }

  onClick(e) {
  }

  onKeyDown(e) {
    this.debug("onKeyDown key:" + e.key);
    switch (e.key) {
      case 'Call':
      case 'Enter':
        let number = this.input.value;
        this.debug('number:' + number);
        Dialer.dial(number).then(()=> {
  //        window.close();
        }, ()=> {
          this.debug('dial error');
        });
        break;
      default:
        break;
    }
  }

  render() {
    this.debug("render");
      return <div id="list" 
            ref={(c) => {this.element = c}}
            onClick={(e) => {this.onClick(e)}}
            onFocus={(e) => {this.focus(e)}}
            tabindex="-1">
            <div className="header h1">USSD Call</div>
            <input className='navigable' type='tel'
            ref={(c) => {this.input = c}}
             onKeyDown={(e) => {this.onKeyDown(e)}}/>
          </div>    
  }
}
