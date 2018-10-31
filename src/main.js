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
  ussdStr = '65202,http://myorange.orange.co.bw/myorangewebapp/MyOrange-Botswana/;62402,http://myorange.orange.cm/myorangewebapp/MyOrange-Cameroon/;61203,https://espaceclient.orange.ci/;61101,http://myorange.orange-guinee.com/myorangewebapp/MyOrange-Guinee/;41677,http://ssowt-zr.orange.jo/myorangewebapp/MyOrange-Jordan/;64602,http://zasyorange.orange.mg/myorangewebapp/MyOrange-Madagascar/index.html;60400,https://espace-client.orange.ma/sso/login;61404,http://myorange.orange.ne/myorangewebapp/MyOrange-Niger/;63086,http://myorange.orange.cd/myorangewebapp/MyOrange-CongoDemocratique/;63089,http://myorange.orange.cd/myorangewebapp/MyOrange-CongoDemocratique/;60801,http://myorange.orange.sn/myorangewebapp/MyOrange-Senegal/;61302, ;62303, ;60201, ;63203, ;61807, ;61002, ;61901, ;60501, ;';
  //ussdStr = '61302,*144#;65202,*145#;63086,*144#;63089,*144#;62303,#144#;61203,#144#;62402,#150#;60201,#115#;63203,#144#;61101,#144#*144#;41677, ;61807,*144#;60400, ;61002,#144#;64602,#144#;61404,#144#;61901,#144#;60801,#144#;60501,*139#;';

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
 		this.presetNumber().then((result) => {
      if (this.isUrl(result)) {
        this.loadUrl(result)
      } else {
        this.input.value = result;
      }
 		});

    this.focus();
    this.updateSoftKeys();
    // let self = this;
    // document.addEventListener("visibilitychange", function(){
    // 	self.debug('visibilitychange, ' + document.hidden);
    // });
  }

  isUrl(value) {
    let isUrl = /^http/.test(value);
    return isUrl;
  }

  loadUrl(url) {
    if (url && url !== '') {
      if (navigator.onLine) {
        this.debug('navigator to ' + url);
    //   window.open(url, '_self', 'remote=true');
        new MozActivity({
              name: 'view',
              data: {
                type: 'url',
                url: url,
                isPrivate: false
              }
            });
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        this.debug('Network error');
      }
    } else {
      this.debug('Can not get url, mcc/mnc ' + 'key,'  + 'urlStr:' + urlStr);
    }
  }

  presetNumber() {
  	var self = this;
  	return new Promise((resolve, reject) => {
  		if (!navigator.mozMobileConnections[0] || !navigator.mozMobileConnections[0].iccId) {
  		  this.debug('iccId is null');
  		  reject();
  		  return;
  		} 

  		var iccId = navigator.mozMobileConnections[0].iccId;
  		if (!navigator.mozIccManager || !navigator.mozIccManager.getIccById(iccId)) {
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
