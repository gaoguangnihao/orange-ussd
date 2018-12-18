import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';

export default class Loading extends BaseComponent {
  name = 'Loading';

  constructor(props) {
    super(props);
    this.state = {
      isShow:false
    };

    Service.register('showLoading', this);
    Service.register('hideLoading', this);
  }

  showLoading() {
    if(!this.state.isShow) {
      this.setState({
        isShow:true
      });
    }
  }

  hideLoading() {
    if(this.state.isShow) {
      this.setState({
        isShow:false
      });
    }
  }

  render() {
    let loadDOM = '';
    if(this.state.isShow) {
      loadDOM = (
        <div className="spinner">
          <div className="bounce1"></div>
          <div className="bounce2"></div>
          <div className="bounce3"></div>
        </div>
      );
    };
    return (
      <div className='loading'>
        {loadDOM}
      </div>
    );
  }
}
