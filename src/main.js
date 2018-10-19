
import React from 'react';
import ReactDom from 'react-dom';
import BaseComponent from 'base-component';
import SimpleNavigationHelper from './simpleNavigationHelper.js';
import Dialer from './dial_helper.js';
import ReactSimChooser from 'react-sim-chooser';
import Service from 'service';

export default class MainView extends BaseComponent {
	DEBUG = true;
	name='main';
	
	constructor(props) {
		super(props);
		this.prefix = 'list';

		Dialer.on('mmiloading', this.showLoading.bind(this));
		Dialer.on('mmiloaded', this.showAlert.bind(this));
		Dialer.on('ussd-received', this.onUssdReceived.bind(this));
	}

	componentDidMount() {
		this.navigator = new SimpleNavigationHelper('.navigable', this.element);

		this.input.value = '*#43#';
	}

	componentDidUpdate() {
		this.debug('componentDidUpdate');
	}

	showLoading() {
		this.debug('showLoading');
	  // Service.request('Dialer:hide')
	  // .then(() => {
	    Service.request('showDialog', {
	      type: 'alert',
	      content: 'sending',
	      otherClass: 'is-loading',
	      translated: true,
	      noClose: false,
		    onOk:()=> {
		    	this.input.focus();
		    }
	    });
	//  });
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
	    	this.input.focus();
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
		    	this.input.focus();
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
	    noClose: false
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
	//	  		window.close();
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
	    			tabindex="-1">
	    			<div className="header h1">USSD Call</div>
	    			<input className='navigable' type='tel'
	    			ref={(c) => {this.input = c}}
	    			 onKeyDown={(e) => {this.onKeyDown(e)}}/>
	    		</div>		
	}
}
