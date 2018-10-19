import React from 'react';
import { render } from 'react-dom';
import BaseComponent from 'base-component';
import 'common-scss';
import 'gaia-icons/gaia-icons.css';
import ReactSoftKey from 'react-soft-key';
import Service from 'service';
import SimpleNavigationHelper from 'simple-navigation-helper';
import ReactWindowManager from 'react-window-manager';
import Sideview from './side_view';
import MainView from './main';
import '../scss/app.scss';

class App extends BaseComponent {
  name = 'App';

  constructor(props) {
    super(props);

    SimpleNavigationHelper.onBeforeKeyDown = (evt) => {
      if (Service.query('isTransitioning')) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    };
  }

  componentDidMount() {
    window.appInstance = this; // For debugging purpose
  }

  render() {
    return (
      <div id="app" tabIndex="-1">
        <div className="statusbar-placeholder" />
        <MainView />
        <ReactSoftKey ref="softkey" />
        <Sideview />
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));

window.service = Service;
export default App;
